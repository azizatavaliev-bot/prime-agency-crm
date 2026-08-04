/** Логика дня оплаты: когда клиент должен заплатить и сколько дней осталось. */

/** Ближайшая дата оплаты по числу месяца (учитывает короткие месяцы). */
export function nextPaymentDate(paymentDay: number | null | undefined, from = new Date()): Date | null {
  if (!paymentDay) return null;
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const inMonth = (y: number, m: number) => {
    const lastDay = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(paymentDay, lastDay));
  };
  const thisMonth = inMonth(today.getFullYear(), today.getMonth());
  return thisMonth >= today ? thisMonth : inMonth(today.getFullYear(), today.getMonth() + 1);
}

/** Сколько дней до ближайшей оплаты (999 — день не задан). */
export function daysToPayment(paymentDay: number | null | undefined, from = new Date()): number {
  const date = nextPaymentDate(paymentDay, from);
  if (!date) return 999;
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

/** Подпись и цвет чипа: сегодня / завтра / через N дней. */
export function paymentChip(paymentDay: number | null | undefined, from = new Date()) {
  if (!paymentDay) return null;
  const days = daysToPayment(paymentDay, from);
  const label = days === 0 ? "сегодня" : days === 1 ? "завтра" : `через ${days} дн.`;
  const tone: "bad" | "warn" | "good" = days <= 3 ? "bad" : days <= 7 ? "warn" : "good";
  const color =
    tone === "bad"
      ? "bg-red-100 text-red-700 border-red-200"
      : tone === "warn"
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-emerald-100 text-emerald-700 border-emerald-200";
  return { days, label, tone, color, text: `${paymentDay} числа · ${label}` };
}

/** Сколько дней осталось до конца договора (null — не задан). */
export function daysToContractEnd(contractEnd: Date | null | undefined, from = new Date()): number | null {
  if (!contractEnd) return null;
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((contractEnd.getTime() - today.getTime()) / 86400000);
}
