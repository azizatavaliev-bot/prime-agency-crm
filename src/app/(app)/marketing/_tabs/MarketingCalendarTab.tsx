import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { can, marketingScope } from "@/lib/access";
import { dicts, labelOf } from "@/lib/dict";
import { reportsForRange, groupByDate, monthRange, todayIso } from "@/lib/marketing";
import MarketingCalendar, { type CalendarReport } from "@/components/MarketingCalendar";

export default async function MarketingCalendarTab({ sp }: { sp: { y?: string; m?: string } }) {
  const user = await requireUser();
  if (!can.writeReports(user)) redirect("/no-access");

  const today = todayIso();
  const [curYear, curMonth] = today.split("-").map(Number);
  const year = Number(sp.y) || curYear;
  const month = Number(sp.m) || curMonth;

  const { from, to } = monthRange(year, month);
  // Режим недели показывает дни соседних месяцев, поэтому грузим окно с запасом:
  // иначе неделя на стыке месяцев выглядела бы пустой.
  const windowFrom = new Date(from);
  windowFrom.setUTCDate(windowFrom.getUTCDate() - 7);
  const windowTo = new Date(to);
  windowTo.setUTCDate(windowTo.getUTCDate() + 7);

  const prevMonth = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const prevRange = monthRange(prevMonth.y, prevMonth.m);

  const scope = marketingScope(user);
  const [rows, prevRows, d] = await Promise.all([
    reportsForRange(windowFrom, windowTo, scope),
    reportsForRange(prevRange.from, prevRange.to, scope),
    dicts(["MARKETING_CHANNEL", "MARKETING_SOURCE", "MARKETING_DIRECTION"]),
  ]);

  const reports: CalendarReport[] = rows.map((r) => ({
    id: r.id,
    date: r.date.toISOString().slice(0, 10),
    channel: r.channel,
    channelLabel: labelOf(d.MARKETING_CHANNEL, r.channel),
    source: r.source,
    sourceLabel: r.source ? labelOf(d.MARKETING_SOURCE, r.source) : null,
    direction: r.direction,
    directionLabel: r.direction ? labelOf(d.MARKETING_DIRECTION, r.direction) : null,
    spend: r.spend,
    leads: r.leads,
    impressions: r.impressions,
    clicks: r.clicks,
    inquiries: r.inquiries,
    notes: r.notes,
    authorName: r.authorName ?? null,
    clientName: null,
  }));

  // Для сравнения «тот же день месяцем раньше» достаточно числа месяца.
  const prevByDay: Record<string, { spend: number; leads: number }> = {};
  for (const [dateStr, v] of groupByDate(prevRows))
    prevByDay[dateStr.slice(8)] = { spend: v.spend, leads: v.leads };

  const opts = (l: { key: string; name: string }[]) => l.map((i) => ({ value: i.key, label: i.name }));

  return (
    <MarketingCalendar
      year={year}
      month={month}
      reports={reports}
      today={today}
      prevMonthByDate={prevByDay}
      sources={opts(d.MARKETING_SOURCE)}
      directions={opts(d.MARKETING_DIRECTION)}
    />
  );
}
