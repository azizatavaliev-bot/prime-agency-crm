import { prisma } from "./prisma";
import { getShares } from "./finance";

/**
 * Ведомость зарплат за месяц.
 *
 * Итог человека = фикс-оклад + доли со всех его проектов + премии.
 *
 * Доли считаются по ставке, действовавшей в этом месяце (история ставок),
 * а не по текущей: иначе повышение ставки переписывало бы закрытые месяцы.
 * Уже выплаченный месяц берётся из снимка Payout и не пересчитывается вовсе.
 */

export type RateSource = "history" | "member" | "defaults";

export type ProjectLine = {
  clientId: string;
  clientName: string;
  role: string;
  rateType: string;
  rate: number;
  /** С какой суммы считали процент (оплаченные платежи клиента за месяц). */
  paidBase: number;
  amount: number;
  rateSource: RateSource;
};

export type BonusLine = {
  id: string | null; // null — премия по правилу, ещё не зафиксирована
  amount: number;
  reason: string;
  clientName?: string | null;
  auto: boolean;
};

export type PayrollLine = {
  userId: string;
  name: string;
  role: string;
  base: number;
  projects: ProjectLine[];
  projectShare: number;
  bonuses: BonusLine[];
  bonusTotal: number;
  total: number;
  /** Заполнено, если месяц уже выплачен — тогда цифры из снимка. */
  paid: { at: Date; amount: number; expenseId: string | null } | null;
};

/** Какие виды платежей относятся к роли на проекте. */
function kindsForRole(role: string): string[] {
  return role === "CONTRACTOR" ? ["SITE", "BOT", "VIDEO"] : ["SUBSCRIPTION"];
}

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) };
}

/**
 * Ставка участника, действовавшая в указанном месяце.
 * Ищем последнюю запись истории с fromMonth <= month; если истории нет —
 * текущая ставка участника; если и её нет — общие настройки агентства.
 */
export function effectiveRate(
  month: string,
  role: string,
  history: { role: string; rateType: string; rate: number; fromMonth: string }[],
  current: { rateType: string; rate: number } | null,
  defaults: { targetologShare: number; devShare: number }
): { rateType: string; rate: number; source: RateSource } {
  const applicable = history
    .filter((h) => h.role === role && h.fromMonth <= month)
    .sort((a, b) => b.fromMonth.localeCompare(a.fromMonth))[0];
  if (applicable) return { rateType: applicable.rateType, rate: applicable.rate, source: "history" };
  if (current && current.rate > 0)
    return { rateType: current.rateType, rate: current.rate, source: "member" };
  // Аккаунт-менеджеру общей доли не предусмотрено — только своя ставка.
  if (role === "ACCOUNT") return { rateType: "PERCENT", rate: 0, source: "defaults" };
  const pct = role === "CONTRACTOR" ? defaults.devShare : defaults.targetologShare;
  return { rateType: "PERCENT", rate: pct * 100, source: "defaults" };
}

export function lineAmount(rateType: string, rate: number, paidBase: number): number {
  if (rate <= 0) return 0;
  if (rateType === "FIXED") return Math.round(rate);
  return Math.round((paidBase * rate) / 100);
}

