import { redirect } from "next/navigation";
import { FileText, Plus, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, clientScope, marketingScope } from "@/lib/access";
import { getUsdRate } from "@/lib/finance";
import { dicts } from "@/lib/dict";
import { deleteMarketingReport } from "@/lib/actions";
import { som, num, dateRu } from "@/lib/format";
import { cpl } from "@/lib/marketing";
import { Table, Collapse } from "@/components/ui";
import MarketingReportForm from "@/components/MarketingReportForm";

export default async function DailyReportsTab() {
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

  const opts = (l: { key: string; name: string }[]) => l.map((i) => ({ value: i.key, label: i.name }));

  return (
    <div>

      <Collapse title="Заполнить отчёт" icon={Plus}>
        <MarketingReportForm
          channels={opts(MARKETING_CHANNEL)}
          sources={opts(MARKETING_SOURCE)}
          directions={opts(MARKETING_DIRECTION)}
          clients={clients.map((c) => ({ value: c.id, label: c.name }))}
          usdRate={usdRate}
        />
      </Collapse>

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
                    <form action={deleteMarketingReport}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn-ghost !px-2.5 !py-1 !text-xs text-red-600">
                        <Trash2 size={13} />
                      </button>
                    </form>
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
