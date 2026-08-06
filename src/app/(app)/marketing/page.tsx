import { redirect } from "next/navigation";
import { Wallet, Users2, Eye, MessageSquare, TrendingUp } from "lucide-react";
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
} from "@/lib/marketing";
import { PageHeader, Stat, Section, Table } from "@/components/ui";
import MarketingTabs from "@/components/MarketingTabs";
import ClientReportsTab from "./_tabs/ClientReportsTab";
import DailyReportsTab from "./_tabs/DailyReportsTab";
import MarketingCalendarTab from "./_tabs/MarketingCalendarTab";

export const dynamic = "force-dynamic";

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; clientId?: string; y?: string; m?: string }>;
}) {
  const user = await requireUser();
  if (!can.writeReports(user)) redirect("/no-access");
  const sp = await searchParams;
  const tab =
    sp.tab === "clients" || sp.tab === "daily" || sp.tab === "calendar" ? sp.tab : "analytics";

  const scope = marketingScope(user);
  const from = monthStartUtc();
  const to = todayUtc();
  const [rows, weekRows, { MARKETING_CHANNEL, MARKETING_SOURCE, MARKETING_DIRECTION }] = await Promise.all([
    reportsForRange(from, to, scope),
    reportsForRange(weekStartUtc(), to, scope),
    dicts(["MARKETING_CHANNEL", "MARKETING_SOURCE", "MARKETING_DIRECTION"]),
  ]);

  const t = totals(rows);
  const wt = totals(weekRows);
  const byChannel = breakdown(rows, "channel");
  const bySource = breakdown(rows, "source");
  const byDirection = breakdown(rows, "direction");

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
      {tab === "daily" && <DailyReportsTab />}
      {tab === "calendar" && <MarketingCalendarTab sp={{ y: sp.y, m: sp.m }} />}

      {tab === "analytics" && (
      <>

      <Section title="Эта неделя" icon={TrendingUp}>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Stat label="Расход" value={som(wt.spend)} icon={Wallet} />
          <Stat label="Лиды" value={String(wt.leads)} icon={Users2} />
          <Stat label="Показы" value={String(wt.impressions)} icon={Eye} />
          <Stat label="Обращения" value={String(wt.inquiries)} icon={MessageSquare} />
        </div>
      </Section>

      <Section title="За месяц" icon={Wallet}>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Stat label="Расход" value={som(t.spend)} icon={Wallet} />
          <Stat label="Лиды" value={String(t.leads)} icon={Users2} />
          <Stat
            label="CPL средний"
            value={t.cpl ? `${num(t.cpl)} сом` : "—"}
            icon={TrendingUp}
          />
          <Stat label="Обращения" value={String(t.inquiries)} icon={MessageSquare} />
        </div>
      </Section>

      <Section title="По каналам" icon={TrendingUp}>
        <Table head={["Канал", "Расход", "Лиды", "CPL"]}>
          {byChannel.map((b) => (
            <tr key={b.key}>
              <td className="td">{label(MARKETING_CHANNEL, b.key)}</td>
              <td className="td font-medium">{som(b.spend)}</td>
              <td className="td">{b.leads}</td>
              <td className="td">{b.cpl ? `${num(b.cpl)} сом` : "—"}</td>
            </tr>
          ))}
          {byChannel.length === 0 && (
            <tr>
              <td className="td text-zinc-500" colSpan={4}>
                Нет данных
              </td>
            </tr>
          )}
        </Table>
      </Section>

      <Section title="По источникам" icon={TrendingUp}>
        <Table head={["Источник", "Расход", "Лиды", "CPL"]}>
          {bySource.map((b) => (
            <tr key={b.key}>
              <td className="td">{label(MARKETING_SOURCE, b.key)}</td>
              <td className="td font-medium">{som(b.spend)}</td>
              <td className="td">{b.leads}</td>
              <td className="td">{b.cpl ? `${num(b.cpl)} сом` : "—"}</td>
            </tr>
          ))}
          {bySource.length === 0 && (
            <tr>
              <td className="td text-zinc-500" colSpan={4}>
                Нет данных
              </td>
            </tr>
          )}
        </Table>
      </Section>

      <Section title="По направлениям" icon={TrendingUp}>
        <Table head={["Направление", "Расход", "Лиды", "CPL"]}>
          {byDirection.map((b) => (
            <tr key={b.key}>
              <td className="td">{label(MARKETING_DIRECTION, b.key)}</td>
              <td className="td font-medium">{som(b.spend)}</td>
              <td className="td">{b.leads}</td>
              <td className="td">{b.cpl ? `${num(b.cpl)} сом` : "—"}</td>
            </tr>
          ))}
          {byDirection.length === 0 && (
            <tr>
              <td className="td text-zinc-500" colSpan={4}>
                Нет данных
              </td>
            </tr>
          )}
        </Table>
      </Section>
      </>
      )}
    </div>
  );
}
