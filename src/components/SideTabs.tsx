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
 * Горизонтальные вкладки сверху. Содержимое переключается под лентой,
 * лента прокручивается по горизонтали на узком экране.
 */
export default function SideTabs({ tabs, large = false }: { tabs: SideTab[]; large?: boolean }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className={`flex flex-col gap-4 ${large ? "modal-tabs-lg" : ""}`}>
      <nav className="flex shrink-0 gap-2.5 overflow-x-auto pb-1">
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
              className={`modal-tab relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs transition ${
                isActive
                  ? "is-active accent-soft accent-text font-medium"
                  : "text-muted hover:bg-subtle hover:text-zinc-900"
              }`}
            >
              <Icon size={large ? 18 : 16} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="leading-none">{t.label}</span>
              {t.count !== undefined && t.count > 0 && (
                <span
                  className={`min-w-[15px] rounded-full px-1 text-[9px] leading-[15px] ${
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
