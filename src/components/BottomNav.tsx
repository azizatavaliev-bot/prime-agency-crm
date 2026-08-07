"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { NAV_ICONS, type NavItem } from "./Nav";

/**
 * Нижняя панель вкладок для телефона — как в Unity: четыре главных раздела
 * под большим пальцем плюс «Ещё» для остальных. На десктопе скрыта.
 */
/** На узкой полосе внизу длинные названия не помещаются. */
const SHORT: Record<string, string> = {
  "Финансы и счета": "Финансы",
  "Отчёты по таргету": "Отчёты",
  "Уведомления": "Уведомл.",
};

export default function BottomNav({
  items,
  unread,
  onMore,
}: {
  items: NavItem[];
  unread: number;
  onMore: () => void;
}) {
  const pathname = usePathname();
  const main = items.slice(0, 4);

  return (
    <nav className="bottom-nav lg:hidden">
      {main.map((i) => {
        const active = pathname === i.href || pathname.startsWith(i.href + "/");
        const Icon = NAV_ICONS[i.icon];
        const badge = i.href === "/notifications" ? unread : 0;
        return (
          <Link key={i.href} href={i.href} className={`bottom-nav-item${active ? " active" : ""}`}>
            <span className="relative">
              <Icon size={21} strokeWidth={active ? 2.3 : 1.8} />
              {badge > 0 && (
                <span className="absolute -right-2 -top-1 rounded-full bg-red-500 px-1.5 text-[9px] font-semibold leading-[1.4] text-white">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </span>
            <span className="bottom-nav-label">{SHORT[i.label] ?? i.label}</span>
          </Link>
        );
      })}
      <button type="button" onClick={onMore} className="bottom-nav-item">
        <Menu size={21} />
        <span className="bottom-nav-label">Ещё</span>
      </button>
    </nav>
  );
}
