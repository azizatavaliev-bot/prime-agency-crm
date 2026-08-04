"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, CalendarDays } from "lucide-react";

const TABS = [
  { href: "/marketing", label: "Аналитика", icon: BarChart3 },
  { href: "/marketing/report", label: "Отчёты", icon: FileText },
  { href: "/marketing/calendar", label: "Календарь", icon: CalendarDays },
];

export default function MarketingTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {TABS.map((t) => {
        const active = pathname === t.href;
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition ${
              active ? "accent-gradient text-white font-medium" : "bg-subtle text-muted hover:text-zinc-900"
            }`}
          >
            <Icon size={15} /> {t.label}
          </Link>
        );
      })}
    </div>
  );
}
