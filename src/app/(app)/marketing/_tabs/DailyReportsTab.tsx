import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Plus, Trash2, Pencil } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, clientScope, marketingScope } from "@/lib/access";
import { getUsdRate } from "@/lib/finance";
import { dicts } from "@/lib/dict";
import { deleteMarketingReport } from "@/lib/actions";
import { som, num, dateRu } from "@/lib/format";
import { cpl } from "@/lib/marketing";
import { Table, Collapse, Section } from "@/components/ui";
import MarketingReportForm from "@/components/MarketingReportForm";

export default async function DailyReportsTab({
  sp = {},
}: {
  /** date — предзаполнить день из календаря, edit — открыть отчёт на правку. */
  sp?: { date?: string; edit?: string };
}) {
  const user = await requireUser();
  if (!can.writeReports(user)) redirect("/no-access");

  const [{ MARKETING_CHANNEL, MARKETING_SOURCE, MARKETING_DIRECTION }, clients, reports, usdRate] =
    await Promise.all([
      dicts(["MARKETING_CHANNEL", "MARKETING_SOURCE", "MARKETING_DIRECTION"]),
      prisma.client.findMany({
        where: clientScope(user),
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.marketingReport.findMany({
        where: marketingScope(user),
        orderBy: { date: "desc" },
        take: 60,
        include: { client: { select: { name: true } }, author: { select: { name: true } } },
      }),
      getUsdRate(),
    ]);

  // Правим только тот отчёт, который виден пользователю: иначе подстановкой id
  // редактировался бы чужой.
  const editing = sp.edit
    ? await prisma.marketingReport.findFirst({
        where: { AND: [{ id: sp.edit }, marketingScope(user)] },
      })
    : null;

  const opts = (l: { key: string; name: string }[]) => l.map((i) => ({ value: i.key, label: i.name }));

  return (
    <div>

      <Section
        title={editing ? "Правка отчёта" : "Новый отчёт"}
        icon={FileText}
        right={
          editing ? (
            <Link href="/marketing?tab=daily" className="btn-ghost !px-3 !py-1.5 !text-xs">
              Отменить правку
            </Link>
          ) : undefined
        }
      >

        <MarketingReportForm
          channels={opts(MARKETING_CHANNEL)}
          sources={opts(MARKETING_SOURCE)}
          directions={opts(MARKETING_DIRECTION)}
          clients={clients.map((c) => ({ value: c.id, label: c.name }))}
          usdRate={usdRate}
          defaults={
            editing
              ? {
                  id: editing.id,
                  date: editing.date.toISOString().slice(0, 10),
                  channel: editing.channel,
                  source: editing.source ?? undefined,
                  direction: editing.direction ?? undefined,
                  clientId: editing.clientId ?? undefined,
                  spend: editing.currency === "USD" && editing.usdRate
                    ? Math.round((editing.spend / editing.usdRate) * 100) / 100
                    : editing.spend,
                  currency: editing.currency,
                  leads: editing.leads,
                  impressions: editing.impressions,
                  inquiries: editing.inquiries,
                  notes: editing.notes ?? undefined,
                }
              : sp.date
                ? { date: sp.date }
                : undefined
          }
        />
      </Section>

      <div className="mt-6">
        <Collapse title={`Сводка за период (${reports.length})`} icon={FileText}>
          <Table head={["Дата", "Канал", "Источник", "Расход", "Лиды", "CPL", "Клиент", "Автор", ""]}>
            {reports.map((r) => {
              const c = cpl(r.spend, r.leads);
              return (
                <tr key={r.id}>
                  <td className="td">{dateRu(r.date)}</td>
                  <td className="td">{MARKETING_CHANNEL.find((i) => i.key === r.channel)?.name ?? r.channel}</td>
                  <td className="td text-zinc-500">
                    {MARKETING_SOURCE.find((i) => i.key === r.source)?.name ?? r.source ?? "—"}
                  </td>
                  <td className="td font-medium">{som(r.spend)}</td>
                  <td className="td">{r.leads}</td>
                  <td className="td">{c ? `${num(c)} сом` : "—"}</td>
                  <td className="td text-zinc-500">{r.client?.name ?? "—"}</td>
                  <td className="td text-zinc-500">{r.author?.name ?? "—"}</td>
                  <td className="td">
                    <div className="flex items-center gap-1.5">
                    <Link
                      href={`/marketing?tab=daily&edit=${r.id}`}
                      className="btn-ghost !px-2.5 !py-1 !text-xs"
                      title="Изменить отчёт"
                    >
                      <Pencil size={13} />
                    </Link>
                    <form action={deleteMarketingReport}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn-ghost !px-2.5 !py-1 !text-xs text-red-600">
                        <Trash2 size={13} />
                      </button>
                    </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {reports.length === 0 && (
              <tr>
                <td className="td text-zinc-500" colSpan={9}>
                  Отчётов пока нет
                </td>
              </tr>
            )}
          </Table>
        </Collapse>
      </div>
    </div>
  );
}
