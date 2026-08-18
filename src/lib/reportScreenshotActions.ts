"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { requireUser } from "./auth";
import { can, clientScope } from "./access";
import { getUsdRate, reportMetrics } from "./finance";
import { notify, owners } from "./actions";
import { notifyClient, notifyUser } from "./telegram";
import { extractReportsFromScreenshots } from "./ai";

export type AutoFillState = {
  ok: boolean;
  error?: string;
  count?: number;
  newDirections?: number;
};

/**
 * Скриншот(ы) рекламного кабинета → готовые отчёты за нужные дни/направления,
 * без экрана подтверждения — создаёт сразу, править потом через обычную
 * карточку отчёта (кнопка редактирования там уже есть).
 */
export async function autoFillReportsFromScreenshots(_prev: AutoFillState, fd: FormData): Promise<AutoFillState> {
  const user = await requireUser();
  if (!can.writeReports(user)) redirect("/no-access");

  const clientId = String(fd.get("clientId") ?? "");
  const client = await prisma.client.findFirst({ where: { AND: [{ id: clientId }, clientScope(user)] } });
  if (!client) redirect("/no-access");

  const files = fd.getAll("screenshots").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { ok: false, error: "Вставьте хотя бы один скриншот" };

  const images = await Promise.all(
    files.map(async (f) => ({
      mimeType: f.type || "image/png",
      base64: Buffer.from(await f.arrayBuffer()).toString("base64"),
      bytes: Buffer.from(await f.arrayBuffer()),
    }))
  );

  const directions = await prisma.direction.findMany({ where: { clientId, active: true } });

  let entries;
  try {
    entries = await extractReportsFromScreenshots(
      images.map((i) => ({ mimeType: i.mimeType, base64: i.base64 })),
      { directions: directions.map((d) => ({ id: d.id, name: d.name })) }
    );
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Не удалось разобрать скриншоты" };
  }

  if (!entries.length) return { ok: true, count: 0, newDirections: 0 };

  const usdRate = await getUsdRate();
  const dirCache = new Map(directions.map((d) => [d.name.trim().toLowerCase(), d.id]));
  let newDirections = 0;
  let alertCount = 0;

  for (const e of entries) {
    let directionId: string | null = null;
    if (e.directionName) {
      const key = e.directionName.trim().toLowerCase();
      const existing = dirCache.get(key);
      if (existing) {
        directionId = existing;
      } else {
        const dir = await prisma.direction.create({
          data: { clientId, name: e.directionName.trim(), createdById: user.id },
        });
        dirCache.set(key, dir.id);
        directionId = dir.id;
        newDirections++;
      }
    }

    const spent = e.currency === "USD" ? e.spend * usdRate : e.spend;
    const data = {
      clientId,
      authorId: user.id,
      directionId,
      periodFrom: new Date(e.date),
      periodTo: new Date(e.date),
      objective: e.objective,
      budget: 0,
      spent,
      leads: e.objective === "LEADS" ? Math.round(e.metric) : 0,
      actions: 0,
      engagement: e.objective === "ENGAGEMENT" ? Math.round(e.metric) : 0,
      traffic: e.objective === "TRAFFIC" ? Math.round(e.metric) : 0,
      profileVisits: e.objective === "PROFILE_VISITS" ? Math.round(e.metric) : 0,
      views: Math.round(e.impressions ?? 0),
      targetCpl: client.targetCpl ?? 999999,
      targetCpa: null as number | null,
      bundles: null as string | null,
      comment: "Автозаполнено по скриншоту (ИИ)",
    };

    const image = images[e.sourceImageIndex] ?? images[0];
    const created = await prisma.adReport.create({
      data: { ...data, screenshot: image.bytes, screenshotMime: image.mimeType },
    });

    const m = reportMetrics(data);
    if (m.inTarget === false) {
      alertCount++;
      await notify([...(await owners()), client.targetologId, client.accountId], {
        kind: "CPL_ALERT",
        title: `Превышен порог CPL — ${client.name}`,
        body: `CPL ${Math.round(m.cpl ?? 0)} сом при цели ${Math.round(data.targetCpl)} сом (отчёт по скриншоту, ${e.date})`,
        link: `/clients/${clientId}`,
      });
    }
    void created;
  }

  // Одно общее уведомление вместо спама по каждому дню/направлению отдельно.
  const summary = `ИИ разобрал скриншот${images.length > 1 ? "ы" : ""} и создал ${entries.length} отч${entries.length === 1 ? "ёт" : "ёта(ов)"} — ${client.name}${newDirections ? `, новых направлений: ${newDirections}` : ""}${alertCount ? `, превышен CPL в ${alertCount}` : ""}`;
  for (const uid of [...new Set([...(await owners()), client.targetologId, client.accountId].filter(Boolean) as string[])]) {
    await notifyUser(uid, { kind: "REPORT_READY", title: "Отчёты заполнены по скриншоту", body: summary, link: `/clients/${clientId}` });
  }
  await notifyClient(clientId, { kind: "REPORT_READY", title: "Новые отчёты по рекламе", body: summary, link: "/portal/reports" });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/reports");
  return { ok: true, count: entries.length, newDirections };
}
