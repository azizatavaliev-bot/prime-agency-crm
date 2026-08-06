import Link from "next/link";
import { BarChart3, Target, FileText, CalendarDays, type LucideIcon } from "lucide-react";

const TABS: { key: string; label: string; icon: LucideIcon; hint: string }[] = [
  { key: "analytics", label: "Аналитика", icon: BarChart3, hint: "сводка по всей рекламе" },
  { key: "clients", label: "По клиентам", icon: Target, hint: "CPL и связки по проектам" },
  { key: "daily", label: "Ежедневные", icon: FileText, hint: "открут за день" },
  { key: "calendar", label: "Календарь", icon: CalendarDays, hint: "заполненность по дням" },
];

/** Вкладки раздела «Маркетинг»: реклама агентства и отчёты по проектам в одном месте. */
export default function MarketingTabs({ active }: { active: string }) {
  return (
    <div className="mb-5 flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
      {TABS.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.key;
        return (
          <Link
            key={t.key}
            href={t.key === "analytics" ? "/marketing" : `/marketing?tab=${t.key}`}
            title={t.hint}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition ${
              isActive
                ? "accent-gradient font-medium text-white"
                : "bg-subtle text-muted hover:text-zinc-900"
            }`}
          >
            <Icon size={15} /> {t.label}
          </Link>
        );
      })}
    </div>
  );
}