/** Премии по правилам: считаются из фактических данных месяца. */
async function autoBonuses(
  month: string,
  lines: Map<string, { role: string; projects: ProjectLine[]; projectShare: number }>
): Promise<Map<string, BonusLine[]>> {
  const out = new Map<string, BonusLine[]>();
  const rules = await prisma.bonusRule.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });
  if (rules.length === 0) return out;

  const { from, to } = monthBounds(month);
  const add = (userId: string, line: BonusLine) => {
    if (line.amount <= 0) return;
    const arr = out.get(userId) ?? [];
    arr.push(line);
    out.set(userId, arr);
  };

  // Данные подтягиваем один раз на все правила, а не по правилу на запрос.
  const needsReports = rules.some((r) => r.metric === "CPL_TARGET");
  const needsTasks = rules.some((r) => r.metric === "TASKS_ONTIME");
  const needsRevenue = rules.some((r) => r.metric === "REVENUE_PLAN");

  const reports = needsReports
    ? await prisma.adReport.findMany({
        where: { periodFrom: { gte: from, lt: to } },
        select: { clientId: true, spent: true, leads: true, targetCpl: true },
      })
    : [];
  const tasks = needsTasks
    ? await prisma.task.findMany({
        where: { done: true, doneAt: { gte: from, lt: to } },
        select: { assigneeId: true, dueAt: true, doneAt: true },
      })
    : [];

  let revenueDone = false;
  if (needsRevenue) {
    const goal = await prisma.goal.findFirst({
      where: { clientId: null, month, metric: "REVENUE" },
    });
    if (goal && goal.target > 0) {
      const agg = await prisma.payment.aggregate({
        where: { status: "PAID", periodMonth: month },
        _sum: { amount: true },
      });
      const fact = agg._sum.amount ?? 0;
      revenueDone = (fact / goal.target) * 100 >= 100;
    }
  }

  // CPL по клиенту за месяц — из всех отчётов клиента, а не по последнему.
  const cplByClient = new Map<string, { spent: number; leads: number; target: number }>();
  for (const r of reports) {
    const cur = cplByClient.get(r.clientId) ?? { spent: 0, leads: 0, target: r.targetCpl };
    cur.spent += r.spent;
    cur.leads += r.leads;
    cur.target = r.targetCpl || cur.target;
    cplByClient.set(r.clientId, cur);
  }

  const ontimeByUser = new Map<string, { total: number; ontime: number }>();
  for (const t of tasks) {
    if (!t.assigneeId) continue;
    const cur = ontimeByUser.get(t.assigneeId) ?? { total: 0, ontime: 0 };
    cur.total++;
    // Без дедлайна судить о срыве нельзя — считаем такие выполненными в срок.
    if (!t.dueAt || !t.doneAt || t.doneAt <= t.dueAt) cur.ontime++;
    ontimeByUser.set(t.assigneeId, cur);
  }

  for (const [userId, info] of lines) {
    for (const rule of rules) {
      if (rule.role && rule.role !== info.role) continue;

      const sum = (base: number) =>
        rule.amountType === "PERCENT" ? Math.round((base * rule.amount) / 100) : Math.round(rule.amount);

      if (rule.metric === "CPL_TARGET") {
        for (const p of info.projects) {
          const c = cplByClient.get(p.clientId);
          if (!c || c.leads === 0 || !c.target) continue;
          const cpl = c.spent / c.leads;
          // threshold здесь — допуск в % к целевой цене заявки (0 = строго не выше).
          if (cpl > c.target * (1 + rule.threshold / 100)) continue;
          add(userId, {
            id: null,
            amount: sum(p.amount),
            reason: `${rule.name} · CPL ${Math.round(cpl)} ≤ ${Math.round(c.target)}`,
            clientName: p.clientName,
            auto: true,
          });
          if (!rule.perClient) break;
        }
      }

      if (rule.metric === "TASKS_ONTIME") {
        const t = ontimeByUser.get(userId);
        if (!t || t.total === 0) continue;
        const pct = (t.ontime / t.total) * 100;
        if (pct < rule.threshold) continue;
        add(userId, {
          id: null,
          amount: sum(info.projectShare),
          reason: `${rule.name} · ${Math.round(pct)}% задач в срок (${t.ontime}/${t.total})`,
          auto: true,
        });
      }

      if (rule.metric === "REVENUE_PLAN" && revenueDone) {
        add(userId, {
          id: null,
          amount: sum(info.projectShare),
          reason: `${rule.name} · план по выручке выполнен`,
          auto: true,
        });
      }

      if (rule.metric === "CLIENT_RETAINED") {
        for (const p of info.projects) {
          add(userId, {
            id: null,
            amount: sum(p.amount),
            reason: `${rule.name} · ${p.clientName}`,
            clientName: p.clientName,
            auto: true,
          });
          if (!rule.perClient) break;
        }
      }
    }
  }
  return out;
}

