"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";

const OPTIONS: { key: Theme; label: string; icon: typeof Sun }[] = [
  { key: "light", label: "Светлая", icon: Sun },
  { key: "dark", label: "Тёмная", icon: Moon },
  { key: "system", label: "Системная", icon: Monitor },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="rounded-xl border border-zinc-200 p-1">
      <div className="grid grid-cols-3 gap-1">
        {OPTIONS.map((o) => {
          const Icon = o.icon;
          const active = theme === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => setTheme(o.key)}
              title={o.label}
              className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--accent)] ${
                active ? "accent-gradient text-white shadow-sm" : "text-muted hover:bg-subtle"
              }`}
            >
              <Icon size={15} />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
