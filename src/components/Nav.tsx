"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import BottomNav from "./BottomNav";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Landmark,
  TrendingDown,
  TrendingUp,
  KanbanSquare,
  UserCog,
  PieChart,
  Megaphone,
  BookText,
  Bell,
  Settings,
  UserCircle,
  Menu,
  X,
  LogOut,
  Zap,
  Grid2x2,
  ArrowUpRight,
} from "lucide-react";

const UNITY_URL = "https://adminapp-production-217b.up.railway.app";

export const NAV_ICONS = {
  dashboard: LayoutDashboard,
  clients: Users,
  payments: Wallet,
  expenses: TrendingDown,
  finance: Landmark,
  reports: TrendingUp,
  marketing: Megaphone,
  regulations: BookText,
  tasks: KanbanSquare,
  team: UserCog,
  analytics: PieChart,
  notifications: Bell,
  settings: Settings,
  profile: UserCircle,
} as const;

export type NavItem = { href: string; label: string; icon: keyof typeof NAV_ICONS; group?: string };

export default function Nav({
  items,
  user,
  unread,
}: {
  items: NavItem[];
  user: { name: string; roleLabel: string };
  unread: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const groups = new Map<string, NavItem[]>();
  for (const i of items) {
    const g = i.group ?? "";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(i);
  }

  const link = (i: NavItem) => {
    const active = pathname === i.href || pathname.startsWith(i.href + "/");
    const Icon = NAV_ICONS[i.icon];
    return (
      <Link
        key={i.href}
        href={i.href}
        onClick={() => setOpen(false)}
        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
          active ? "nav-active font-medium" : "text-muted hover:bg-subtle"
        }`}
      >
        <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
        <span>{i.label}</span>
        {i.href === "/notifications" && unread > 0 && (
          <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-medium text-white">
            {unread}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 pt-safe">
        <div className="flex items-center gap-2 font-semibold">
          <span className="accent-gradient flex h-8 w-8 items-center justify-center rounded-lg text-white">
            <Zap size={16} fill="currentColor" />
          </span>
          Prime Agency
        </div>
        <button className="btn-ghost !px-3 !py-1.5" onClick={() => setOpen(!open)}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* затемнение под выехавшим меню — чтобы было понятно, как его закрыть */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-zinc-900/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <BottomNav items={items} unread={unread} onMore={() => setOpen(true)} />

      <aside
        className={`${
          open ? "block" : "hidden"
        } lg:block lg:sticky lg:top-0 lg:h-screen w-full lg:w-64 shrink-0 border-r border-zinc-200 bg-white p-4 pb-28 lg:pb-4 relative z-30`}
      >
        <div className="mb-6 hidden lg:block">
          <div className="flex items-center gap-2.5">
            <span className="accent-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white">
              <Zap size={18} fill="currentColor" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Prime Agency</span>
          </div>
          <div className="mt-1 pl-12 text-xs text-muted">Система учёта агентства</div>
        </div>

        <a
          href={UNITY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 hidden items-center justify-between rounded-xl border border-zinc-200 bg-subtle px-3 py-2.5 text-sm transition hover:bg-zinc-100 lg:flex"
        >
          <span className="flex items-center gap-2 text-muted">
            <Grid2x2 size={16} />
            Перейти в Unity
          </span>
          <ArrowUpRight size={15} className="text-muted" />
        </a>

        <nav className="space-y-4">
          {[...groups.entries()].map(([group, list]) => (
            <div key={group || "main"} className="space-y-1">
              {group && (
                <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {group}
                </div>
              )}
              {list.map(link)}
            </div>
          ))}
        </nav>
        <div className="mt-6 space-y-3 border-t border-zinc-200 pt-4 lg:hidden">
          <ThemeToggle />
          <div>
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-xs text-zinc-500">{user.roleLabel}</div>
          </div>
          <form action="/api/logout" method="post">
            <button className="btn-ghost w-full">
              <LogOut size={16} />
              Выйти
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
