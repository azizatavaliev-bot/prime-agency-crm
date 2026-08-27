export function som(value: number | null | undefined): string {
  const v = Math.round(value ?? 0);
  return `${v.toLocaleString("ru-RU").replace(/ /g, " ")} сом`;
}

/**
 * Отчёт хранит targetCpl как обязательное число (в схеме нет null) — если у
 * клиента порог не задан, actions.ts подставляет туда 999999 как «условно
 * без потолка». Показывать это число как есть («999 999 сом») бессмысленно —
 * везде, где рендерим targetCpl отчёта, используем эту функцию, а не som().
 */
export function targetCplLabel(value: number | null | undefined): string {
  if (value === null || value === undefined || value >= 999999) return "—";
  return som(value);
}

export function num(value: number | null | undefined, digits = 0): string {
  return (value ?? 0).toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function dateRu(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const names = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${names[m - 1]} ${y}`;
}

export function daysUntil(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

export function toInputDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  // Через toISOString() дата, созданная локально, уезжала на день назад
  // (в UTC+6 полночь 5-го — это 4-е 18:00 UTC), и каждое пересохранение сдвигало её ещё раз.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Короткая сумма для узких плиток статистики. В ряду из восьми показателей
 * «250 000 сом» не помещается и обрезается на «250 000 со» — здесь тот же
 * смысл в трёх символах. Для точных сумм в таблицах и карточках — som().
 */
export function somShort(value: number | null | undefined): string {
  const v = Math.round(value ?? 0);
  if (Math.abs(v) >= 1_000_000) {
    const mln = v / 1_000_000;
    return `${num(mln, mln >= 10 ? 0 : 1)} млн`;
  }
  if (Math.abs(v) >= 10_000) return `${num(Math.round(v / 1000))} тыс`;
  return som(v);
}
