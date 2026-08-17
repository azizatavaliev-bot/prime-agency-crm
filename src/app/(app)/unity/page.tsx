import Link from "next/link";
import { ExternalLink, TrendingUp, KanbanSquare, Wallet, LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUnityTokens, unityFetch } from "@/lib/unity";
import { disconnectUnity } from "@/lib/unityActions";
import { PageHeader } from "@/components/ui";
import { som } from "@/lib/format";
import UnityConnectForm from "@/components/UnityConnectForm";
import UnityJsonView from "@/components/UnityJsonView";

export const dynamic = "force-dynamic";

const UNITY_URL = "https://adminapp-production-217b.up.railway.app";

const TABS = [
  { key: "reports", label: "Отчёты", icon: TrendingUp },
  { key: "tasks", label: "Задачи", icon: KanbanSquare },
  { key: "incomes", label: "Поступления", icon: Wallet },
] as const;

type MarketingRecord = {
  date?: string;
  channel?: string;
  source?: string;
  spend?: number;
  spendUsd?: number;
  leadsCount?: number;
  impressions?: number;
  inquiries?: number;
  notes?: string;
};

function ReportsTab({ records }: { records: MarketingRecord[] }) {
  if (records.length === 0) return <div className="card p-8 text-center text-sm text-muted">Записей нет</div>;
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-100 text-left text-xs text-muted">
          <tr>
            <th className="px-4 py-2.5 font-medium">Дата</th>
            <th className="px-4 py-2.5 font-medium">Канал</th>
            <th className="px-4 py-2.5 font-medium">Источник</th>
            <th className="px-4 py-2.5 font-medium">Расход</th>
            <th className="px-4 py-2.5 font-medium">Заявки</th>
            <th className="px-4 py-2.5 font-medium">Показы</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={i} className="border-b border-zinc-50 last:border-0">
              <td className="px-4 py-2.5">{r.date ?? "—"}</td>
              <td className="px-4 py-2.5">{r.channel ?? "—"}</td>
              <td className="px-4 py-2.5">{r.source ?? "—"}</td>
              <td className="px-4 py-2.5">{r.spend !== undefined ? som(r.spend) : "—"}</td>
              <td className="px-4 py-2.5">{r.leadsCount ?? "—"}</td>
              <td className="px-4 py-2.5">{r.impressions ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function UnityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as (typeof TABS)[number]["key"]) : "reports";

  const tokens = await getUnityTokens();
  const me = tokens ? await unityFetch<{ user: { name?: string; username?: string; role?: string } }>("/api/me") : null;
  const connected = Boolean(me?.connected);

  let body: React.ReactNode = null;
  if (connected) {
    if (tab === "reports") {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      const end = today.toISOString().slice(0, 10);
      const res = await unityFetch<{ records?: MarketingRecord[] }>(
        `/api/marketing/summary?period=custom&startDate=${start}&endDate=${end}`
      );
      body = <ReportsTab records={res.connected ? res.data.records ?? [] : []} />;
    } else if (tab === "tasks") {
      const res = await unityFetch("/api/tasks");
      body = <UnityJsonView data={res.connected ? res.data : { error: "не удалось получить" }} />;
    } else {
      const res = await unityFetch("/api/incomes");
      body = <UnityJsonView data={res.connected ? res.data : { error: "не удалось получить" }} />;
    }
  }

  return (
    <div>
      <PageHeader
        title="Unity"
        subtitle="Живые данные Unity OS прямо внутри Prime — без повторного входа"
        right={
          <div className="flex flex-wrap gap-2">
            <Link href={UNITY_URL} target="_blank" className="btn-ghost">
              <ExternalLink size={15} /> Открыть Unity
            </Link>
            {connected && (
              <form action={disconnectUnity}>
                <button className="btn-ghost">
                  <LogOut size={15} /> Отключить
                </button>
              </form>
            )}
          </div>
        }
      />

      {!connected ? (
        <UnityConnectForm defaultUsername={user.login ?? user.email} reconnect={Boolean(tokens)} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <Link
                  key={t.key}
                  href={`/unity?tab=${t.key}`}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm transition ${
                    active ? "accent-gradient text-white font-medium" : "bg-subtle text-muted hover:text-zinc-900"
                  }`}
                >
                  <Icon size={15} /> {t.label}
                </Link>
              );
            })}
          </div>
          {body}
        </div>
      )}
    </div>
  );
}
