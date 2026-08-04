import { DEFAULTS } from "./constants";
import { prisma } from "./prisma";

export type Shares = {
  targetologShare: number;
  devShare: number;
  reserveShare: number;
  projectLimit: number;
};

export type NotifySettings = {
  paymentDays: number; // за сколько дней предупреждать об оплате
  reportDays: number; // через сколько дней без отчёта напоминать
  taskDays: number; // за сколько дней до дедлайна
  expenseDays: number; // за сколько дней до планового расхода
  cplAlert: boolean; // алерт при превышении CPL
  notifyOwner: boolean;
  notifyTeam: boolean;
};

export async function getNotify(): Promise<NotifySettings> {
  const rows = await prisma.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const num = (k: string, d: number) => (map[k] !== undefined ? Number(map[k]) : d);
  const bool = (k: string, d: boolean) => (map[k] !== undefined ? map[k] === "1" : d);
  return {
    paymentDays: num("notifyPaymentDays", 3),
    reportDays: num("notifyReportDays", 7),
    taskDays: num("notifyTaskDays", 1),
    expenseDays: num("notifyExpenseDays", 2),
    cplAlert: bool("notifyCpl", true),
    notifyOwner: bool("notifyOwner", true),
    notifyTeam: bool("notifyTeam", true),
  };
}

/** Курс доллара для рекламных расходов, вводимых в USD. Настраивается в Настройках. */
export async function getUsdRate(): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key: "usdRate" } });
  const v = Number(row?.value);
  return Number.isFinite(v) && v > 0 ? v : DEFAULTS.usdRate;
}

export async function getShares(): Promise<Shares> {
  const rows = await prisma.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, Number(r.value)]));
  return {
    targetologShare: map.targetologShare ?? DEFAULTS.targetologShare,
    devShare: map.devShare ?? DEFAULTS.devShare,
    reserveShare: map.reserveShare ?? DEFAULTS.reserveShare,
    projectLimit: map.projectLimit ?? DEFAULTS.projectLimit,
  };
}

/** Разбивка суммы: доля исполнителя, резерв, чистая прибыль владельца. */
export function split(kind: string, amount: number, s: Shares) {
  const execRate = kind === "SUBSCRIPTION" ? s.targetologShare : s.devShare;
  const execShare = Math.round(amount * execRate);
  const reserve = Math.round(amount * s.reserveShare);
  const ownerNet = amount - execShare - reserve;
  return { execShare, reserve, ownerNet };
}

/** Оценка CPL/CPA и попадание в цель. */
export function reportMetrics(r: {
  spent: number;
  leads: number;
  actions: number;
  targetCpl: number;
  targetCpa: number | null;
}) {
  const cpl = r.leads > 0 ? r.spent / r.leads : null;
  const cpa = r.actions > 0 ? r.spent / r.actions : null;
  const cplOk = cpl === null ? null : cpl <= r.targetCpl;
  const cpaOk = cpa === null || !r.targetCpa ? null : cpa <= r.targetCpa;
  const inTarget = cplOk === null ? null : cplOk && cpaOk !== false;
  return { cpl, cpa, cplOk, cpaOk, inTarget };
}
