import { redirect } from "next/navigation";
import { Wallet, Users2, Eye, MousePointerClick, TrendingUp, FileBarChart, Plus, CalendarDays } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can, marketingScope } from "@/lib/access";
import { dicts } from "@/lib/dict";
import { som, num, dateRu } from "@/lib/format";
import {
  reportsForRange,
  totals,
  breakdown,
  monthStartUtc,
  weekStartUtc,
  todayUtc,
  monthRange,
} from "@/lib/marketing";
import Link from "next/link";
import { PageHeader, Section, Table, HeroStat, CompactStat } from "@/components/ui";
import MarketingTabs from "@/components/MarketingTabs";
import ClientReportsTab from "./_tabs/ClientReportsTab";
import DailyReportsTab from "./_tabs/DailyReportsTab";
import MarketingCalendarTab from "./_tabs/MarketingCalendarTab";

export const dynamic = "force-dynamic";

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    clientId?: string;
    y?: string;
    m?: string;
    date?: string;
    edit?: string;
    share?: string;
    sent?: string;
    error?: string;
    tasksAdded?: string;
  }>;
}) {
  const user = await requireUser();
  if (!can.writeReports(user)) redirect("/no-access");
  const sp = await searchParams;
  const tab =
    sp.tab === "clients" || sp.tab === "daily" || sp.tab === "calendar" ? sp.tab : "analytics";

  const scope = marketingScope(user);
  const from = monthStartUtc();
  const to = todayUtc();
  // Прошлый месяц целиком — для сравнения «↓2%» рядом с текущими цифрами,
  // как в Unity. Берём тот же диапазон дней, что уже прошёл в этом месяце,
  // иначе неполный текущий месяц всегда проигрывал бы завершённому прошлому.
  const prevMonth = from.getUTCMonth() === 0 ? 12 : from.getUTCMonth();
  const prevYear = from.getUTCMonth() === 0 ? from.getUTCFullYear() - 1 : from.getUTCFullYear();
  const prevRangeFull = monthRange(prevYear, prevMonth);
  const prevTo = new Date(prevRangeFull.from);
  prevTo.setUTCDate(prevTo.getUTCDate() + (to.getUTCDate() - from.getUTCDate()));

  const [rows, weekRows, prevRows, { MARKETING_CHANNEL, MARKETING_SOURCE, MARKETING_DIRECTION }] =
    await Promise.all([
      reportsForRange(from, to, scope),
      reportsForRange(weekStartUtc(), to, scope),
      reportsForRange(prevRangeFull.from, prevTo, scope),
      dicts(["MARKETING_CHANNEL", "MARKETING_SOURCE", "MARKETING_DIRECTION"]),
    ]);

  const t = totals(rows);
  const wt = totals(weekRows);
  const pt = totals(prevRows);
  const byChannel = breakdown(rows, "channel");
  const bySource = breakdown(rows, "source");
  const byDirection = breakdown(rows, "direction");

  // Процент изменения к тому же отрезку прошлого месяца, округлённый как в Unity.
  const pct = (now: number, was: number) => (was > 0 ? Math.round(((now - was) / was) * 100) : 0);

  const label = (list: { key: string; name: string }[], key: string) =>
    list.find((i) => i.key === key)?.name ?? key;

  return (
    <div>
      <PageHeader
        title="Маркетинг и реклама"
        subtitle="Вся реклама агентства и отчёты по проектам в одном разделе"
      />
      <MarketingTabs active={tab} />

      {tab === "clients" && <ClientReportsTab sp={{ clientId: sp.clientId }} />}
      {tab === "daily" && (
        <DailyReportsTab
          sp={{ date: sp.date, edit: sp.edit, share: sp.share, sent: sp.sent, error: sp.error, tasksAdded: sp.tasksAdded }}
        />
      )}
      {tab === "calendar" && <MarketingCalendarTab sp={{ y: sp.y, m: sp.m }} />}

      {tab === "analytics" && (
      <>

      {rows.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl accent-soft accent-text">
            <FileBarChart size={22} />
          </div>
          <div className="font-display text-lg font-semibold">Отчётов за этот месяц ещё нет</div>
          <div className="mx-auto mt-1 max-w-md text-sm text-muted">
            Как только появится первый отчёт по расходу и заявкам, здесь посчитается цена заявки,
            разбивка по каналам и источникам.
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/marketing?tab=daily" className="btn-primary">
              <Plus size={15} /> Заполнить отчёт
            </Link>
            <Link href="/marketing?tab=calendar" className="btn-ghost">
              <CalendarDays size={15} /> Посмотреть календарь
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Главное за месяц — крупно: расход, заявки и их цена, со сравнением
              к тому же отрезку прошлого месяца — как в аналитике Unity */}
          <div className="grid gap-3 lg:grid-cols-3">
            <HeroStat
              label="Расход за месяц"
              value={som(t.spend)}
              icon={Wallet}
              delta={pt.spend ? { percent: pct(t.spend, pt.spend), caption: `к прошлому месяцу: ${som(pt.spend)}`, goodWhenUp: false } : undefined}
            />
            <HeroStat
              label="Заявок за месяц"
              value={num(t.leads)}
              icon={Users2}
              tone="good"
              hint={t.inquiries ? `обращений ${num(t.inquiries)}` : undefined}
              delta={pt.leads ? { percent: pct(t.leads, pt.leads), caption: `к прошлому месяцу: ${num(pt.leads)}` } : undefined}
            />
            <HeroStat
              label="Цена заявки"
              value={t.cpl ? `${num(t.cpl)} сом` : "—"}
              icon={TrendingUp}
              hint={t.impressions ? `показов ${num(t.impressions)}` : undefined}
              delta={
                pt.cpl && t.cpl
                  ? { percent: pct(t.cpl, pt.cpl), caption: `к прошлому месяцу: ${num(pt.cpl)} сом`, goodWhenUp: false }
                  : undefined
              }
            />
          </div>

          {/* Неделя — лентой: нужна для контроля темпа, но не главная цифра.
              Клики и CTR — прямо здесь, показатель контента больше не теряется. */}
          <div className="mt-3 grid gap-2 grid-cols-2 sm:grid-cols-4">
            <CompactStat
              label="Расход за неделю"
              value={som(wt.spend)}
              icon={Wallet}
              delta={pt.spend ? { percent: pct(t.spend, pt.spend), goodWhenUp: false } : undefined}
            />
            <CompactStat
              label="Заявок за неделю"
              value={num(wt.leads)}
              icon={Users2}
              delta={pt.leads ? { percent: pct(t.leads, pt.leads) } : undefined}
            />
            <CompactStat
              label="CPL за неделю"
              value={wt.cpl ? `${num(wt.cpl)} сом` : "—"}
              icon={TrendingUp}
              tone={wt.cpl && t.cpl ? (wt.cpl <= t.cpl ? "good" : "bad") : "default"}
              hint={wt.cpl && t.cpl ? `в среднем за месяц ${num(t.cpl)}` : undefined}
            />
            <CompactStat label="Показы за неделю" value={num(wt.impressions)} icon={Eye} />
          </div>

          <div className="mt-2 grid gap-2 grid-cols-2 sm:grid-cols-4">
            <CompactStat
              label="Клики за месяц"
              value={num(t.clicks)}
              icon={MousePointerClick}
              delta={pt.clicks ? { percent: pct(t.clicks, pt.clicks) } : undefined}
            />
            <CompactStat
              label="CTR"
              value={t.ctr !== null ? `${t.ctr.toFixed(1)}%` : "—"}
              icon={MousePointerClick}
              hint="доля показов, приведших к клику"
            />
          </div>

          {/* Разбивки показываем только те, по которым есть данные:
              три пустые таблицы подряд занимали экран и ничего не сообщали */}
          {[
            { title: "По каналам", rows: byChannel, dict: MARKETING_CHANNEL, head: "Канал" },
            { title: "По источникам", rows: bySource, dict: MARKETING_SOURCE, head: "Источник" },
            { title: "По направлениям", rows: byDirection, dict: MARKETING_DIRECTION, head: "Направление" },
          ]
            // Разбивка из одного «—» — это отсутствие разметки, а не данные
            .filter((b) => b.rows.length > 0 && !(b.rows.length === 1 && b.rows[0].key === "—"))
            .map((b) => (
              <Section key={b.title} title={b.title} icon={TrendingUp}>
                <Table head={[b.head, "Расход", "Лиды", "CPL", "Доля расхода"]}>
                  {b.rows.map((r) => (
                    <tr key={r.key}>
                      <td className="td">{label(b.dict, r.key)}</td>
                      <td className="td font-medium">{som(r.spend)}</td>
                      <td className="td">{r.leads}</td>
                      <td
                        className={`td ${
                          r.cpl && t.cpl ? (r.cpl <= t.cpl ? "text-emerald-600" : "text-red-600") : ""
                        }`}
                      >
                        {r.cpl ? `${num(r.cpl)} сом` : "—"}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-subtle">
                            <div
                              className="h-full rounded-full bg-[var(--accent)]"
                              style={{ width: `${t.spend ? Math.round((r.spend / t.spend) * 100) : 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted">
                            {t.spend ? Math.round((r.spend / t.spend) * 100) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </Table>
              </Section>
            ))}
        </>
      )}
      </>
      )}
    </div>
  );
}
