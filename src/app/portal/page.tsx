import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reportMetrics } from "@/lib/finance";
import { som, dateRu, num } from "@/lib/format";
import { PageHeader, Section, Empty } from "@/components/ui";
import { CreditCard, FileBarChart, Layers, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const session = await requireClient();

  const client = await prisma.client.findUnique({
    where: { id: session.clientId },
    include: {
      directions: { where: { active: true }, orderBy: { createdAt: "asc" } },
      reports: { orderBy: { periodTo: "desc" }, take: 20, include: { direction: true } },
    },
  });
  if (!client) return <Empty text="Проект не найден" />;

  return (
    <div>
      <PageHeader title={client.name} subtitle="Ваш проект в Prime Agency" />

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

      <Section title="Отчёты по рекламе" icon={FileBarChart}>
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
                    Потрачено {som(r.spent)} · Заявок {r.leads}
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
