import { som } from "@/lib/format";

export type DonutSlice = { label: string; value: number; color: string };

/** Палитра долей: заметно различима и в светлой, и в тёмной теме. */
export const DONUT_COLORS = [
  "#6d5efc",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
  "#a1a1aa",
];

/**
 * Кольцевая диаграмма на чистом SVG: долей мало, а библиотека графиков
 * тянет клиентский рантайм и ломает серверный рендер.
 */
export default function Donut({
  slices,
  size = 128,
  thickness = 18,
  centerLabel,
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  let offset = 0;
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const frac = total > 0 ? s.value / total : 0;
      const arc = { ...s, frac, dash: c * frac, offset: -offset * c };
      offset += frac;
      return arc;
    });

  const top = arcs.length ? Math.round(arcs[0].frac * 100) : 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={thickness}
            className="stroke-zinc-100"
          />
          {arcs.map((a) => (
            <circle
              key={a.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={thickness}
              strokeDasharray={`${a.dash} ${c - a.dash}`}
              strokeDashoffset={a.offset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold tracking-tight">{centerLabel ?? `${top}%`}</span>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        {arcs.map((a) => (
          <div key={a.label} className="flex items-start gap-2">
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: a.color }}
            />
            <div className="min-w-0">
              <div className="truncate text-sm">{a.label}</div>
              <div className="text-xs text-muted">
                {som(a.value)} · {Math.round(a.frac * 100)}%
              </div>
            </div>
          </div>
        ))}
        {arcs.length === 0 && <div className="text-sm text-muted">Нет данных за период</div>}
      </div>
    </div>
  );
}
