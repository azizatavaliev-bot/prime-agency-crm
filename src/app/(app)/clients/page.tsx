import { redirect } from "next/navigation";
import { Plus, Search, Users, Wallet, TrendingUp, AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientScope, can } from "@/lib/access";
import { dicts, labelOf, colorOf } from "@/lib/dict";
import { som, dateRu, monthKey } from "@/lib/format";
import { paymentChip, daysToPayment } from "@/lib/payday";
import { PageHeader, Stat, Avatar } from "@/components/ui";
import ClientForm from "@/components/ClientForm";
import FormModal from "@/components/FormModal";
import { ClientModal } from "@/components/details";

export const dynamic = "force-dynamic";

/** Цвет полосы и аватара по статусу клиента. */
const STATUS_STRIPE: Record<string, string> = {
  TEST: "#0ea5e9",
  ACTIVE: "#10b981",
  RISK: "#f59e0b",
  PAUSED: "#a1a1aa",
  CHURNED: "#ef4444",
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; sort?: string }>;
}) {
  const user = await requireUser();
  if (user.role === "CONTRACTOR") redirect("/no-access");
  const sp = await searchParams;

  const clients = await prisma.client.findMany({
    where: {
      AND: [
        clientScope(user),
        sp.status ? { status: sp.status } : {},
        sp.q ? { name: { contains: sp.q } } : {},
      ],
    },
    include: {
      targetolog: true,
      account: true,
      payments: { orderBy: { dueAt: "desc" } },
      reports: { orderBy: { periodTo: "desc" } },
      tasks: { include: { assignee: true, client: true }, orderBy: { createdAt: "desc" } },
      members: { include: { user: true } },
      expenses: { orderBy: { spentAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true },
  });
  const d = await dicts(["CLIENT_STATUS", "SERVICE", "SOURCE", "NICHE"]);
  const mk = monthKey();

  // по умолчанию — как в FADAMOS: сверху те, у кого оплата ближе
  const sort = sp.sort ?? "payment";
  const sorted = [...clients].sort((a, b) => {
    if (sort === "amount") return b.avgCheck - a.avgCheck;
    if (sort === "tasks")
      return b.tasks.filter((t) => !t.done).length - a.tasks.filter((t) => !t.done).length;
    return daysToPayment(a.paymentDay) - daysToPayment(b.paymentDay);
  });

  const activeStatuses = ["TEST", "ACTIVE", "RISK"];
  const active = clients.filter((c) => activeStatuses.includes(c.status));
  const risk = clients.filter((c) => c.status === "RISK").length;
  const mrr = active.reduce((s, c) => s + c.avgCheck, 0);
  const notPaid = active.filter(
    (c) => !c.payments.some((p) => p.periodMonth === mk && p.status === "PAID")
  ).length;

  return (
    <div>
      <PageHeader
        title="Клиенты"
        subtitle={
          user.role === "OWNER"
            ? "Клик по карточке открывает проект целиком: оплаты, отчёты, задачи и команду"
            : "Только ваши проекты · клик по карточке открывает детали"
        }
        right={
          can.manageClients(user) ? (
            <FormModal
              label="Новый клиент"
              title="Новый клиент"
              width="max-w-3xl"
              icon={<Plus size={16} />}
              hint="Заполните цель и договорённости — их видит вся команда проекта. Абонплата попадёт в план выручки месяца, а дата следующей оплаты создаст напоминание."
            >
              <ClientForm
                users={users}
                canAssignAccount={user.role === "OWNER"}
                statuses={d.CLIENT_STATUS}
                services={d.SERVICE}
                sources={d.SOURCE}
                niches={d.NICHE}
              />
            </FormModal>
          ) : undefined
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="Активных" value={String(active.length)} hint={`всего: ${clients.length}`} icon={Users} />
        <Stat label="Абонплата в месяц" value={som(mrr)} icon={Wallet} />
        <Stat
          label="Не закрыт этот месяц"
          value={String(notPaid)}
          tone={notPaid ? "warn" : "good"}
          icon={TrendingUp}
        />
        <Stat label="Риск оттока" value={String(risk)} tone={risk ? "bad" : "good"} icon={AlertTriangle} />
      </div>

      <form className="my-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" name="q" placeholder="Поиск по названию" defaultValue={sp.q ?? ""} />
        <select className="input max-w-[200px]" name="status" defaultValue={sp.status ?? ""}>
          <option value="">Все статусы</option>
          {d.CLIENT_STATUS.map((st) => (
            <option key={st.key} value={st.key}>
              {st.name}
            </option>
          ))}
        </select>
        <button className="btn-ghost">
          <Search size={15} /> Фильтр
        </button>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Сортировка:</span>
        {[
          ["payment", "Ближайшая оплата"],
          ["amount", "Наибольший чек"],
          ["tasks", "Больше всего задач"],
        ].map(([key, label]) => (
          <a
            key={key}
            href={`/clients?sort=${key}${sp.status ? `&status=${sp.status}` : ""}${sp.q ? `&q=${sp.q}` : ""}`}
            className={sort === key ? "btn-primary !py-1.5 !text-xs" : "btn-ghost !py-1.5 !text-xs"}
          >
            {label}
          </a>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {sorted.map((c) => {
          const paidThisMonth = c.payments.some((p) => p.periodMonth === mk && p.status === "PAID");
          const chip = paymentChip(c.paymentDay);
          const statusColor = colorOf(d.CLIENT_STATUS, c.status);
          const openTasks = c.tasks.filter((t) => !t.done).length;
          const lastReport = c.reports[0];
          const stripe = STATUS_STRIPE[c.status] ?? "#6d5efc";
          return (
            <ClientModal
              key={c.id}
              client={c}
              users={users}
              user={user}
              dict={d}
              className="block w-full text-left"
              trigger={
                <div
                  className="card card-hover stripe w-full p-5"
                  style={{ ["--stripe-color" as string]: stripe }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={c.name} size={46} color={stripe} />
                      <div className="min-w-0">
                        <div className="truncate font-semibold tracking-tight">{c.name}</div>
                        <div className="mt-0.5 truncate text-xs text-muted">
                          {c.niche || "ниша не указана"} · {c.targetolog?.name ?? "без таргетолога"}
                        </div>
                      </div>
                    </div>
                    <span className={`badge ${statusColor ?? ""}`}>{labelOf(d.CLIENT_STATUS, c.status)}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {chip && !paidThisMonth ? (
                      <span className={`chip ${chip.color}`}>💳 {chip.text}</span>
                    ) : chip ? (
                      <span className="chip bg-emerald-50 text-emerald-700 border-emerald-200">
                        ✅ оплачено · {c.paymentDay} числа
                      </span>
                    ) : (
                      <span className="chip border-zinc-200 text-muted">💳 день оплаты не задан</span>
                    )}
                    <span className="chip border-zinc-200 text-muted">💰 {som(c.avgCheck)}</span>
                    {openTasks > 0 && (
                      <span className="chip border-zinc-200 text-muted">🗂 {openTasks} задач</span>
                    )}
                    {c.contractStart && (
                      <span className="chip border-zinc-200 text-muted">✍️ {dateRu(c.contractStart)}</span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-3 text-center">
                    <div>
                      <div className="text-[11px] text-muted">Услуги</div>
                      <div className="mt-0.5 truncate text-xs font-medium">
                        {c.services
                          .split(",")
                          .filter(Boolean)
                          .map((sv) => labelOf(d.SERVICE, sv))
                          .join(", ") || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted">Последний CPL</div>
                      <div className="mt-0.5 text-xs font-medium">
                        {lastReport && lastReport.leads
                          ? `${Math.round(lastReport.spent / lastReport.leads)} сом`
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted">Отчётов</div>
                      <div className="mt-0.5 text-xs font-medium">{c.reports.length}</div>
                    </div>
                  </div>

                  {c.members && c.members.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {c.members.slice(0, 4).map((m) => (
                        <span
                          key={m.id}
                          className="flex items-center gap-1.5 rounded-lg bg-subtle px-2 py-1 text-[11px]"
                        >
                          <Avatar name={m.user.name} size={18} />
                          {m.user.name.split(" ")[0]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              }
            />
          );
        })}
        {clients.length === 0 && (
          <div className="card p-8 text-center text-sm text-muted lg:col-span-2">Клиентов пока нет</div>
        )}
      </div>
    </div>
  );
}
