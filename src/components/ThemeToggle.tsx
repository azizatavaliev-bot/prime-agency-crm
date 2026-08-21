"use client";

import { Moon, Sun, Monitor, Check } from "lucide-react";
import { useTheme, type Theme, type Tint } from "@/lib/theme";

const MODES: { key: Theme; label: string; icon: typeof Sun }[] = [
  { key: "light", label: "Светлая", icon: Sun },
  { key: "dark", label: "Тёмная", icon: Moon },
  { key: "system", label: "Системная", icon: Monitor },
];

/** Кружок-превью оттенка — сразу видно цвет фона, а не только название. */
const TINTS: { key: Tint; label: string; swatch: string }[] = [
  { key: "neutral", label: "Нейтральный", swatch: "linear-gradient(135deg, #f4f5fa, #d4d8e8)" },
  { key: "warm", label: "Тёплый", swatch: "linear-gradient(135deg, #f8f4ec, #e3d3ae)" },
  { key: "cool", label: "Холодный", swatch: "linear-gradient(135deg, #eef1f8, #a9bfe6)" },
];

export default function ThemeToggle() {
  const { theme, setTheme, tint, setTint } = useTheme();

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-zinc-200 p-1">
        <div className="grid grid-cols-3 gap-1">
          {MODES.map((o) => {
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

      <div>
        <div className="mb-1.5 px-0.5 text-[11px] font-medium uppercase tracking-wider text-muted">
          Оттенок фона
        </div>
        <div className="flex gap-2">
          {TINTS.map((t) => {
            const active = tint === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTint(t.key)}
                title={t.label}
                /* ring-offset по умолчанию белый — на тёмном фоне это было бы
                   светлым нимбом вокруг кружка, поэтому offset берём из --surface */
                className={`relative h-9 w-9 shrink-0 rounded-full outline-none ring-offset-[color:var(--surface)] transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--accent)] ${
                  active ? "ring-2 ring-offset-2 ring-[color:var(--accent)]" : ""
                }`}
                style={{ background: t.swatch }}
              >
                {active && (
                  <Check
                    size={14}
                    strokeWidth={3}
                    className="absolute inset-0 m-auto text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
