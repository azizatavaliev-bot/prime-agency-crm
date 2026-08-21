"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Filter,
} from "lucide-react";
import { som, num } from "@/lib/format";
import ModalShell from "./ModalShell";

export type CalendarReport = {
  id: string;
  date: string; // YYYY-MM-DD
  channel: string;
  channelLabel: string;
  source: string | null;
  sourceLabel: string | null;
  direction: string | null;
  directionLabel: string | null;
  spend: number;
  leads: number;
  impressions: number;
  clicks: number;
  inquiries: number;
  notes: string | null;
  authorName: string | null;
  clientName: string | null;
};

type Bucket = {
  spend: number;
  leads: number;
  impressions: number;
  clicks: number;
  inquiries: number;
  reports: CalendarReport[];
};

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Понедельник недели, в которую попадает дата. */
function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function dayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Календарь отчётов — как в Unity: месяц или неделя, тепловая карта по CPL,
 * клик по любому дню открывает разбор с отчётами и кнопкой «добавить».
 *
 * Дни без отчёта в прошлом заштрихованы: пропуск виден сразу, а не после
 * сверки таблицы построчно.
 */
export default function MarketingCalendar({
  year,
  month,
  reports,
  today,
  prevMonthByDate,
  sources,
  directions,
}: {
  year: number;
  month: number; // 1–12
  reports: CalendarReport[];
  today: string;
  /** Итоги того же дня прошлого месяца — для сравнения в модалке. */
  prevMonthByDate: Record<string, { spend: number; leads: number }>;
  sources: { value: string; label: string }[];
  directions: { value: string; label: string }[];
}) {
  const [mode, setMode] = useState<"month" | "week">("month");
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const [y, m, d] = today.split("-").map(Number);
    const inMonth = y === year && m === month;
    return mondayOf(inMonth ? new Date(y, m - 1, d) : new Date(year, month - 1, 1));
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [direction, setDirection] = useState("");
  const [statsOpen, setStatsOpen] = useState(false);

  const filtered = useMemo(
    () =>
      reports.filter(
        (r) => (!source || r.source === source) && (!direction || r.direction === direction)
      ),
    [reports, source, direction]
  );

  const byDate = useMemo(() => {
    const map = new Map<string, Bucket>();
    for (const r of filtered) {
      const cur = map.get(r.date) ?? {
        spend: 0, leads: 0, impressions: 0, clicks: 0, inquiries: 0, reports: [],
      };
      cur.spend += r.spend;
      cur.leads += r.leads;
      cur.impressions += r.impressions;
      cur.clicks += r.clicks;
      cur.inquiries += r.inquiries;
      cur.reports.push(r);
      map.set(r.date, cur);
    }
    return map;
  }, [filtered]);

  // Дни показываемого периода
  const cells: (string | null)[] = useMemo(() => {
    if (mode === "week") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return iso(d);
      });
    }
    const daysInMonth = new Date(year, month, 0).getDate();
    const lead = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const out: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= daysInMonth; d++)
      out.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    return out;
  }, [mode, weekStart, year, month]);

  const visibleDays = cells.filter(Boolean) as string[];

  // Итоги считаем по видимому периоду, а не по всему загруженному окну
  const totals = useMemo(() => {
    let spend = 0, leads = 0, impressions = 0, clicks = 0, inquiries = 0, filledDays = 0;
    for (const d of visibleDays) {
      const b = byDate.get(d);
      if (!b) continue;
      filledDays++;
      spend += b.spend;
      leads += b.leads;
      impressions += b.impressions;
      clicks += b.clicks;
      inquiries += b.inquiries;
    }
    // Знаменатель — только наступившие дни: в середине месяца «4 из 31»
    // читалось как провал, хотя заполнено всё, что можно.
    const elapsed = visibleDays.filter((d) => d <= today).length;
    return {
      spend, leads, impressions, clicks, inquiries, filledDays,
      cpl: leads > 0 ? spend / leads : null,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
      totalDays: elapsed || visibleDays.length,
    };
  }, [visibleDays, byDate, today]);

  const avgCpl = totals.cpl ?? 0;

  // Лучший день — самый дешёвый лид при значимом объёме
  const bestDay = useMemo(() => {
    let best: { date: string; cpl: number } | null = null;
    for (const d of visibleDays) {
      const b = byDate.get(d);
      if (!b || b.leads < 2) continue;
      const c = b.spend / b.leads;
      if (!best || c < best.cpl) best = { date: d, cpl: c };
    }
    return best;
  }, [visibleDays, byDate]);

  const missed = visibleDays.filter((d) => d < today && !byDate.get(d)).length;

  const shiftWeek = (delta: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d);
  };

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);

  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  const selected = selectedDay ? byDate.get(selectedDay) : null;
  const selectedPrev = selectedDay ? prevMonthByDate[selectedDay.slice(8)] : undefined;

  const periodTitle =
    mode === "month"
      ? `${MONTHS[month - 1]} ${year}`
      : `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].toLowerCase().slice(0, 3)} — ${weekEnd.getDate()} ${MONTHS[weekEnd.getMonth()].toLowerCase().slice(0, 3)}`;

  return (
    <div>
      {/* Управление периодом */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="stat-icon !h-7 !w-7 accent-soft accent-text">
            <CalendarDays size={14} strokeWidth={2} />
          </span>
          <span className="text-sm font-semibold">{periodTitle}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex rounded-xl bg-subtle p-0.5">
            {(["month", "week"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg px-3 py-1.5 text-xs transition ${
                  mode === m ? "bg-white font-medium shadow-sm" : "text-muted"
                }`}
              >
                {m === "month" ? "Месяц" : "Неделя"}
              </button>
            ))}
          </div>

          {mode === "month" ? (
            <>
              <Link
                href={`/marketing?tab=calendar&y=${prev.y}&m=${prev.m}`}
                className="btn-ghost !px-2.5 !py-1.5"
                aria-label="Предыдущий месяц"
              >
                <ChevronLeft size={14} />
              </Link>
              <Link href="/marketing?tab=calendar" className="btn-ghost !px-3 !py-1.5 !text-xs">
                Сегодня
              </Link>
              <Link
                href={`/marketing?tab=calendar&y=${next.y}&m=${next.m}`}
                className="btn-ghost !px-2.5 !py-1.5"
                aria-label="Следующий месяц"
              >
                <ChevronRight size={14} />
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => shiftWeek(-1)}
                className="btn-ghost !px-2.5 !py-1.5"
                aria-label="Предыдущая неделя"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const [y, m, d] = today.split("-").map(Number);
                  setWeekStart(mondayOf(new Date(y, m - 1, d)));
                }}
                className="btn-ghost !px-3 !py-1.5 !text-xs"
              >
                Эта неделя
              </button>
              <button
                type="button"
                onClick={() => shiftWeek(1)}
                className="btn-ghost !px-2.5 !py-1.5"
                aria-label="Следующая неделя"
              >
                <ChevronRight size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Фильтры: источник и направление */}
      {(sources.length > 0 || directions.length > 0) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Filter size={13} className="text-muted" />
          {sources.length > 0 && (
            <select
              className="input !w-auto !px-2.5 !py-1.5 !text-xs"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="">Все источники</option>
              {sources.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
          {directions.length > 0 && (
            <select
              className="input !w-auto !px-2.5 !py-1.5 !text-xs"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            >
              <option value="">Все направления</option>
              {directions.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          )}
          {(source || direction) && (
            <button
              type="button"
              onClick={() => {
                setSource("");
                setDirection("");
              }}
              className="btn-ghost !px-2.5 !py-1.5 !text-xs"
            >
              Сбросить
            </button>
          )}
        </div>
      )}

      {/* Итоги периода: главное всегда, остальное по клику */}
      <div className="mb-3 grid gap-2 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-subtle p-3">
          <div className="text-[11px] text-muted">Расход</div>
          <div className="mt-0.5 text-lg font-semibold tracking-tight">{som(totals.spend)}</div>
        </div>
        <div className="rounded-2xl bg-subtle p-3">
          <div className="text-[11px] text-muted">Заявки</div>
          <div className="mt-0.5 text-lg font-semibold tracking-tight">{num(totals.leads)}</div>
        </div>
        <div className="rounded-2xl bg-subtle p-3">
          <div className="text-[11px] text-muted">CPL средний</div>
          <div className="mt-0.5 text-lg font-semibold tracking-tight">
            {totals.cpl ? som(totals.cpl) : "—"}
          </div>
        </div>
        <div className={`rounded-2xl p-3 ${missed > 0 ? "bg-amber-50" : "bg-subtle"}`}>
          <div className="text-[11px] text-muted">Заполнено дней</div>
          <div className="mt-0.5 text-lg font-semibold tracking-tight">
            {totals.filledDays} / {totals.totalDays}
          </div>
          {missed > 0 && <div className="text-[11px] text-amber-700">пропущено {missed}</div>}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setStatsOpen((v) => !v)}
        className="mb-3 flex items-center gap-1 text-xs text-muted hover:text-zinc-900"
      >
        <ChevronDown
          size={13}
          className={`transition-transform ${statsOpen ? "rotate-180" : ""}`}
        />
        {statsOpen ? "Свернуть показатели" : "Ещё показатели"}
      </button>
      {statsOpen && (
        <div className="mb-3 grid gap-2 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-subtle p-3">
            <div className="text-[11px] text-muted">Показы</div>
            <div className="mt-0.5 text-base font-semibold">{num(totals.impressions)}</div>
          </div>
          <div className="rounded-2xl bg-subtle p-3">
            <div className="text-[11px] text-muted">Клики</div>
            <div className="mt-0.5 text-base font-semibold">
              {num(totals.clicks)}
              {totals.ctr !== null && (
                <span className="ml-1 text-[11px] font-normal text-muted">CTR {totals.ctr.toFixed(1)}%</span>
              )}
            </div>
          </div>
          <div className="rounded-2xl bg-subtle p-3">
            <div className="text-[11px] text-muted">Обращения</div>
            <div className="mt-0.5 text-base font-semibold">{num(totals.inquiries)}</div>
          </div>
          <div className="rounded-2xl bg-subtle p-3">
            <div className="text-[11px] text-muted">Отчётов внесено</div>
            <div className="mt-0.5 text-base font-semibold">
              {visibleDays.reduce((s, d) => s + (byDate.get(d)?.reports.length ?? 0), 0)}
            </div>
          </div>
          <div className="rounded-2xl bg-subtle p-3">
            <div className="text-[11px] text-muted">Лучший день</div>
            <div className="mt-0.5 text-base font-semibold">
              {bestDay ? `${bestDay.date.slice(8)} · ${som(bestDay.cpl)}` : "—"}
            </div>
          </div>
        </div>
      )}

      {/* Сетка */}
      <div className="mb-1 grid grid-cols-7 gap-1.5 text-center text-[11px] text-muted">
        {DAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} />;
          const b = byDate.get(date);
          const dayNum = Number(date.slice(8));
          const isToday = date === today;
          const isPast = date < today;
          const dayCpl = b && b.leads > 0 ? b.spend / b.leads : null;
          const noReportPast = !b && isPast;

          // Тепловая карта: дешевле среднего — зелёным, дороже — красным.
          let tone = "bg-subtle text-muted";
          if (dayCpl !== null && avgCpl > 0) {
            const ratio = dayCpl / avgCpl;
            tone =
              ratio <= 0.85
                ? "bg-emerald-100 text-emerald-900"
                : ratio >= 1.15
                  ? "bg-red-100 text-red-900"
                  : "bg-amber-100 text-amber-900";
          } else if (b) {
            tone = "bg-zinc-100 text-zinc-900";
          }

          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelectedDay(date)}
              className={`relative rounded-xl p-2 text-left text-xs transition hover:brightness-95 min-h-[54px] sm:min-h-[78px] ${tone} ${
                isToday
                  ? "ring-2 ring-[var(--accent)]"
                  : noReportPast
                    ? "border-2 border-dashed border-zinc-300"
                    : "border-2 border-transparent"
              }`}
              title={
                b
                  ? `${dayLabel(date)} · ${b.reports.length} отчёт(ов)`
                  : `${dayLabel(date)} · отчёта нет`
              }
            >
              {bestDay?.date === date && <span className="absolute right-1 top-1 text-[11px]">🏆</span>}
              <div className="font-semibold">{dayNum}</div>

              {/* На телефоне цифры не влезают — показываем точку, детали по тапу */}
              {b && (
                <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-emerald-500 sm:hidden" />
              )}
              {noReportPast && (
                <span className="mt-1 block text-[10px] font-semibold opacity-70 sm:hidden">✕</span>
              )}

              {b && (
                <div className="mt-1 hidden sm:block">
                  <div className="font-semibold leading-tight">{Math.round(b.spend).toLocaleString("ru-RU")}</div>
                  <div className="text-[10px] opacity-80">
                    {b.leads} лид.
                    {dayCpl !== null && ` · CPL ${Math.round(dayCpl)}`}
                  </div>
                  {b.reports.length > 1 && (
                    <div className="text-[10px] opacity-60">{b.reports.length} отчёта</div>
                  )}
                </div>
              )}
              {noReportPast && (
                <div className="mt-2 hidden text-[10px] font-medium opacity-70 sm:block">
                  ✕ нет отчёта
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded bg-emerald-100" /> дешевле среднего
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded bg-amber-100" /> около среднего
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded bg-red-100" /> дороже среднего
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded border border-dashed border-zinc-400" /> отчёт не
          заполнен
        </span>
      </div>

      {/* Разбор дня */}
      <ModalShell
        open={Boolean(selectedDay)}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? dayLabel(selectedDay) : ""}
        icon={<CalendarDays size={16} />}
        width="max-w-md"
        z={70}
      >
            {selected ? (
              <>
                <div className="mb-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-subtle p-2.5 text-center">
                    <div className="text-sm font-semibold">{Math.round(selected.spend).toLocaleString("ru-RU")}</div>
                    <div className="text-[10px] text-muted">сом расход</div>
                  </div>
                  <div className="rounded-xl bg-subtle p-2.5 text-center">
                    <div className="text-sm font-semibold">{selected.leads}</div>
                    <div className="text-[10px] text-muted">заявок</div>
                  </div>
                  <div className="rounded-xl bg-subtle p-2.5 text-center">
                    <div className="text-sm font-semibold">
                      {selected.leads > 0 ? Math.round(selected.spend / selected.leads) : "—"}
                    </div>
                    <div className="text-[10px] text-muted">CPL</div>
                  </div>
                </div>

                {/* Сравнение с тем же днём прошлого месяца */}
                {selectedPrev && (selectedPrev.spend > 0 || selectedPrev.leads > 0) && (
                  <div className="mb-3 rounded-xl border border-zinc-200 p-2.5 text-xs">
                    <div className="mb-1 text-muted">Тот же день месяцем раньше</div>
                    <div className="flex items-center justify-between">
                      <span>{som(selectedPrev.spend)} · {selectedPrev.leads} заявок</span>
                      {(() => {
                        const was = selectedPrev.leads > 0 ? selectedPrev.spend / selectedPrev.leads : null;
                        const now = selected.leads > 0 ? selected.spend / selected.leads : null;
                        if (was === null || now === null) return null;
                        const diff = Math.round(now - was);
                        return (
                          <span
                            className={
                              diff < 0 ? "font-semibold text-emerald-600" : diff > 0 ? "font-semibold text-red-600" : "text-muted"
                            }
                          >
                            CPL {diff > 0 ? "+" : ""}{diff}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <div className="mb-3 space-y-1.5">
                  {selected.reports.map((r) => (
                    <div key={r.id} className="rounded-xl bg-subtle p-2.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {r.channelLabel}
                          {r.sourceLabel ? ` · ${r.sourceLabel}` : ""}
                        </span>
                        <span className="flex items-center gap-2 text-muted">
                          {som(r.spend)} · {r.leads} лид.
                          {r.leads > 0 && ` · CPL ${Math.round(r.spend / r.leads)}`}
                          <Link
                            href={`/marketing?tab=daily&edit=${r.id}`}
                            className="rounded p-0.5 hover:text-zinc-900"
                            title="Изменить отчёт"
                          >
                            <Pencil size={12} />
                          </Link>
                        </span>
                      </div>
                      {(r.clientName || r.authorName || r.notes) && (
                        <div className="mt-1 text-[11px] text-muted">
                          {[r.clientName, r.authorName && `внёс ${r.authorName}`, r.notes]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mb-3 rounded-2xl bg-subtle p-5 text-center text-sm text-muted">
                {(selectedDay ?? "") > today
                  ? "День ещё не наступил"
                  : "Отчёта за этот день нет — заполните, пока помните цифры"}
              </div>
            )}

            <Link
              href={`/marketing?tab=daily&date=${selectedDay}`}
              className="btn-primary w-full justify-center"
            >
              <Plus size={15} /> {selected ? "Добавить ещё отчёт" : "Заполнить отчёт"}
            </Link>
      </ModalShell>
    </div>
  );
}
