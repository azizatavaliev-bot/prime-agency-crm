"use client";

import { useState } from "react";
import {
  LayoutGrid,
  KanbanSquare,
  Wallet,
  TrendingUp,
  Link2,
  Settings2,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

export type ClientTabKey = "overview" | "tasks" | "payments" | "reports" | "links" | "notes" | "settings";

const ALL: { key: ClientTabKey; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Обзор", icon: LayoutGrid },
  { key: "tasks", label: "Задачи", icon: KanbanSquare },
  { key: "payments", label: "Оплаты", icon: Wallet },
  { key: "reports", label: "Отчёты", icon: TrendingUp },
  { key: "links", label: "Ссылки", icon: Link2 },
  { key: "notes", label: "Заметки", icon: MessageSquare },
  { key: "settings", label: "Настройки", icon: Settings2 },
];

/**
 * Вкладки карточки клиента. Панели уже отрисованы сервером и просто
 * скрываются — так переключение мгновенное, без повторных запросов.
 */
export default function ClientTabs({
  visible,
  counts,
  panels,
}: {
  visible: ClientTabKey[];
  counts?: Partial<Record<ClientTabKey, number>>;
  panels: Partial<Record<ClientTabKey, React.ReactNode>>;
}) {
  const tabs = ALL.filter((t) => visible.includes(t.key));
  const [active, setActive] = useState<ClientTabKey>(tabs[0]?.key ?? "overview");

  return (
    <div>
      <div className="mb-4 -mx-4 flex gap-3 overflow-x-auto border-b border-zinc-200 px-4 pb-3 sm:mx-0 sm:flex-wrap sm:px-0">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.key;
          const count = counts?.[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition ${
                isActive
                  ? "accent-gradient border-transparent font-medium text-white"
                  : "border-zinc-200 bg-subtle text-muted hover:border-zinc-300 hover:text-zinc-900"
              }`}
            >
              <Icon size={15} /> {t.label}
              {count !== undefined && count > 0 && (
                <span
                  className={`rounded-md px-1.5 text-[11px] ${
                    isActive ? "bg-white/25" : "bg-white text-muted"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tabs.map((t) => (
        <div key={t.key} hidden={active !== t.key}>
          {panels[t.key]}
        </div>
      ))}
    </div>
  );
}
