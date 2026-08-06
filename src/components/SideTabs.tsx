"use client";

import { useState } from "react";
import {
  LayoutGrid,
  Wallet,
  TrendingUp,
  KanbanSquare,
  Settings2,
  Link2,
  Users,
  Target,
  type LucideIcon,
} from "lucide-react";

/**
 * Иконки берём по имени: сами компоненты-иконки — функции,
 * а из серверного компонента в клиентский можно передавать только данные.
 */
const ICONS: Record<string, LucideIcon> = {
  overview: LayoutGrid,
  payments: Wallet,
  reports: TrendingUp,
  tasks: KanbanSquare,
  settings: Settings2,
  links: Link2,
  team: Users,
  growth: Target,
};

export type SideTab = {
  key: string;
  label: string;
  icon: keyof typeof ICONS | string;
  count?: number;
  content: React.ReactNode;
};

/**
 * Вертикальные вкладки-иконки слева. В модалке клиента вместо длинной
 * простыни: содержимое переключается, окно не растёт вниз.
 * На узком экране лента сворачивается в горизонтальную.
 */
export default function SideTabs({ tabs }: { tabs: SideTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className="flex gap-4 max-sm:flex-col">
      <nav className="flex shrink-0 gap-1 sm:w-[52px] sm:flex-col max-sm:overflow-x-auto max-sm:pb-1">
        {tabs.map((t) => {
          const Icon = ICONS[t.icon] ?? LayoutGrid;
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              title={t.label}
              aria-label={t.label}
              className={`relative flex shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[10px] transition ${
                isActive
                  ? "accent-soft accent-text font-medium"
                  : "text-muted hover:bg-subtle hover:text-zinc-900"
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="leading-none">{t.label}</span>
              {t.count !== undefined && t.count > 0 && (
                <span
                  className={`absolute right-0.5 top-0.5 min-w-[15px] rounded-full px-1 text-[9px] leading-[15px] ${
                    isActive ? "bg-[var(--accent)] text-white" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="min-w-0 flex-1">{current?.content}</div>
    </div>
  );
}
