import type { LucideIcon } from "lucide-react";

/**
 * Смысловой блок внутри формы. Длинная простыня из 20 полей читается тяжело —
 * сгруппированные блоки с заголовком и пояснением заполняются заметно быстрее.
 */
export default function FormSection({
  title,
  hint,
  icon: Icon,
  children,
  columns = 2,
}: {
  title: string;
  hint?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
}) {
  const cols = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" }[columns];
  return (
    <section className="rounded-2xl border border-zinc-200 p-4">
      <div className="mb-3 flex items-start gap-2.5">
        {Icon && (
          <span className="accent-soft accent-text flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
            <Icon size={14} strokeWidth={2} />
          </span>
        )}
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight">{title}</div>
          {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
        </div>
      </div>
      <div className={`grid gap-4 ${cols}`}>{children}</div>
    </section>
  );
}
