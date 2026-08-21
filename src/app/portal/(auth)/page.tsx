import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reportMetrics, reportMetricValue } from "@/lib/finance";
import { som, dateRu, num } from "@/lib/format";
import { OBJECTIVE_METRIC_LABEL } from "@/lib/constants";
import { PageHeader, Section, Empty, Stat } from "@/components/ui";
import { CreditCard, FileBarChart, Layers, ExternalLink, Wallet, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const session = await requireClient();

  const [client, spendAgg, reportsCount] = await Promise.all([
    prisma.client.findUnique({
      where: { id: session.clientId },
      include: {
        directions: { where: { active: true }, orderBy: { createdAt: "asc" } },
        reports: { orderBy: { periodTo: "desc" }, take: 6, include: { direction: true } },
      },
    }),
    prisma.adReport.aggregate({
      where: { clientId: session.clientId },
      _sum: { spent: true, leads: true, engagement: true, traffic: true, profileVisits: true },
    }),
    prisma.adReport.count({ where: { clientId: session.clientId } }),
  ]);
  if (!client) return <Empty text="Проект не найден" />;

  const totalSpent = spendAgg._sum.spent ?? 0;
  // Складываем результат по всем целям кампаний вместе — заявки, вовлечённость
  // и трафик считаются разными полями, но клиенту нужна одна общая цифра.
  const totalResult =
    (spendAgg._sum.leads ?? 0) +
    (spendAgg._sum.engagement ?? 0) +
    (spendAgg._sum.traffic ?? 0) +
    (spendAgg._sum.profileVisits ?? 0);

  return (
    <div>
      <PageHeader title={client.name} subtitle="Ваш проект в Prime Agency" />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Stat label="Потрачено на рекламу всего" value={som(totalSpent)} icon={Wallet} />
        <Stat label="Результат получено всего" value={String(totalResult)} icon={TrendingUp} />
        <Stat label="Отчётов" value={String(reportsCount)} icon={FileBarChart} />
      </div>

      {client.directions.length > 0 && (
        <Section title="Направления" icon={Layers}>
          <div className="flex flex-wrap gap-2">
            {client.directions.map((d) => (
              <span key={d.id} className="badge bg-sky-100 text-sky-700 border-sky-200">
                {d.name}
              </span>
            ))}
          </div>
        </Section>
      )}

      {(client.cardLast4 || client.cardHolder) && (
        <Section title="Реквизиты для пополнения рекламы" icon={CreditCard}>
          <div className="card p-4 text-sm">
            <div className="text-zinc-500">Карта агентства для этого проекта</div>
            <div className="mt-1 font-medium">
              •• {client.cardLast4 ?? "—"}
              {client.cardHolder ? ` — ${client.cardHolder}` : ""}
            </div>
          </div>
        </Section>
      )}

      <Section
        title="Отчёты по рекламе"
        icon={FileBarChart}
        right={
          reportsCount > client.reports.length ? (
            <Link href="/portal/reports" className="btn-ghost !py-1.5 !text-xs">
              Все отчёты <ExternalLink size={13} />
            </Link>
          ) : undefined
        }
      >
        <div className="space-y-2">
          {client.reports.map((r) => {
            const m = reportMetrics(r);
            return (
              <Link
                key={r.id}
                href={`/portal/reports/${r.id}`}
                className="card flex items-center justify-between gap-3 p-4 transition hover:bg-subtle"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {dateRu(r.periodFrom)} — {dateRu(r.periodTo)}
                    {r.direction && (
                      <span className="ml-2 badge bg-zinc-100 text-zinc-600 border-zinc-200">{r.direction.name}</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Потрачено {som(r.spent)} · {OBJECTIVE_METRIC_LABEL[r.objective] ?? "Результат"} {reportMetricValue(r)}
                    {m.cpl ? ` · CPL ${num(m.cpl)} сом` : ""}
                  </div>
                </div>
                <ExternalLink size={15} className="shrink-0 text-zinc-400" />
              </Link>
            );
          })}
          {client.reports.length === 0 && <Empty text="Отчётов пока нет" />}
        </div>
      </Section>
    </div>
  );
}
