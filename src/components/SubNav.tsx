"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SlidersHorizontal,
  Tags,
  Users,
  Download,
  Bell,
  Plug,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  general: SlidersHorizontal,
  dictionaries: Tags,
  team: Users,
  export: Download,
  notifications: Bell,
  integrations: Plug,
};

export type SubNavItem = { href: string; label: string; icon: keyof typeof ICONS };

export default function SubNav({ items }: { items: SubNavItem[] }) {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
      {items.map((i) => {
        const Icon = ICONS[i.icon];
        const active = pathname === i.href;
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition ${
              active ? "bg-zinc-900 text-white" : "border border-zinc-200 hover:bg-subtle"
            }`}
          >
            <Icon size={15} />
            {i.label}
          </Link>
        );
      })}
    </div>
  );
}
