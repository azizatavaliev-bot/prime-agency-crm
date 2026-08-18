import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientScope } from "@/lib/access";
import { reportMetrics } from "@/lib/finance";
import { som, dateRu, num, targetCplLabel } from "@/lib/format";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

/** Отчёт в виде, понятном клиенту: заявки и деньги, без CTR и рекламной кухни. */
export default async function ClientReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const r = await prisma.adReport.findFirst({
    where: { AND: [{ id }, { client: clientScope(user) }] },
    include: { client: true },
  });
  if (!r) notFound();

  const prev = await prisma.adReport.findFirst({
    where: { clientId: r.clientId, periodTo: { lt: r.periodTo } },
    orderBy: { periodTo: "desc" },
  });

  const m = reportMetrics(r);
  const pm = prev ? reportMetrics(prev) : null;
  const delta = m.cpl && pm?.cpl ? Math.round(((m.cpl - pm.cpl) / pm.cpl) * 100) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/clients/${r.clientId}`} className="btn-ghost">
          ← Назад
        </Link>
        <PrintButton />
      </div>

      <div className="card p-6 lg:p-10">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-zinc-500">Отчёт по рекламе</div>
            <h1 className="text-2xl font-semibold">{r.client.name}</h1>
            <div className="mt-1 text-sm text-zinc-500">
              Период: {dateRu(r.periodFrom)} — {dateRu(r.periodTo)}
            </div>
          </div>
          <div className="text-right text-sm text-zinc-400">⚡️ Prime Agency</div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-zinc-50 p-5">
            <div className="text-xs text-zinc-500">Потрачено на рекламу</div>
            <div className="mt-1 text-2xl font-semibold">{som(r.spent)}</div>
          </div>
          <div className="rounded-2xl bg-zinc-50 p-5">
            <div className="text-xs text-zinc-500">Получено заявок</div>
            <div className="mt-1 text-2xl font-semibold">{r.leads}</div>
          </div>
          <div className={`rounded-2xl p-5 ${m.cplOk === false ? "bg-red-50" : "bg-emerald-50"}`}>
            <div className="text-xs text-zinc-500">Цена заявки</div>
            <div className="mt-1 text-2xl font-semibold">{m.cpl ? som(m.cpl) : "—"}</div>
            {delta !== null && (
              <div className={`mt-1 text-xs ${delta <= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {delta <= 0 ? "▼" : "▲"} {Math.abs(delta)}% к прошлому периоду
              </div>
            )}
          </div>
        </div>

        {r.actions > 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-zinc-50 p-5">
              <div className="text-xs text-zinc-500">Целевых действий (продажи/записи)</div>
              <div className="mt-1 text-2xl font-semibold">{r.actions}</div>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-5">
              <div className="text-xs text-zinc-500">Стоимость целевого действия</div>
              <div className="mt-1 text-2xl font-semibold">{m.cpa ? som(m.cpa) : "—"}</div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <div className="text-sm font-medium">Итог периода</div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            {(() => {
              const target = targetCplLabel(r.targetCpl);
              if (m.inTarget === false)
                return `Цена заявки ${num(m.cpl ?? 0)} сом выше плановой ${target}. Слабые связки отключаем, запускаем новые гипотезы и обновляем креативы.`;
              if (m.inTarget)
                return target === "—"
                  ? `Цена заявки ${num(m.cpl ?? 0)} сом — плановый порог по проекту пока не задан.`
                  : `Цена заявки ${num(m.cpl ?? 0)} сом укладывается в план ${target}. Рабочие связки масштабируем и увеличиваем бюджет.`;
              return "За период заявок не зафиксировано — идёт тест гипотез.";
            })()}
          </p>
          {r.comment && <p className="mt-3 text-sm leading-relaxed text-zinc-600">{r.comment}</p>}
        </div>

        <div className="mt-8 border-t border-zinc-200 pt-4 text-xs text-zinc-400">
          Отчёт сформирован автоматически · {dateRu(new Date())}
        </div>
      </div>
    </div>
  );
}
