"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Search,
  Bell,
  Moon,
  Sun,
  LogOut,
  User as UserIcon,
  Settings,
  ChevronDown,
  Users,
  KanbanSquare,
  UserCog,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { Avatar } from "./ui";
import { readAllNotifications } from "@/lib/actions";
import type { SearchResult } from "@/app/api/search/route";

export type TopNotification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

const KIND_ICON = { client: Users, task: KanbanSquare, employee: UserCog } as const;

/** Верхняя шапка: живой поиск, уведомления, тема, меню пользователя — как в FADAMOS. */
export default function TopBar({
  user,
  unread,
  recent,
}: {
  user: { name: string; roleLabel: string; role: string };
  unread: number;
  recent: TopNotification[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // живой поиск с debounce — как globalSearch() в FADAMOS
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await r.json();
        setResults(data.results ?? []);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("prime-theme", next ? "dark" : "light");
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (results[0]) {
      router.push(results[0].link);
      setSearchOpen(false);
      setQ("");
    } else if (q.trim()) {
      router.push(`/clients?q=${encodeURIComponent(q.trim())}`);
      setSearchOpen(false);
    }
  };

  const goTo = (link: string) => {
    router.push(link);
    setSearchOpen(false);
    setQ("");
  };

  return (
    <div className="sticky top-0 z-20 mb-4 hidden items-center gap-3 border-b border-zinc-200/70 bg-[var(--bg)]/85 px-4 py-3 backdrop-blur lg:flex lg:px-8">
      <div className="relative w-full max-w-sm" ref={searchRef}>
        <form onSubmit={submitSearch}>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            placeholder="Найти клиента, задачу, сотрудника…"
            className="input !pl-9 !py-2 text-sm"
          />
          {searching && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted" />
          )}
        </form>

        {searchOpen && q.trim().length >= 2 && (
          <div className="card absolute left-0 top-11 max-h-96 w-full overflow-y-auto p-1.5">
            {results.length === 0 && !searching && (
              <div className="px-3 py-3 text-sm text-muted">Ничего не найдено</div>
            )}
            {results.map((r) => {
              const Icon = KIND_ICON[r.kind];
              return (
                <button
                  key={`${r.kind}-${r.id}`}
                  onClick={() => goTo(r.link)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-subtle"
                >
                  <span className="accent-soft accent-text flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                    <Icon size={14} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.title}</span>
                    <span className="block truncate text-xs text-muted">{r.subtitle}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button onClick={toggleTheme} className="rounded-xl p-2.5 text-muted transition hover:bg-subtle" title="Тема">
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen((v) => !v)}
            className="relative rounded-xl p-2.5 text-muted transition hover:bg-subtle"
            title="Уведомления"
          >
            <Bell size={17} />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          {bellOpen && (
            <div className="card absolute right-0 top-12 w-80 overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                <span className="text-sm font-semibold">Уведомления</span>
                {unread > 0 && (
                  <button
                    onClick={() => startTransition(() => readAllNotifications())}
                    disabled={isPending}
                    className="flex items-center gap-1 text-xs font-medium accent-text hover:underline disabled:opacity-50"
                  >
                    <CheckCheck size={13} /> Прочитать все
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {recent.length === 0 && <div className="p-4 text-sm text-muted">Пусто</div>}
                {recent.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link || "/notifications"}
                    onClick={() => setBellOpen(false)}
                    className={`block border-b border-zinc-100 px-4 py-3 text-sm transition hover:bg-subtle last:border-0 ${
                      n.read ? "opacity-60" : ""
                    }`}
                  >
                    <div className="font-medium">{n.title}</div>
                    {n.body && <div className="mt-0.5 text-xs text-muted">{n.body}</div>}
                  </Link>
                ))}
              </div>
              <Link
                href="/notifications"
                onClick={() => setBellOpen(false)}
                className="accent-text block px-4 py-2.5 text-center text-xs font-medium hover:bg-subtle"
              >
                Все уведомления
              </Link>
            </div>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2.5 transition hover:bg-subtle"
          >
            <Avatar name={user.name} size={30} />
            <span className="hidden text-left xl:block">
              <span className="block text-xs font-medium leading-tight">{user.name}</span>
              <span className="block text-[11px] leading-tight text-muted">{user.roleLabel}</span>
            </span>
            <ChevronDown size={14} className="text-muted" />
          </button>
          {menuOpen && (
            <div className="card absolute right-0 top-12 w-56 overflow-hidden p-1.5">
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-subtle"
              >
                <UserIcon size={15} /> Профиль
              </Link>
              {/* Настройки открыты только владельцу — остальным пункт вёл в «нет доступа» */}
              {user.role === "OWNER" && (
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-subtle"
                >
                  <Settings size={15} /> Настройки
                </Link>
              )}
              <form action="/api/logout" method="post">
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50">
                  <LogOut size={15} /> Выйти
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
