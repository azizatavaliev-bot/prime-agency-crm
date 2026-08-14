import Link from "next/link";
import {
  Download,
  Wallet,
  PiggyBank,
  Target,
  UserMinus,
  Flag,
  ExternalLink,
  TrendingDown,
} from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reportMetrics } from "@/lib/finance";
import { som, monthKey, monthLabel, num } from "@/lib/format";
import { PAYMENT_KIND, EXPENSE_CATEGORY } from "@/lib/constants";
import { PageHeader, Table, Stat, Section } from "@/components/ui";
import PrintButton from "@/components/PrintButton";
import {
  RevenueProfitChart,
  ServicesPie,
  ChurnChart,
  TargetologChart,
  ExpensesChart,
} from "@/components/AnalyticsCharts";

export const dynamic = "force-dynamic";

const METRIC_LABEL: Record<string, string> = {
  REVENUE: "Выручка",
  PROFIT: "Прибыль владельца",
  LEADS: "Заявки",
  CLIENTS: "Клиенты",
  CPL: "Цена заявки",
};

export default async function AnalyticsPage() {
  await requireOwner();

  const [clients, payments, reports, targetologs, goals] = await Promise.all([
    prisma.client.findMany(),
    prisma.payment.findMany(),
    prisma.adReport.findMany(),
    prisma.user.findMany({ where: { role: "TARGETOLOG" }, include: { clientsAsTargetolog: true } }),
    prisma.goal.findMany({ include: { client: true }, orderBy: [{ month: "desc" }, { metric: "asc" }] }),
  ]);

  const [expenses, otherIncomes] = await Promise.all([
    prisma.expense.findMany({ where: { status: "PAID" } }),
    prisma.income.findMany(),
  ]);

  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(monthKey(d));
  }

  const rows = months.map((m) => {
    const [y, mm] = m.split("-").map(Number);
    const end = new Date(y, mm, 0, 23, 59);
    const start = new Date(y, mm - 1, 1);
    const paid = payments.filter((p) => p.periodMonth === m && p.status === "PAID");
    const otherIn = otherIncomes.filter((i) => i.periodMonth === m).reduce((s, i) => s + i.amount, 0);
    const revenue = paid.reduce((s, p) => s + p.amount, 0) + otherIn;
    const subsCount = paid.filter((p) => p.kind === "SUBSCRIPTION").length;
    const activeStart = clients.filter(
      (c) => c.startedAt < start && (!c.churnedAt || c.churnedAt >= start)
    ).length;
    const churned = clients.filter((c) => c.churnedAt && monthKey(c.churnedAt) === m).length;
    const active = clients.filter((c) => c.startedAt <= end && (!c.churnedAt || c.churnedAt > end)).length;
    return {
      m,
      label: monthLabel(m),
      revenue,
      active,
      churned,
      churnRate: activeStart ? (churned / activeStart) * 100 : 0,
      avgCheck: subsCount ? revenue / subsCount : 0,
      otherIncome: otherIn,
      ownerGross: paid.reduce((s, p) => s + p.ownerNet, 0) + otherIn,
      expenses: expenses.filter((e) => e.periodMonth === m).reduce((s, e) => s + e.amount, 0),
      get ownerNet() {
        return this.ownerGross - this.expenses;
      },
    };
  });

  const expenseByCategory = Object.keys(EXPENSE_CATEGORY)
    .map((k) => ({
      key: k,
      label: EXPENSE_CATEGORY[k as keyof typeof EXPENSE_CATEGORY],
      sum: expenses.filter((e) => e.category === k).reduce((s, e) => s + e.amount, 0),
    }))
    .filter((c) => c.sum > 0)
    .sort((a, b) => b.sum - a.sum);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const byService = Object.keys(PAYMENT_KIND).map((k) => {
    const list = payments.filter((p) => p.kind === k && p.status === "PAID");
    return { kind: k, sum: list.reduce((s, p) => s + p.amount, 0), count: list.length };
  });
  const totalPaid = byService.reduce((s, x) => s + x.sum, 0);

  const withM = reports.map(reportMetrics).filter((m) => m.inTarget !== null);
  const inTargetPct = withM.length ? (withM.filter((m) => m.inTarget).length / withM.length) * 100 : 0;

  const mk = monthKey();
  const byTargetolog = targetologs
    .map((t) => {
      const ids = t.clientsAsTargetolog.map((c) => c.id);
      const revenue = payments
        .filter((p) => p.status === "PAID" && p.periodMonth === mk && ids.includes(p.clientId))
        .reduce((s, p) => s + p.amount, 0);
      return {
        name: t.name,
        revenue,
        clients: t.clientsAsTargetolog.filter((c) => ["TEST", "ACTIVE", "RISK"].includes(c.status)).length,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <div>
      <PageHeader
        title="Отчётность и аналитика"
        subtitle="Сводка за 12 месяцев · выручка включает оплаты клиентов и прочие приходы"
        right={
          <div className="flex flex-wrap gap-2">
            <a className="btn-ghost print:hidden" href="/api/export?type=payments">
              <Download size={15} /> Оплаты
            </a>
            <a className="btn-ghost print:hidden" href="/api/export?type=clients">
              <Download size={15} /> Клиенты
            </a>
            <a className="btn-ghost print:hidden" href="/api/export?type=reports">
              <Download size={15} /> Отчёты
            </a>
            <a className="btn-ghost print:hidden" href="/api/export?type=expenses">
              <Download size={15} /> Расходы
            </a>
            <PrintButton />
          </div>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Stat label="Выручка за 12 мес" value={som(rows.reduce((s, r) => s + r.revenue, 0))} icon={Wallet} />
        <Stat
          label="Расходы за 12 мес"
          value={som(totalExpenses)}
          tone="bad"
          icon={TrendingDown}
        />
        <Stat
          label="Чистая прибыль владельца"
          value={som(rows.reduce((s, r) => s + r.ownerNet, 0))}
          hint="после расходов"
          tone="good"
          icon={PiggyBank}
        />
        <Stat
          label="Проектов в цели по CPL"
          value={`${num(inTargetPct)}%`}
          hint={`${withM.length} отчётов с заявками`}
          tone={inTargetPct >= 60 ? "good" : "warn"}
          icon={Target}
        />
        <Stat
          label="Отток за год"
          value={`${clients.filter((c) => c.churnedAt).length} клиентов`}
          tone={clients.filter((c) => c.churnedAt).length ? "warn" : "good"}
          icon={UserMinus}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RevenueProfitChart data={rows.map((r) => ({ month: r.label, revenue: r.revenue, ownerNet: r.ownerNet }))} />
        <ServicesPie
          data={byService
            .filter((s) => s.sum > 0)
            .map((s) => ({ name: PAYMENT_KIND[s.kind as keyof typeof PAYMENT_KIND], value: s.sum }))}
        />
        <ExpensesChart
          data={rows.map((r) => ({ month: r.label, expenses: r.expenses, ownerNet: r.ownerNet }))}
          byCategory={expenseByCategory.map((c) => ({ name: c.label, value: c.sum }))}
        />
        <ChurnChart data={rows.map((r) => ({ month: r.label, active: r.active, churned: r.churned }))} />
        <TargetologChart data={byTargetolog} />
      </div>

      <Section
        title="Цели: агентство и клиенты"
        icon={Flag}
        right={
          <Link href="/settings/goals" className="btn-ghost">
            <ExternalLink size={15} /> Настроить цели
          </Link>
        }
      >
        <Table head={["Месяц", "Цель", "Показатель", "План", "Факт", "Выполнение", "За счёт чего"]}>
          {goals.map((g) => {
            const isMoney = ["REVENUE", "PROFIT", "CPL"].includes(g.metric);
            const row = rows.find((r) => r.m === g.month);
            const clientReports = reports.filter(
              (r) => (!g.clientId || r.clientId === g.clientId) && monthKey(r.periodTo) === g.month
            );
            const gLeads = clientReports.reduce((s, r) => s + r.leads, 0);
            const gSpent = clientReports.reduce((s, r) => s + r.spent, 0);
            const clientPaid = payments.filter(
              (p) => p.status === "PAID" && p.periodMonth === g.month && (!g.clientId || p.clientId === g.clientId)
            );
            const monthExpenses = g.clientId
              ? expenses.filter((e) => e.periodMonth === g.month && e.clientId === g.clientId)
              : expenses.filter((e) => e.periodMonth === g.month);
            const fact =
              g.metric === "REVENUE"
                ? clientPaid.reduce((s, p) => s + p.amount, 0) +
                  (g.clientId
                    ? otherIncomes
                        .filter((i) => i.periodMonth === g.month && i.clientId === g.clientId)
                        .reduce((s, i) => s + i.amount, 0)
                    : otherIncomes.filter((i) => i.periodMonth === g.month).reduce((s, i) => s + i.amount, 0))
                : g.metric === "PROFIT"
                  ? clientPaid.reduce((s, p) => s + p.ownerNet, 0) -
                    monthExpenses.reduce((s, e) => s + e.amount, 0)
                  : g.metric === "LEADS"
                    ? gLeads
                    : g.metric === "CLIENTS"
                      ? row?.active ?? 0
                      : gLeads
                        ? gSpent / gLeads
                        : 0;
            const reverse = g.metric === "CPL";
            const pct = g.target ? Math.round((reverse ? g.target / (fact || g.target) : fact / g.target) * 100) : 0;
            const done = reverse ? fact > 0 && fact <= g.target : fact >= g.target;
            return (
              <tr key={g.id}>
                <td className="td">{monthLabel(g.month)}</td>
                <td className="td">{g.client?.name ?? "Агентство"}</td>
                <td className="td">{METRIC_LABEL[g.metric] ?? g.metric}</td>
                <td className="td">{isMoney ? som(g.target) : num(g.target)}</td>
                <td className="td font-medium">{isMoney ? som(fact) : num(fact)}</td>
                <td className={`td ${done ? "text-emerald-600" : "text-amber-600"}`}>
                  {Math.min(pct, 999)}% {done ? "· цель взята" : ""}
                </td>
                <td className="td text-muted">{g.comment || "—"}</td>
              </tr>
            );
          })}
          {goals.length === 0 && (
            <tr>
              <td className="td text-muted" colSpan={7}>
                Целей пока нет — поставьте план по выручке или заявкам
              </td>
            </tr>
          )}
        </Table>
      </Section>

      <h2 className="mt-8 mb-3 text-sm font-medium text-zinc-500">По месяцам</h2>
      <Table
        head={["Месяц", "Выручка", "Расходы", "Чистая прибыль", "Средний чек", "Активных", "Отток", "Отток %"]}
      >
        {rows.map((r) => (
          <tr key={r.m}>
            <td className="td">{r.label}</td>
            <td className="td font-medium">{som(r.revenue)}</td>
            <td className={`td ${r.expenses ? "text-red-600" : ""}`}>{som(r.expenses)}</td>
            <td className={`td font-medium ${r.ownerNet < 0 ? "text-red-600" : ""}`}>{som(r.ownerNet)}</td>
            <td className="td">{som(r.avgCheck)}</td>
            <td className="td">{r.active}</td>
            <td className="td">{r.churned}</td>
            <td className={`td ${r.churnRate > 10 ? "text-red-600" : ""}`}>{num(r.churnRate, 1)}%</td>
          </tr>
        ))}
      </Table>

      <h2 className="mt-8 mb-3 text-sm font-medium text-zinc-500">Расходы по категориям</h2>
      <Table head={["Категория", "Сумма за 12 мес", "Доля"]}>
        {expenseByCategory.map((c) => (
          <tr key={c.key}>
            <td className="td">{c.label}</td>
            <td className="td font-medium">{som(c.sum)}</td>
            <td className="td">{totalExpenses ? `${num((c.sum / totalExpenses) * 100, 1)}%` : "—"}</td>
          </tr>
        ))}
        {expenseByCategory.length === 0 && (
          <tr>
            <td className="td text-muted" colSpan={3}>
              Расходов пока нет
            </td>
          </tr>
        )}
      </Table>

      <h2 className="mt-8 mb-3 text-sm font-medium text-zinc-500">Доход по услугам</h2>
      <Table head={["Услуга", "Платежей", "Сумма", "Доля"]}>
        {byService.map((s) => (
          <tr key={s.kind}>
            <td className="td">{PAYMENT_KIND[s.kind as keyof typeof PAYMENT_KIND]}</td>
            <td className="td">{s.count}</td>
            <td className="td font-medium">{som(s.sum)}</td>
            <td className="td">{totalPaid ? `${num((s.sum / totalPaid) * 100, 1)}%` : "—"}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
