import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bridgeAuthorized, UNAUTHORIZED } from "../../auth";

const STATUSES = ["TEST", "ACTIVE", "RISK", "PAUSED", "CHURNED"];

/** Правка настроек клиента агентства из Unity Tasks. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!bridgeAuthorized(req)) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "нет тела запроса" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.niche === "string") data.niche = body.niche.trim() || null;
  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status)) return NextResponse.json({ error: "неизвестный статус" }, { status: 400 });
    data.status = body.status;
  }
  if (body.avgCheck !== undefined) {
    const n = Number(body.avgCheck);
    if (!isFinite(n) || n < 0) return NextResponse.json({ error: "некорректная абонплата" }, { status: 400 });
    data.avgCheck = n;
  }
  if (body.targetCpl !== undefined) {
    const n = Number(body.targetCpl);
    data.targetCpl = body.targetCpl === null || body.targetCpl === "" ? null : isFinite(n) && n >= 0 ? n : undefined;
    if (data.targetCpl === undefined) return NextResponse.json({ error: "некорректный CPL" }, { status: 400 });
  }
  if (typeof body.adAccount === "string") data.adAccount = body.adAccount.trim() || null;
  if (typeof body.goal === "string") data.goal = body.goal.trim() || null;
  if (body.targetologId !== undefined) data.targetologId = body.targetologId || null;
  if (body.accountId !== undefined) data.accountId = body.accountId || null;

  if (!Object.keys(data).length) return NextResponse.json({ error: "нечего менять" }, { status: 400 });

  const exists = await prisma.client.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "клиент не найден" }, { status: 404 });

  const updated = await prisma.client.update({ where: { id }, data, select: { id: true, name: true, status: true } });
  return NextResponse.json({ ok: true, project: updated });
}
