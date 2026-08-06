import type { LucideIcon } from "lucide-react";

/**
 * Крупная денежная карточка обзора: сумма и разбивка бейджами под ней.
 * Цветная заливка помогает отличить доход от расхода боковым зрением.
 */
export default function BigMoney({
  label,
  value,
  hint,
  chips,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  chips?: { label: string; value: string }[];
  tone: "income" | "expense" | "balance";
  icon: LucideIcon;
}) {
  const styles = {
    income: {
      card: "border-sky-200 bg-sky-50/60",
      title: "text-sky-700",
      value: "text-sky-700",
      icon: "text-sky-400",
      chip: "bg-white/70 text-sky-800 border-sky-200",
    },
    expense: {
      card: "border-red-200 bg-red-50/60",
      title: "text-red-700",
      value: "text-red-600",
      icon: "text-red-400",
      chip: "bg-white/70 text-red-800 border-red-200",
    },
    balance: {
      card: "border-emerald-200 bg-emerald-50/60",
      title: "text-emerald-700",
      value: "text-emerald-700",
      icon: "text-emerald-400",
      chip: "bg-white/70 text-emerald-800 border-emerald-200",
    },
  }[tone];

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 ${styles.card}`}>
      <Icon size={22} className={`absolute right-4 top-4 ${styles.icon}`} strokeWidth={1.8} />
      <div className={`text-[11px] font-semibold uppercase tracking-wider ${styles.title}`}>
        {label}
      </div>
      <div className={`mt-2 text-3xl font-semibold tracking-tight ${styles.value}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
      {chips && chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c.label}
              className={`rounded-lg border px-2 py-1 text-[11px] ${styles.chip}`}
            >
              {c.value} <span className="opacity-70">· {c.label}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
