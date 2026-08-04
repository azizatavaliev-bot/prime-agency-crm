import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Wallet, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can, marketingScope } from "@/lib/access";
import { som, num } from "@/lib/format";
import { reportsForRange, groupByDate, cplExtremes, monthRange, totals, todayIso } from "@/lib/marketing";
import { PageHeader, Section, Stat } from "@/components/ui";
import MarketingTabs from "@/components/MarketingTabs";

export const dynamic = "force-dynamic";

export default async function MarketingCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const user = await requireUser();
  if (!can.writeReports(user)) redirect("/no-access");

  const sp = await searchParams;
  const today = todayIso();
  const [curYear, curMonth] = today.split("-").map(Number);
  const year = Number(sp.y) || curYear;
  const month = Number(sp.m) || curMonth;
  const { from, to } = monthRange(year, month);

  const rows = await reportsForRange(from, to, marketingScope(user));
  const byDate = groupByDate(rows);
  const t = totals(rows);
  const { min, max } = cplExtremes(byDate);

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // пн=0
  const cells: (number | null)[] = Array(firstWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const filledDays = byDate.size;
  const avgCpl = t.cpl;

  const MONTHS = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ];
  const monthLabelRu = `${MONTHS[month - 1]} ${year}`;

  return (
    <div>
      <PageHeader title="Маркетинг" subtitle="Календарь ежедневных отчётов" />
      <MarketingTabs />

      <Section title="Бюджет и цена заявки" icon={Wallet}>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Stat label="Расход" value={som(t.spend)} icon={Wallet} />
          <Stat label="CPL средний" value={avgCpl ? `${num(avgCpl)} сом` : "—"} icon={TrendingUp} />
          <Stat label="CPL мин." value={min ? `${num(min.cpl)} сом` : "—"} tone="good" icon={TrendingDown} />
          <Stat label="CPL макс." value={max ? `${num(max.cpl)} сом` : "—"} tone="bad" icon={TrendingUp} />
        </div>
        <div className="mt-3 grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Stat label="Лиды" value={String(t.leads)} icon={CheckCircle2} />
          <Stat label="Показы" value={String(t.impressions)} />
          <Stat label="Обращения" value={String(t.inquiries)} />
          <Stat label="Заполнено дней" value={`${filledDays} / ${daysInMonth}`} />
        </div>
      </Section>

      <Section
        title={monthLabelRu}
        icon={CalendarDays}
        right={
          <div className="flex gap-2">
            <Link href={`/marketing/calendar?y=${prev.y}&m=${prev.m}`} className="btn-ghost !px-3 !py-1.5 !text-xs">
              ← Пред.
            </Link>
            <Link href="/marketing/calendar" className="btn-ghost !px-3 !py-1.5 !text-xs">
              Сегодня
            </Link>
            <Link href={`/marketing/calendar?y=${next.y}&m=${next.m}`} className="btn-ghost !px-3 !py-1.5 !text-xs">
              След. →
            </Link>
          </div>
        }
      >
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-muted mb-1">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            if (d === null) return <div key={`e${i}`} />;
            const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const day = byDate.get(iso);
            const dayCpl = day && day.leads > 0 ? day.spend / day.leads : null;
            const isPast = iso < today;
            let tone = "bg-subtle";
            if (dayCpl !== null && avgCpl) {
              const ratio = dayCpl / avgCpl;
              tone =
                ratio <= 0.85
                  ? "bg-emerald-50 text-emerald-700"
                  : ratio >= 1.15
                    ? "bg-red-50 text-red-700"
                    : "bg-amber-50 text-amber-700";
            } else if (!day && isPast) {
              tone = "bg-zinc-100 text-zinc-400";
            }
            return (
              <div key={iso} className={`rounded-xl p-2 text-left text-xs min-h-[64px] ${tone}`}>
                <div className="font-medium">{d}</div>
                {day ? (
                  <div className="mt-1 space-y-0.5">
                    <div>{som(day.spend)}</div>
                    <div>{day.leads} лид.</div>
                    {dayCpl && <div className="opacity-70">{Math.round(dayCpl)} сом</div>}
                  </div>
                ) : isPast ? (
                  <div className="mt-1 opacity-60">нет отчёта</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
