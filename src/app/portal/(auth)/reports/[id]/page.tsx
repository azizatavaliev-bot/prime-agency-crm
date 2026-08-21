import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reportMetrics, reportMetricValue, getUsdRate } from "@/lib/finance";
import { saveClientFeedback } from "@/lib/actions";
import { som, dateRu, num } from "@/lib/format";
import { OBJECTIVE_METRIC_LABEL } from "@/lib/constants";
import DecimalInput from "@/components/DecimalInput";

export const dynamic = "force-dynamic";

export default async function PortalReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireClient();

  const r = await prisma.adReport.findFirst({
    where: { id, clientId: session.clientId },
    include: { direction: true },
  });
  if (!r) notFound();

  const m = reportMetrics(r);
  const usdRate = await getUsdRate();
  const metricLabel = OBJECTIVE_METRIC_LABEL[r.objective] ?? "Результат";

  return (
    <div>
      <div className="mb-4">
        <Link href="/portal" className="btn-ghost">
          <ArrowLeft size={15} /> Ко всем отчётам
        </Link>
      </div>

      <div className="card p-6">
        <div className="text-xs text-zinc-500">Отчёт по рекламе{r.direction ? ` · ${r.direction.name}` : ""}</div>
        <h1 className="text-xl font-semibold">
          {dateRu(r.periodFrom)} — {dateRu(r.periodTo)}
        </h1>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-zinc-50 p-5">
            <div className="text-xs text-zinc-500">Потрачено на рекламу</div>
            <div className="mt-1 text-2xl font-semibold">{som(r.spent)}</div>
            <div className="mt-0.5 text-xs text-zinc-400">≈ ${num(r.spent / usdRate)}</div>
          </div>
          <div className="rounded-2xl bg-zinc-50 p-5">
            <div className="text-xs text-zinc-500">{metricLabel}</div>
            <div className="mt-1 text-2xl font-semibold">{reportMetricValue(r)}</div>
            {r.views > 0 && <div className="mt-0.5 text-xs text-zinc-400">{r.views} показов</div>}
          </div>
          <div className={`rounded-2xl p-5 ${m.cplOk === false ? "bg-red-50" : "bg-emerald-50"}`}>
            <div className="text-xs text-zinc-500">Цена заявки</div>
            <div className="mt-1 text-2xl font-semibold">{m.cpl ? som(m.cpl) : "—"}</div>
          </div>
        </div>

        {r.comment && <p className="mt-6 text-sm leading-relaxed text-zinc-600">{r.comment}</p>}

        {r.screenshot && (
          <div className="mt-6">
            <div className="mb-2 text-sm font-medium">Скриншот рекламного кабинета</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/portal/reports/${r.id}/screenshot`}
              alt="Скриншот рекламного кабинета"
              className="w-full rounded-2xl border border-zinc-200"
            />
          </div>
        )}

        <div className="mt-8 border-t border-zinc-200 pt-6">
          <div className="mb-3 text-sm font-medium">Ваша обратная связь по периоду</div>
          <form action={saveClientFeedback} className="grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="id" value={r.id} />
            <div>
              <label className="label">Продаж за период</label>
              <input className="input" name="clientSales" type="number" min="0" defaultValue={r.clientSales ?? ""} />
            </div>
            <div>
              <label className="label">Конверсия в продажу, %</label>
              <DecimalInput name="clientConversion" defaultValue={r.clientConversion ?? ""} />
            </div>
            <div>
              <label className="label">Качество лидов (1–5)</label>
              <input
                className="input"
                name="clientLeadQuality"
                type="number"
                min="1"
                max="5"
                defaultValue={r.clientLeadQuality ?? ""}
              />
            </div>
            <div className="sm:col-span-3">
              <button className="btn-primary">Сохранить</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
