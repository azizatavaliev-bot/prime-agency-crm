import "server-only";
import { prisma } from "./prisma";
import { monthKey } from "./format";

export type AccountBalance = {
  id: string;
  name: string;
  kind: string;
  opening: number;
  minBalance: number | null;
  active: boolean;
  note: string | null;
  income: number; // приходы (оплаты клиентов + прочие доходы)
  expense: number; // расходы
  transferIn: number;
  transferOut: number;
  balance: number;
  low: boolean; // ниже минимального остатка
};

/**
 * Баланс считается из операций, а не хранится — так не бывает рассинхрона
 * (тот же подход, что в UnityFinance и FADAMOS).
 */
export async function accountBalances(): Promise<AccountBalance[]> {
  const [accounts, payments, incomes, expenses, transfers] = await Promise.all([
    prisma.account.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.payment.groupBy({
      by: ["accountId"],
      where: { status: "PAID", accountId: { not: null } },
      _sum: { amount: true },
    }),
    prisma.income.groupBy({
      by: ["accountId"],
      where: { accountId: { not: null } },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["accountId"],
      where: { status: "PAID", accountId: { not: null } },
      _sum: { amount: true },
    }),
    prisma.transfer.findMany(),
  ]);

  const sum = (rows: { accountId: string | null; _sum: { amount: number | null } }[], id: string) =>
    rows.find((r) => r.accountId === id)?._sum.amount ?? 0;

  return accounts.map((a) => {
    const income = sum(payments, a.id) + sum(incomes, a.id);
    const expense = sum(expenses, a.id);
    const transferIn = transfers.filter((t) => t.toAccountId === a.id).reduce((s, t) => s + t.amount, 0);
    const transferOut = transfers.filter((t) => t.fromAccountId === a.id).reduce((s, t) => s + t.amount, 0);
    const balance = a.opening + income + transferIn - expense - transferOut;
    return {
      id: a.id,
      name: a.name,
      kind: a.kind,
      opening: a.opening,
      minBalance: a.minBalance,
      active: a.active,
      note: a.note,
      income,
      expense,
      transferIn,
      transferOut,
      balance,
      low: a.minBalance !== null && balance < a.minBalance,
    };
  });
}

export type LedgerRow = {
  id: string;
  date: Date;
  kind: "PAYMENT" | "INCOME" | "EXPENSE" | "TRANSFER";
  direction: "IN" | "OUT" | "MOVE";
  title: string;
  category: string | null;
  amount: number;
  accountName: string | null;
  toAccountName?: string | null;
  clientName?: string | null;
  userName?: string | null;
  status: string;
  link?: string;
};

/** Единый журнал операций за месяц: оплаты клиентов, прочие приходы, расходы, переводы. */
export async function ledger(month = monthKey(), accountId?: string): Promise<LedgerRow[]> {
  const accFilter = accountId ? { accountId } : {};
  const [payments, incomes, expenses, transfers] = await Promise.all([
    prisma.payment.findMany({
      where: { periodMonth: month, ...accFilter },
      include: { client: true, account: true },
    }),
    prisma.income.findMany({
      where: { periodMonth: month, ...accFilter },
      include: { client: true, account: true },
    }),
    prisma.expense.findMany({
      where: { periodMonth: month, ...accFilter },
      include: { client: true, account: true, user: true },
    }),
    prisma.transfer.findMany({
      where: {
        periodMonth: month,
        ...(accountId ? { OR: [{ fromAccountId: accountId }, { toAccountId: accountId }] } : {}),
      },
      include: { fromAccount: true, toAccount: true },
    }),
  ]);

  const rows: LedgerRow[] = [
    ...payments.map((p) => ({
      id: p.id,
      date: p.paidAt ?? p.dueAt,
      kind: "PAYMENT" as const,
      direction: "IN" as const,
      title: `Оплата клиента — ${p.client.name}`,
      category: p.kind,
      amount: p.amount,
      accountName: p.account?.name ?? null,
      clientName: p.client.name,
      status: p.status,
      link: `/clients/${p.clientId}`,
    })),
    ...incomes.map((i) => ({
      id: i.id,
      date: i.receivedAt,
      kind: "INCOME" as const,
      direction: "IN" as const,
      title: i.title,
      category: i.category,
      amount: i.amount,
      accountName: i.account?.name ?? null,
      clientName: i.client?.name ?? null,
      status: "PAID",
    })),
    ...expenses.map((e) => ({
      id: e.id,
      date: e.spentAt,
      kind: "EXPENSE" as const,
      direction: "OUT" as const,
      title: e.title,
      category: e.category,
      amount: e.amount,
      accountName: e.account?.name ?? null,
      clientName: e.client?.name ?? null,
      userName: e.user?.name ?? null,
      status: e.status,
    })),
    ...transfers.map((t) => ({
      id: t.id,
      date: t.madeAt,
      kind: "TRANSFER" as const,
      direction: "MOVE" as const,
      title: `Перевод: ${t.fromAccount.name} → ${t.toAccount.name}`,
      category: null,
      amount: t.amount,
      accountName: t.fromAccount.name,
      toAccountName: t.toAccount.name,
      status: "PAID",
    })),
  ];

  return rows.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** Отчёт о движении денег за месяц. */
export async function cashflow(month = monthKey()) {
  const rows = await ledger(month);
  const income = rows
    .filter((r) => r.direction === "IN" && r.status === "PAID")
    .reduce((s, r) => s + r.amount, 0);
  const expense = rows
    .filter((r) => r.direction === "OUT" && r.status === "PAID")
    .reduce((s, r) => s + r.amount, 0);
  const plannedIn = rows
    .filter((r) => r.direction === "IN" && r.status !== "PAID")
    .reduce((s, r) => s + r.amount, 0);
  const plannedOut = rows
    .filter((r) => r.direction === "OUT" && r.status !== "PAID")
    .reduce((s, r) => s + r.amount, 0);
  return { income, expense, profit: income - expense, plannedIn, plannedOut, rows };
}
