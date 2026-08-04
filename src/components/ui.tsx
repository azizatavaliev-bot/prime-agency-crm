import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
  icon?: LucideIcon;
}) {
  const tones = {
    default: "",
    good: "text-emerald-600",
    warn: "text-amber-600",
    bad: "text-red-600",
  };
  const iconTones = {
    default: "accent-soft accent-text",
    good: "bg-emerald-100 text-emerald-600",
    warn: "bg-amber-100 text-amber-600",
    bad: "bg-red-100 text-red-600",
  };
  return (
    <div className="card card-hover p-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={`stat-icon ${iconTones[tone]}`}>
            <Icon size={17} strokeWidth={1.9} />
          </div>
        )}
        <div className="min-w-0">
          <div className="text-xs text-muted">{label}</div>
          <div className={`mt-0.5 text-xl lg:text-2xl font-semibold tracking-tight ${tones[tone]}`}>
            {value}
          </div>
          {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
        </div>
      </div>
    </div>
  );
}

export function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`badge ${className || "bg-zinc-100 text-zinc-700 border-zinc-200"}`}>{children}</span>;
}

export function Empty({ text }: { text: string }) {
  return <div className="card p-8 text-center text-sm text-muted">{text}</div>;
}

export function Collapse({
  title,
  children,
  icon: Icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <details className="card p-4">
      <summary className="flex cursor-pointer select-none items-center gap-2 text-sm font-medium">
        {Icon && <Icon size={16} strokeWidth={1.8} />}
        {title}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

export function ClientLink({ id, name }: { id: string; name: string }) {
  return (
    <Link href={`/clients/${id}`} className="font-medium text-zinc-900 hover:underline">
      {name}
    </Link>
  );
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="card overflow-x-auto scroll-hint">
      <table className="w-full min-w-[640px]">
        <thead className="border-b border-zinc-200 bg-subtle">
          <tr>
            {head.map((h, i) => (
              <th key={`${h}-${i}`} className="th">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">{children}</tbody>
      </table>
    </div>
  );
}

/* ---------- элементы карточек внутри модалок ---------- */

export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="field-label">{label}</div>
      <div className="field-value">{value ?? "—"}</div>
    </div>
  );
}

export function Section({
  title,
  icon: Icon,
  right,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 first:mt-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {Icon && (
            <span className="stat-icon !h-7 !w-7 accent-soft accent-text">
              <Icon size={14} strokeWidth={2} />
            </span>
          )}
          {title}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const tones = {
    default: "bg-subtle",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    bad: "bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-2xl p-4 ${tones[tone]}`}>
      <div className="text-xs opacity-70">{label}</div>
      <div className="mt-1 text-lg font-semibold tracking-tight">{value}</div>
    </div>
  );
}

/** Аватар с инициалами и цветом, стабильным по имени. */
export function Avatar({
  name,
  size = 44,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const initials = name
    .replace(/[«»"']/g, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const palette = ["#6d5efc", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6"];
  const idx = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  const bg = color ?? palette[idx];
  return (
    <div
      className="avatar shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `${bg}1f`,
        color: bg,
        border: `1px solid ${bg}33`,
      }}
    >
      {initials || "—"}
    </div>
  );
}

export function MiniTable({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 scroll-hint">
      <table className="w-full min-w-[480px]">
        <thead className="border-b border-zinc-200 bg-subtle">
          <tr>
            {head.map((h, i) => (
              <th key={`${h}-${i}`} className="px-3 py-2 text-left text-xs font-medium text-muted whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">{children}</tbody>
      </table>
    </div>
  );
}