/** Полная ведомость за месяц. */
export async function payrollFor(month: string): Promise<PayrollLine[]> {
  const defaults = await getShares();
  const { from, to } = monthBounds(month);

  const [users, members, history, payments, manualBonuses, payouts, retainedClients] =
    await Promise.all([
      prisma.user.findMany({
        where: { active: true, role: { not: "OWNER" } },
        orderBy: { name: "asc" },
        select: { id: true, name: true, role: true, baseSalary: true },
      }),
      prisma.clientMember.findMany({
        select: {
          clientId: true,
          userId: true,
          role: true,
          rateType: true,
          rate: true,
          client: { select: { id: true, name: true, status: true } },
        },
      }),
      prisma.memberRate.findMany({
        select: { clientId: true, userId: true, role: true, rateType: true, rate: true, fromMonth: true },
      }),
      prisma.payment.findMany({
        where: { status: "PAID", periodMonth: month },
        select: { clientId: true, kind: true, amount: true },
      }),
      prisma.bonus.findMany({
        where: { month },
        select: { id: true, userId: true, amount: true, reason: true, client: { select: { name: true } } },
      }),
      prisma.payout.findMany({ where: { month } }),
      prisma.client.findMany({
        where: { status: { in: ["ACTIVE", "TEST"] } },
        select: { id: true },
      }),
    ]);

  // Оплаченная база по клиенту и виду платежа: с неё считается процент.
  const paidBase = new Map<string, number>();
  for (const p of payments) {
    const key = `${p.clientId}|${p.kind}`;
    paidBase.set(key, (paidBase.get(key) ?? 0) + p.amount);
  }
  const baseFor = (clientId: string, role: string) =>
    kindsForRole(role).reduce((acc, k) => acc + (paidBase.get(`${clientId}|${k}`) ?? 0), 0);

  const activeIds = new Set(retainedClients.map((c) => c.id));
  const payoutByUser = new Map(payouts.map((p) => [p.userId, p]));

  const info = new Map<string, { role: string; projects: ProjectLine[]; projectShare: number }>();

  for (const u of users) {
    const mine = members.filter((m) => m.userId === u.id);
    const projects: ProjectLine[] = [];
    for (const m of mine) {
      const hist = history.filter((h) => h.clientId === m.clientId && h.userId === u.id);
      const { rateType, rate, source } = effectiveRate(
        month,
        m.role,
        hist,
        { rateType: m.rateType, rate: m.rate },
        defaults
      );
      const pBase = baseFor(m.clientId, m.role);
      // Фикс платим только за месяцы, когда проект живой: иначе ушедший
      // клиент годами тянул бы фикс в ведомости.
      const amount =
        rateType === "FIXED" && !activeIds.has(m.clientId) && pBase === 0
          ? 0
          : lineAmount(rateType, rate, pBase);
      if (amount === 0 && pBase === 0) continue;
      projects.push({
        clientId: m.clientId,
        clientName: m.client.name,
        role: m.role,
        rateType,
        rate,
        paidBase: pBase,
        amount,
        rateSource: source,
      });
    }
    const projectShare = projects.reduce((s, p) => s + p.amount, 0);
    info.set(u.id, { role: u.role, projects, projectShare });
  }

  const auto = await autoBonuses(month, info);

  return users.map((u) => {
    const i = info.get(u.id)!;
    const manual: BonusLine[] = manualBonuses
      .filter((b) => b.userId === u.id)
      .map((b) => ({
        id: b.id,
        amount: b.amount,
        reason: b.reason,
        clientName: b.client?.name ?? null,
        auto: false,
      }));
    const bonuses = [...manual, ...(auto.get(u.id) ?? [])];
    const bonusTotal = bonuses.reduce((s, b) => s + b.amount, 0);
    const paidRow = payoutByUser.get(u.id);

    // Выплаченный месяц — снимок: ставки могли измениться уже после выплаты.
    if (paidRow)
      return {
        userId: u.id,
        name: u.name,
        role: u.role,
        base: paidRow.base,
        projects: i.projects,
        projectShare: paidRow.projectShare,
        bonuses,
        bonusTotal: paidRow.bonus,
        total: paidRow.amount,
        paid: { at: paidRow.paidAt, amount: paidRow.amount, expenseId: paidRow.expenseId },
      };

    return {
      userId: u.id,
      name: u.name,
      role: u.role,
      base: Math.round(u.baseSalary),
      projects: i.projects,
      projectShare: i.projectShare,
      bonuses,
      bonusTotal,
      total: Math.round(u.baseSalary) + i.projectShare + bonusTotal,
      paid: null,
    };
  });
}
