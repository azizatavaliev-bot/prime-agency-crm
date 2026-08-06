import Link from "next/link";
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { som, num, dateRu } from "@/lib/format";
import { Avatar, Badge } from "@/components/ui";

export type ProjectRow = {
  id: string;
  name: string;
  status: string;
  statusLabel: string;
  statusColor?: string | null;
  targetologName: string | null;
  avgCheck: number;
  paidThisMonth: number;
  debt: number;
  cpl: number | null;
  targetCpl: number | null;
  cplTrend: "up" | "down" | "flat" | null;
  openTasks: number;
  overdueTasks: number;
  lastReportAt: Date | null;
  risks: string[];
};

/**
 * Все проекты одной таблицей: сколько принёс, как идёт реклама, где горит.
 * Раньше это приходилось собирать, обходя карточки клиентов по одной.
 */
export default function ProjectsOverview({ rows }: { rows: ProjectRow[] }) {
  if (rows.length === 0)
    return <div className="card p-6 text-center text-sm text-muted">Проектов пока нет</div>;

  return (
    <div className="card overflow-x-auto scroll-hint">
      <table className="w-full min-w-[900px]">
        <thead className="border-b border-zinc-200 bg-subtle">
          <tr>
            {["Проект", "Таргетолог", "Оплачено", "Долг", "CPL", "Задачи", "Отчёт", "Внимание"].map(
              (h) => (
                <th key={h} className="th">
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r) => {
            const cplBad = r.cpl !== null && r.targetCpl !== null && r.cpl > r.targetCpl;
            const TrendIcon =
              r.cplTrend === "up" ? TrendingUp : r.cplTrend === "down" ? TrendingDown : Minus;
            return (
              <tr key={r.id} className={r.risks.length ? "bg-amber-50/40" : ""}>
                <td className="td">
                  <Link href={`/clients/${r.id}`} className="flex items-center gap-2 hover:underline">
                    <Avatar name={r.name} size={28} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{r.name}</span>
                      <span className="block text-[11px] text-muted">{som(r.avgCheck)} / мес</span>
                    </span>
                  </Link>
                </td>
                <td className="td text-muted">{r.targetologName ?? "не назначен"}</td>
                <td className="td font-medium">{som(r.paidThisMonth)}</td>
                <td className={`td ${r.debt ? "text-red-600 font-medium" : "text-muted"}`}>
                  {r.debt ? som(r.debt) : "—"}
                </td>
                <td className="td">
                  {r.cpl === null ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <span
                      className={`flex items-center gap-1 font-medium ${
                        cplBad ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {/* Для цены заявки рост — это плохо, поэтому стрелка вверх красная */}
                      <TrendIcon size={13} />
                      {num(r.cpl)}
                      {r.targetCpl ? (
                        <span className="text-[11px] font-normal text-muted">
                          / {num(r.targetCpl)}
                        </span>
                      ) : null}
                    </span>
                  )}
                </td>
                <td className="td">
                  {r.openTasks}
                  {r.overdueTasks > 0 && (
                    <span className="ml-1 text-[11px] text-red-600">({r.overdueTasks} просроч.)</span>
                  )}
                </td>
                <td className="td text-muted">{r.lastReportAt ? dateRu(r.lastReportAt) : "нет"}</td>
                <td className="td">
                  {r.risks.length === 0 ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">ок</Badge>
                  ) : (
                    <span className="flex flex-wrap items-center gap-1">
                      <AlertTriangle size={13} className="text-amber-600" />
                      {r.risks.map((x) => (
                        <span
                          key={x}
                          className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800"
                        >
                          {x}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
