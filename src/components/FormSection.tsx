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
    <section className="rounded-2xl border border-zinc-200 p-5">
      <div className="mb-4 flex items-start gap-3">
        {Icon && (
          <span className="accent-soft accent-text flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
            <Icon size={15} strokeWidth={2} />
          </span>
        )}
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight">{title}</div>
          {hint && <div className="mt-1 text-xs leading-relaxed text-muted">{hint}</div>}
        </div>
      </div>
      {/* fill-last-row: часть полей условная (клиент, дата факт. оплаты), и при
          нечётном их числе последнее висело половинкой — теперь дотягивается */}
      <div className={`grid fill-last-row gap-x-4 gap-y-4 ${cols}`}>{children}</div>
    </section>
  );
}
