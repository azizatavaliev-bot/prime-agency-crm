import Link from "next/link";
import { LayoutGrid, Wallet, TrendingDown, Landmark, PieChart, type LucideIcon } from "lucide-react";

const TABS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Обзор", icon: LayoutGrid },
  { key: "payments", label: "Оплаты", icon: Wallet },
  { key: "expenses", label: "Расходы", icon: TrendingDown },
  { key: "accounts", label: "Счета", icon: Landmark },
  { key: "analytics", label: "Аналитика", icon: PieChart },
];

/**
 * Вкладки раздела финансов. Ссылками, а не состоянием: каждая вкладка
 * грузит только свои данные и остаётся в адресе — можно скинуть коллеге.
 *
 * «Аналитика» раньше была отдельным пунктом меню — перенесена сюда вкладкой,
 * поэтому показывается только тем, кому и раньше была видна (владельцу).
 */
export default function FinanceTabs({
  active,
  month,
  counts,
  showAnalytics = false,
}: {
  active: string;
  month: string;
  counts?: Record<string, number>;
  showAnalytics?: boolean;
}) {
  const tabs = showAnalytics ? TABS : TABS.filter((t) => t.key !== "analytics");
  return (
    <div className="mb-5 flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.key;
        const count = counts?.[t.key];
        return (
          <Link
            key={t.key}
            href={`/finance?tab=${t.key}&month=${month}`}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition ${
              isActive
                ? "accent-gradient font-medium text-white"
                : "bg-subtle text-muted hover:text-zinc-900"
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
          </Link>
        );
      })}
    </div>
  );
}
