import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reportMetrics, reportMetricValue } from "@/lib/finance";
import { som, dateRu, num } from "@/lib/format";
import { OBJECTIVE_METRIC_LABEL } from "@/lib/constants";
import { PageHeader, Section, Empty } from "@/components/ui";
import { FileBarChart, ExternalLink, ArrowLeft, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function PortalReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireClient();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [total, reports] = await Promise.all([
    prisma.adReport.count({ where: { clientId: session.clientId } }),
    prisma.adReport.findMany({
      where: { clientId: session.clientId },
      orderBy: { periodTo: "desc" },
      include: { direction: true },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title="Все отчёты" subtitle={`Всего отчётов: ${total}`} />

      <Section title="Отчёты по рекламе" icon={FileBarChart}>
        <div className="space-y-2">
          {reports.map((r) => {
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
          {reports.length === 0 && <Empty text="Отчётов пока нет" />}
        </div>

        {pages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <Link
              href={`/portal/reports?page=${page - 1}`}
              className={`btn-ghost !text-xs ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              <ArrowLeft size={14} /> Назад
            </Link>
            <span className="text-xs text-zinc-500">
              Страница {page} из {pages}
            </span>
            <Link
              href={`/portal/reports?page=${page + 1}`}
              className={`btn-ghost !text-xs ${page >= pages ? "pointer-events-none opacity-40" : ""}`}
            >
              Вперёд <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </Section>
    </div>
  );
}
