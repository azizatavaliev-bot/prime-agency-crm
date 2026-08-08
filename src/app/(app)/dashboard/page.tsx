import Link from "next/link";
import {
  Users,
  Wallet,
  Receipt,
  AlertCircle,
  UsersRound,
  PiggyBank,
  TrendingUp,
  Percent,
  Target,
  TrendingDown,
  Flag,
  KanbanSquare,
  FileBarChart,
  CalendarClock,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOverdue, startOfToday } from "@/lib/tasks";
import { dict } from "@/lib/dict";
import { clientScope, taskScope } from "@/lib/access";
import { getShares, reportMetrics } from "@/lib/finance";
import { runRemindersIfDue } from "@/lib/reminders";
import { som, monthKey, monthLabel, dateRu, daysUntil, num } from "@/lib/format";
import { stagesFor } from "@/lib/constants";
import { PageHeader, Stat, Table, Section, MiniStat } from "@/components/ui";
import RevenueChart from "@/components/RevenueChart";
import { PaymentModal, StatusBadge, ClientModal, TaskModal } from "@/components/details";
import ProjectsOverview, { type ProjectRow } from "@/components/ProjectsOverview";

export const dynamic = "force-dynamic";

const METRIC_LABEL: Record<string, string> = {
  REVENUE: "Выручка",
  PROFIT: "Прибыль владельца",
  LEADS: "Заявки",
  CLIENTS: "Клиенты",
  CPL: "Цена заявки",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const mk = monthKey();

  /* ---------- кабинет сотрудника ---------- */
  if (user.role !== "OWNER") {
    const [clients, tasks, users] = await Promise.all([
      prisma.client.findMany({
        where: clientScope(user),
        include: {
          targetolog: true,
          account: true,
          payments: { orderBy: { dueAt: "desc" } },
          reports: { orderBy: { periodTo: "desc" } },
          tasks: { include: { assignee: true, client: true }, orderBy: { createdAt: "desc" } },
          members: { include: { user: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.task.findMany({
        where: { AND: [taskScope(user), { done: false }] },
        include: { client: true, assignee: true },
        orderBy: { dueAt: "asc" },
        take: 12,
      }),
      prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, role: true } }),
    ]);

    const activeClients = clients.filter((c) => ["TEST", "ACTIVE", "RISK"].includes(c.status));
    const monthReports = clients.flatMap((c) => c.reports.filter((r) => monthKey(r.periodTo) === mk));
    const leads = monthReports.reduce((s, r) => s + r.leads, 0);
    const spent = monthReports.reduce((s, r) => s + r.spent, 0);
    const inTarget = monthReports.filter((r) => reportMetrics(r).inTarget === true).length;
    const overdue = tasks.filter((t) => isOverdue(t.dueAt, t.done)).length;
    const needReport = clients.filter((c) => {
      if (!["TEST", "ACTIVE", "RISK"].includes(c.status)) return false;
      const last = c.reports[0];
      return !last || (Date.now() - last.periodTo.getTime()) / 86400000 >= 7;
    });

    return (
      <div>
        <PageHeader title={`Привет, ${user.name.split(" ")[0]}`} subtitle={`Ваш кабинет · ${monthLabel(mk)}`} />

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Stat label="Мои проекты" value={String(activeClients.length)} icon={Users} />
          <Stat label="Заявок за месяц" value={num(leads)} icon={Target} />
          <Stat
            label="Средний CPL"
            value={leads ? `${num(spent / leads)} сом` : "—"}
            hint={`в цели: ${inTarget} из ${monthReports.length} отчётов`}
            tone={monthReports.length && inTarget >= monthReports.length / 2 ? "good" : "warn"}
            icon={TrendingUp}
          />
          <Stat
            label="Открытых задач"
            value={String(tasks.length)}
            hint={overdue ? `${overdue} просрочено` : "просрочек нет"}
            tone={overdue ? "bad" : "good"}
            icon={KanbanSquare}
          />
        </div>

        {needReport.length > 0 && (
          <Section title="Нужен свежий отчёт" icon={FileBarChart}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {needReport.map((c) => (
                <Link key={c.id} href={`/clients/${c.id}`} className="card p-4 transition hover:shadow-sm">
                  <div className="font-medium">{c.name}</div>
                  <div className="mt-1 text-xs text-amber-600">
                    {c.reports[0] ? `последний отчёт ${dateRu(c.reports[0].periodTo)}` : "отчётов ещё не было"}
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}

        <Section title="Мои задачи" icon={CalendarClock}>
          <Table head={["Задача", "Клиент", "Этап", "Дедлайн"]}>
            {tasks.map((t) => {
              const d = daysUntil(t.dueAt);
              return (
                <TaskModal
                  key={t.id}
                  task={t}
                  clients={clients.map((c) => ({ id: c.id, name: c.name }))}
                  users={users}
                  canEdit={user.role !== "CONTRACTOR"}
                  row={
                    <>
                      <td className="td font-medium">{t.title}</td>
                      <td className="td text-muted">{t.client?.name ?? "—"}</td>
                      <td className="td">{stagesFor(t.board)[t.stage] ?? t.stage}</td>
                      <td className={`td ${d !== null && d < 0 ? "text-red-600" : ""}`}>{dateRu(t.dueAt)}</td>
                    </>
                  }
                />
              );
            })}
            {tasks.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={4}>
                  Открытых задач нет
                </td>
              </tr>
            )}
          </Table>
        </Section>

        <Section title="Мои проекты" icon={Users}>
          <Table head={["Клиент", "Статус", "Последний CPL", "Цель CPL", "Задач", "Отчётов"]}>
            {clients.map((c) => {
              const last = c.reports[0];
              const m = last ? reportMetrics(last) : null;
              return (
                <ClientModal
                  key={c.id}
                  client={c}
                  users={users}
                  user={user}
                  row={
                    <>
                      <td className="td font-medium">{c.name}</td>
                      <td className="td">
                        <StatusBadge status={c.status} />
                      </td>
                      <td
                        className={`td ${m?.cplOk === false ? "text-red-600" : m?.cplOk ? "text-emerald-600" : ""}`}
                      >
                        {m?.cpl ? `${num(m.cpl)} сом` : "—"}
                      </td>
                      <td className="td text-muted">{c.targetCpl ? som(c.targetCpl) : "—"}</td>
                      <td className="td">{c.tasks.filter((t) => !t.done).length}</td>
                      <td className="td">{c.reports.length}</td>
                    </>
                  }
                />
              );
            })}
            {clients.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={6}>
                  Проекты пока не назначены
                </td>
              </tr>
            )}
          </Table>
        </Section>
      </div>
    );
  }

  /* ---------- дашборд владельца ---------- */
  await runRemindersIfDue();
  const shares = await getShares();

  const [clients, payments, targetologs, reports, goals] = await Promise.all([
    prisma.client.findMany({ include: { targetolog: true } }),
    prisma.payment.findMany({ include: { client: true, account: true } }),
    prisma.user.findMany({
      where: { role: "TARGETOLOG", active: true },
      include: { clientsAsTargetolog: true },
    }),
    prisma.adReport.findMany({ include: { client: true } }),
    prisma.goal.findMany({ where: { month: mk, clientId: null } }),
  ]);


  const [expenses, otherIncomes] = await Promise.all([
    prisma.expense.findMany({ where: { periodMonth: mk } }),
    prisma.income.findMany({ where: { periodMonth: mk } }),
  ]);
  const otherIncome = otherIncomes.reduce((s, i) => s + i.amount, 0);
  const expensePaid = expenses.filter((e) => e.status === "PAID").reduce((s, e) => s + e.amount, 0);
  const expensePlanned = expenses.filter((e) => e.status !== "PAID").reduce((s, e) => s + e.amount, 0);

  const activeStatuses = ["TEST", "ACTIVE", "RISK"];
  const active = clients.filter((c) => activeStatuses.includes(c.status));
  const monthPayments = payments.filter((p) => p.periodMonth === mk);
  const paid = monthPayments.filter((p) => p.status === "PAID");
  const revenue = paid.reduce((s, p) => s + p.amount, 0) + otherIncome;
  const pending = monthPayments.filter((p) => p.status !== "PAID");
  const debt = pending.reduce((s, p) => s + p.amount, 0);
  const planned = revenue + debt;
  const avgCheck = active.length ? active.reduce((s, c) => s + c.avgCheck, 0) / active.length : 0;
  const teamShare = paid.reduce((s, p) => s + p.execShare, 0);
  const reserve = paid.reduce((s, p) => s + p.reserve, 0);
  const ownerGross = paid.reduce((s, p) => s + p.ownerNet, 0) + otherIncome;

  const monthReports = reports.filter((r) => monthKey(r.periodTo) === mk);
  const leads = monthReports.reduce((s, r) => s + r.leads, 0);
  const adSpent = monthReports.reduce((s, r) => s + r.spent, 0);

  const [allTasks, statusDict] = await Promise.all([
    prisma.task.findMany({ where: { archivedAt: null }, select: { clientId: true, done: true, dueAt: true } }),
    dict("CLIENT_STATUS"),
  ]);

  // Сводка по каждому проекту: деньги, реклама, задачи и что требует внимания
  const today = new Date();
  const projectRows: ProjectRow[] = clients
    .filter((c) => activeStatuses.includes(c.status))
    .map((c) => {
      const cPays = monthPayments.filter((p) => p.clientId === c.id);
      const cReports = reports
        .filter((r) => r.clientId === c.id)
        .sort((a, b) => b.periodTo.getTime() - a.periodTo.getTime());
      const last = cReports[0] ?? null;
      const prev = cReports[1] ?? null;
      const cplOf = (r: typeof last) => (r && r.leads > 0 ? r.spent / r.leads : null);
      const cpl = cplOf(last);
      const prevCpl = cplOf(prev);
      const cTasks = allTasks.filter((t: { clientId: string | null; done: boolean; dueAt: Date | null }) => t.clientId === c.id && !t.done);
      const overdue = cTasks.filter((t: { dueAt: Date | null }) => isOverdue(t.dueAt)).length;
      const debt = cPays.filter((p) => p.status !== "PAID").reduce((s, p) => s + p.amount, 0);

      const risks: string[] = [];
      if (debt > 0) risks.push("долг");
      if (cpl !== null && c.targetCpl && cpl > c.targetCpl) risks.push("CPL выше цели");
      if (overdue > 0) risks.push("просрочки");
      if (!last || (today.getTime() - last.periodTo.getTime()) / 86400000 > 10)
        risks.push("нет отчёта");
      if (c.status === "RISK") risks.push("риск оттока");

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        statusLabel: statusDict.find((x: { key: string; name: string }) => x.key === c.status)?.name ?? c.status,
        statusColor: statusDict.find((x: { key: string; color?: string | null }) => x.key === c.status)?.color,
        targetologName: c.targetolog?.name ?? null,
        avgCheck: c.avgCheck,
        paidThisMonth: cPays.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0),
        debt,
        cpl,
        targetCpl: c.targetCpl,
        cplTrend:
          cpl === null || prevCpl === null
            ? null
            : cpl > prevCpl * 1.05
              ? ("up" as const)
              : cpl < prevCpl * 0.95
                ? ("down" as const)
                : ("flat" as const),
        openTasks: cTasks.length,
        overdueTasks: overdue,
        lastReportAt: last?.periodTo ?? null,
        risks,
      };
    })
    .sort((a, b) => b.risks.length - a.risks.length || b.paidThisMonth - a.paidThisMonth);
  const cpls = monthReports
    .map((r) => ({ name: r.client.name, ...reportMetrics(r) }))
    .filter((x) => x.cpl !== null)
    .sort((a, b) => (a.cpl ?? 0) - (b.cpl ?? 0));
  const best = cpls[0];

  const ownerNet = ownerGross - expensePaid;

  const goalFact: Record<string, number> = {
    REVENUE: revenue,
    PROFIT: ownerNet,
    LEADS: leads,
    CLIENTS: active.length,
    CPL: leads ? adSpent / leads : 0,
  };

  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthKey(d));
  }
  const chart = months.map((m) => {
    const [y, mm] = m.split("-").map(Number);
    const end = new Date(y, mm, 0, 23, 59);
    return {
      month: monthLabel(m),
      revenue: Math.round(
        payments.filter((p) => p.periodMonth === m && p.status === "PAID").reduce((s, p) => s + p.amount, 0)
      ),
      clients: clients.filter((c) => c.startedAt <= end && (!c.churnedAt || c.churnedAt > end)).length,
      churn: clients.filter((c) => c.churnedAt && monthKey(c.churnedAt) === m).length,
    };
  });

  const [openTasksCount, overdueTasks] = await Promise.all([
    prisma.task.count({ where: { done: false } }),
    prisma.task.count({ where: { done: false, dueAt: { lt: startOfToday() } } }),
  ]);

  const upcoming = payments
    .filter((p) => p.status !== "PAID")
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, 8);

  return (
    <div>
      <PageHeader title="Дашборд владельца" subtitle={`Система учёта агентства · ${monthLabel(mk)}`} />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Активные клиенты"
          value={String(active.length)}
          hint={`всего в базе: ${clients.length}`}
          icon={Users}
        />
        <Stat
          label="Выручка месяца"
          value={som(revenue)}
          hint={
            otherIncome
              ? `в т.ч. прочие приходы ${som(otherIncome)} · план ${som(planned)}`
              : `план с ожиданиями: ${som(planned)}`
          }
          tone="good"
          icon={Wallet}
        />
        <Stat label="Средний чек" value={som(avgCheck)} icon={Receipt} />
        <Stat
          label="Должны оплатить"
          value={som(debt)}
          hint={`${pending.length} платежей не закрыто`}
          tone={debt > 0 ? "bad" : "good"}
          icon={AlertCircle}
        />
        <Stat
          label="Доля команды"
          value={som(teamShare)}
          hint={`${Math.round(shares.targetologShare * 100)}% таргетологам`}
          icon={UsersRound}
        />
        <Stat
          label="Резерв на развитие"
          value={som(reserve)}
          hint={`${Math.round(shares.reserveShare * 100)}%`}
          icon={PiggyBank}
        />
        <Stat
          label="Расходы месяца"
          value={som(expensePaid)}
          hint={expensePlanned ? `ещё запланировано ${som(expensePlanned)}` : "запланированных нет"}
          tone={expensePaid ? "bad" : "good"}
          icon={TrendingDown}
        />
        <Stat
          label="Чистая прибыль владельца"
          value={som(ownerNet)}
          hint={`доля ${som(ownerGross)} − расходы ${som(expensePaid)}`}
          tone={ownerNet > 0 ? "good" : "bad"}
          icon={TrendingUp}
        />
      </div>

      <div className="mt-3 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Рентабельность"
          value={revenue ? `${Math.round((ownerNet / revenue) * 100)}%` : "—"}
          hint="чистая прибыль в выручке, после расходов"
          icon={Percent}
        />
        <Stat
          label="Заявок за месяц"
          value={num(leads)}
          hint={adSpent ? `средний CPL ${num(adSpent / (leads || 1))} сом` : "реклама не запускалась"}
          icon={Target}
        />
        <Stat
          label="Открытых проектов в цели"
          value={`${monthReports.filter((r) => reportMetrics(r).inTarget === true).length} из ${monthReports.length}`}
          hint="отчётов в цели по CPL"
          tone={
            monthReports.length &&
            monthReports.filter((r) => reportMetrics(r).inTarget === true).length >= monthReports.length / 2
              ? "good"
              : "warn"
          }
          icon={Flag}
        />
        <Stat
          label="Задач в работе"
          value={String(openTasksCount)}
          hint={overdueTasks ? `${overdueTasks} просрочено` : "просрочек нет"}
          tone={overdueTasks ? "bad" : "good"}
          icon={CalendarClock}
        />
      </div>

      <Section
        title="Все проекты"
        icon={Users}
        right={
          <span className="text-xs text-muted">
            {projectRows.filter((r) => r.risks.length > 0).length} требуют внимания
          </span>
        }
      >
        <ProjectsOverview rows={projectRows} />
      </Section>

      <Section title="Реклама за месяц" icon={Target}>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <MiniStat label="Заявок привлечено" value={num(leads)} />
          <MiniStat label="Потрачено на рекламу" value={som(adSpent)} />
          <MiniStat
            label="Средний CPL"
            value={leads ? `${num(adSpent / leads)} сом` : "—"}
            tone={leads ? "good" : "default"}
          />
          <MiniStat label="Самая дешёвая заявка" value={best?.cpl ? `${num(best.cpl)} сом` : "—"} tone="good" />
        </div>
        {best && (
          <div className="mt-2 text-xs text-muted">
            Лучший результат месяца: {best.name} — {num(best.cpl ?? 0)} сом за заявку
          </div>
        )}
      </Section>

      {goals.length > 0 && (
        <Section title="Цели месяца" icon={Flag}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((g) => {
              const fact = goalFact[g.metric] ?? 0;
              const reverse = g.metric === "CPL";
              const pct = g.target
                ? Math.round((reverse ? g.target / (fact || g.target) : fact / g.target) * 100)
                : 0;
              const done = reverse ? fact > 0 && fact <= g.target : fact >= g.target;
              const isMoney = ["REVENUE", "PROFIT", "CPL"].includes(g.metric);
              return (
                <div key={g.id} className="card p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{METRIC_LABEL[g.metric] ?? g.metric}</span>
                    <span className={done ? "text-emerald-600" : "text-muted"}>{Math.min(pct, 999)}%</span>
                  </div>
                  <div className="mt-1 text-lg font-semibold">
                    {isMoney ? som(fact) : num(fact)}{" "}
                    <span className="text-sm font-normal text-muted">
                      из {isMoney ? som(g.target) : num(g.target)}
                    </span>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-subtle">
                    <div
                      className={`h-2 rounded-full ${done ? "bg-emerald-500" : "bg-amber-500"}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  {g.comment && <div className="mt-2 text-xs text-muted">{g.comment}</div>}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Загрузка таргетологов" icon={UsersRound}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {targetologs.map((t) => {
            const load = t.clientsAsTargetolog.filter((c) => activeStatuses.includes(c.status)).length;
            const limit = t.projectLimit || shares.projectLimit;
            const pct = Math.min(100, Math.round((load / limit) * 100));
            const color = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
            const textColor = pct >= 100 ? "text-red-600" : pct >= 80 ? "text-amber-600" : "";
            return (
              <div key={t.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{t.name}</div>
                  <div className={`text-sm font-semibold ${textColor}`}>
                    {load} из {limit}
                  </div>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-subtle">
                  <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
                {pct >= 100 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                    <AlertCircle size={13} /> Перегрузка — не назначать новые проекты
                  </div>
                )}
                {pct >= 80 && pct < 100 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertCircle size={13} /> Близко к лимиту
                  </div>
                )}
              </div>
            );
          })}
          {targetologs.length === 0 && (
            <div className="card p-4 text-sm text-muted">
              Таргетологи не заведены —{" "}
              <Link href="/team" className="underline">
                добавить в команду
              </Link>
            </div>
          )}
        </div>
      </Section>

      <Section title="Динамика" icon={TrendingUp}>
        <RevenueChart data={chart} />
      </Section>

      <Section title="Ближайшие и просроченные оплаты" icon={Wallet}>
        <Table head={["Клиент", "Сумма", "Дата", "Статус", "Осталось"]}>
          {upcoming.map((p) => {
            const d = daysUntil(p.dueAt);
            return (
              <PaymentModal
                key={p.id}
                payment={p}
                clientName={p.client.name}
                clientId={p.clientId}
                isOwner
                row={
                  <>
                    <td className="td font-medium">{p.client.name}</td>
                    <td className="td">{som(p.amount)}</td>
                    <td className="td">{dateRu(p.dueAt)}</td>
                    <td className="td">
                      <StatusBadge status={p.client.status} />
                    </td>
                    <td
                      className={`td ${
                        d !== null && d < 0 ? "text-red-600" : d !== null && d <= 3 ? "text-amber-600" : ""
                      }`}
                    >
                      {d === null ? "—" : d < 0 ? `просрочено ${-d} дн.` : `${d} дн.`}
                    </td>
                  </>
                }
              />
            );
          })}
          {upcoming.length === 0 && (
            <tr>
              <td className="td text-muted" colSpan={5}>
                Незакрытых оплат нет
              </td>
            </tr>
          )}
        </Table>
      </Section>
    </div>
  );
}
