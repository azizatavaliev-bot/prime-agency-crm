import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { monthKey } from "./format";

export type MarketingRow = {
  id: string;
  date: Date;
  channel: string;
  source: string | null;
  direction: string | null;
  spend: number;
  leads: number;
  impressions: number;
  clicks: number;
  inquiries: number;
  notes: string | null;
  authorName?: string | null;
};

export function cpl(spend: number, leads: number): number | null {
  return leads > 0 ? spend / leads : null;
}

/** Итоги по набору строк отчёта. */
export function totals(rows: MarketingRow[]) {
  const spend = rows.reduce((s, r) => s + r.spend, 0);
  const leads = rows.reduce((s, r) => s + r.leads, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const inquiries = rows.reduce((s, r) => s + r.inquiries, 0);
  // CTR — доля показов, которые привели к клику; без показов метрика бессмысленна.
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : null;
  return { spend, leads, impressions, clicks, inquiries, ctr, cpl: cpl(spend, leads) };
}

/** Разбивка суммы расхода/лидов по ключу (канал/источник/направление). */
export function breakdown(rows: MarketingRow[], key: "channel" | "source" | "direction") {
  const map = new Map<string, { spend: number; leads: number }>();
  for (const r of rows) {
    const k = r[key] || "—";
    const cur = map.get(k) ?? { spend: 0, leads: 0 };
    cur.spend += r.spend;
    cur.leads += r.leads;
    map.set(k, cur);
  }
  return [...map.entries()]
    .map(([key, v]) => ({ key, ...v, cpl: cpl(v.spend, v.leads) }))
    .sort((a, b) => b.spend - a.spend);
}

/** Мин/макс CPL среди дней с лидами (для карточек календаря). */
export function cplExtremes(byDate: Map<string, { spend: number; leads: number }>) {
  let min: { date: string; cpl: number } | null = null;
  let max: { date: string; cpl: number } | null = null;
  for (const [date, v] of byDate) {
    if (v.leads <= 0) continue;
    const c = v.spend / v.leads;
    if (!min || c < min.cpl) min = { date, cpl: c };
    if (!max || c > max.cpl) max = { date, cpl: c };
  }
  return { min, max };
}

export async function reportsForRange(
  from: Date,
  to: Date,
  scope: Prisma.MarketingReportWhereInput = {}
): Promise<MarketingRow[]> {
  const rows = await prisma.marketingReport.findMany({
    where: { AND: [{ date: { gte: from, lte: to } }, scope] },
    include: { author: { select: { name: true } } },
    orderBy: { date: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    channel: r.channel,
    source: r.source,
    direction: r.direction,
    spend: r.spend,
    leads: r.leads,
    impressions: r.impressions,
    clicks: r.clicks,
    inquiries: r.inquiries,
    notes: r.notes,
    authorName: r.author?.name,
  }));
}

/**
 * Даты отчётов приходят из <input type=date> как UTC-полночь, поэтому все
 * границы периодов тоже строим в UTC. Иначе в UTC+6 отчёт за 31 июля попадал
 * в «расход за август» на аналитике, но не попадал в календарь августа.
 */
/** Часовой пояс агентства: сервер на Railway живёт в UTC, а день закрывается по Бишкеку. */
export const AGENCY_TZ = "Asia/Bishkek";

/** Сегодняшняя календарная дата глазами агентства, в формате YYYY-MM-DD. */
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: AGENCY_TZ }).format(new Date());
}

/** Части сегодняшней даты по календарю агентства. */
function todayParts() {
  const [y, m, d] = todayIso().split("-").map(Number);
  return { y, m, d };
}

export function todayUtc(): Date {
  const { y, m, d } = todayParts();
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59));
}

export function monthStartUtc(): Date {
  const { y, m } = todayParts();
  return new Date(Date.UTC(y, m - 1, 1));
}

/** Понедельник текущей недели. */
export function weekStartUtc(): Date {
  const { y, m, d } = todayParts();
  const base = new Date(Date.UTC(y, m - 1, d));
  const day = base.getUTCDay() === 0 ? 7 : base.getUTCDay();
  return new Date(Date.UTC(y, m - 1, d - (day - 1)));
}

/** Группировка по датам (для календаря) — ISO-дата -> сумма за день. */
export function groupByDate(rows: MarketingRow[]) {
  const map = new Map<
    string,
    { spend: number; leads: number; impressions: number; clicks: number; inquiries: number }
  >();
  for (const r of rows) {
    const key = r.date.toISOString().slice(0, 10);
    const cur = map.get(key) ?? { spend: 0, leads: 0, impressions: 0, clicks: 0, inquiries: 0 };
    cur.spend += r.spend;
    cur.leads += r.leads;
    cur.impressions += r.impressions;
    cur.clicks += r.clicks;
    cur.inquiries += r.inquiries;
    map.set(key, cur);
  }
  return map;
}

export function monthRange(year: number, month: number) {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  return { from, to };
}

/** Текст отчёта клиенту — один шаблон для копирования, Telegram и превью в форме. */
export function reportShareText(r: {
  date: Date;
  spend: number;
  leads: number;
  impressions: number;
  clicks: number;
  inquiries: number;
  clientName?: string | null;
  notes?: string | null;
}): string {
  const cplLine = r.leads > 0 ? `\nЦена заявки: ${Math.round(r.spend / r.leads)} сом` : "";
  const lines = [
    `📊 Отчёт за ${r.date.toLocaleDateString("ru-RU")}${r.clientName ? ` — ${r.clientName}` : ""}`,
    `Расход: ${Math.round(r.spend).toLocaleString("ru-RU")} сом`,
    `Заявок: ${r.leads}`,
  ];
  if (r.clicks) lines.push(`Клики: ${r.clicks}`);
  if (r.impressions) lines.push(`Показы: ${r.impressions.toLocaleString("ru-RU")}`);
  if (r.inquiries) lines.push(`Обращений: ${r.inquiries}`);
  return lines.join("\n") + cplLine + (r.notes ? `\n\n${r.notes}` : "");
}

export { monthKey };
