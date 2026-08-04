"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PALETTE = ["var(--accent)", "#0ea5e9", "#10b981", "#f59e0b"];

const money = (v: number) => `${v.toLocaleString("ru-RU")} сом`;
const tip = {
  borderRadius: 12,
  border: "1px solid var(--line)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 12,
};

export function RevenueProfitChart({
  data,
}: {
  data: { month: string; revenue: number; ownerNet: number }[];
}) {
  return (
    <div className="card p-4">
      <div className="mb-3 text-sm font-medium">Выручка и прибыль владельца</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="net" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--muted)" />
            <YAxis tick={{ fontSize: 12 }} stroke="var(--muted)" width={70} />
            <Tooltip formatter={(v: number) => money(v)} contentStyle={tip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Выручка"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#rev)"
            />
            <Area
              type="monotone"
              dataKey="ownerNet"
              name="Прибыль владельца"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#net)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ServicesPie({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="card p-4">
      <div className="mb-3 text-sm font-medium">Доход по услугам</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, n: string) => [
                `${money(v)} · ${total ? Math.round((v / total) * 100) : 0}%`,
                n,
              ]}
              contentStyle={tip}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ChurnChart({ data }: { data: { month: string; active: number; churned: number }[] }) {
  return (
    <div className="card p-4">
      <div className="mb-3 text-sm font-medium">Клиенты и отток по месяцам</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--muted)" />
            <YAxis tick={{ fontSize: 12 }} stroke="var(--muted)" allowDecimals={false} width={40} />
            <Tooltip contentStyle={tip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="active" name="Активные" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            <Bar dataKey="churned" name="Ушли" fill="#ef4444" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TargetologChart({ data }: { data: { name: string; revenue: number; clients: number }[] }) {
  return (
    <div className="card p-4">
      <div className="mb-3 text-sm font-medium">Выручка по таргетологам за месяц</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--muted)" />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted)" width={120} />
            <Tooltip formatter={(v: number) => money(v)} contentStyle={tip} />
            <Bar dataKey="revenue" name="Выручка" fill="var(--accent)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ExpensesChart({
  data,
  byCategory,
}: {
  data: { month: string; expenses: number; ownerNet: number }[];
  byCategory: { name: string; value: number }[];
}) {
  const total = byCategory.reduce((s, d) => s + d.value, 0);
  return (
    <div className="card p-4">
      <div className="mb-3 text-sm font-medium">Расходы и чистая прибыль</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--muted)" />
            <YAxis tick={{ fontSize: 12 }} stroke="var(--muted)" width={70} />
            <Tooltip formatter={(v: number) => money(v)} contentStyle={tip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="expenses" name="Расходы" fill="#ef4444" radius={[6, 6, 0, 0]} />
            <Bar dataKey="ownerNet" name="Чистая прибыль" fill="#10b981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {total > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {byCategory.slice(0, 4).map((c) => (
            <span key={c.name}>
              {c.name}: {Math.round((c.value / total) * 100)}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
