import Link from "next/link";
import { Users, HandCoins, type LucideIcon } from "lucide-react";

const TABS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "members", label: "Сотрудники", icon: Users },
  { key: "payroll", label: "Зарплаты", icon: HandCoins },
];

/**
 * Вкладки раздела «Команда». «Зарплаты» раньше были отдельным пунктом меню —
 * тот же вопрос («сколько людям платим»), что и список команды, только с
 * другого угла. Ведомость видит только владелец: доли и оклады — чужие деньги.
 */
export default function TeamTabs({ active, showPayroll = false }: { active: string; showPayroll?: boolean }) {
  const tabs = showPayroll ? TABS : TABS.filter((t) => t.key !== "payroll");
  if (tabs.length < 2) return null;
  return (
    <div className="mb-5 flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.key;
        return (
          <Link
            key={t.key}
            href={t.key === "members" ? "/team" : `/team?tab=${t.key}`}
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
