import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  KanbanSquare,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  CheckCircle2,
  User as UserIcon,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientScope, can } from "@/lib/access";
import { reportMetrics } from "@/lib/finance";
import { deleteClient, toggleTask } from "@/lib/actions";
import { som, dateRu, num } from "@/lib/format";
import { paymentChip, daysToContractEnd } from "@/lib/payday";
import {
  PAYMENT_KIND,
  PAYMENT_METHOD,
  stagesFor,
} from "@/lib/constants";
import { PageHeader, Table, Collapse, Stat, Field, Section } from "@/components/ui";
import ClientForm from "@/components/ClientForm";
import PaymentForm from "@/components/PaymentForm";
import ReportForm from "@/components/ReportForm";
import TaskForm from "@/components/TaskForm";
import MarkPaidButton from "@/components/MarkPaidButton";
import { PayStatusBadge, ReportModal, StatusBadge, TaskModal, servicesLabel } from "@/components/details";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const client = await prisma.client.findFirst({
    where: { AND: [{ id }, clientScope(user)] },
    include: {
      targetolog: true,
      account: true,
      payments: { orderBy: { dueAt: "desc" } },
      reports: { orderBy: { periodTo: "desc" } },
      tasks: { include: { assignee: true, client: true }, orderBy: { createdAt: "desc" } },
      members: { include: { user: true } },
      expenses: { orderBy: { spentAt: "desc" } },
    },
  });
  if (!client) notFound();

  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true },
  });
  const contractors = users.filter((u) => u.role === "CONTRACTOR");
  const clientOpts = [{ id: client.id, name: client.name }];

  const showMoney = can.seePayments(user);
  const paidTotal = client.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  const debtTotal = client.payments.filter((p) => p.status !== "PAID").reduce((s, p) => s + p.amount, 0);
  const lastReport = client.reports[0];
  const lastMetrics = lastReport ? reportMetrics(lastReport) : null;

  return (
    <div>
      <PageHeader
        title={client.name}
        subtitle={`${client.niche || "ниша не указана"} · старт ${dateRu(client.startedAt)}`}
        right={
          <div className="flex items-center gap-2">
            <StatusBadge status={client.status} />
            <Link href="/clients" className="btn-ghost">
              <ArrowLeft size={15} /> К списку
            </Link>
          </div>
        }
      />

      {(client.paymentDay || client.contractStart || client.contractEnd) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {(() => {
            const chip = paymentChip(client.paymentDay);
            return chip ? <span className={`badge ${chip.color}`}>💳 {chip.text}</span> : null;
          })()}
          {client.contractStart && (
            <span className="badge bg-zinc-100 text-zinc-700 border-zinc-200">
              ✍️ договор от {dateRu(client.contractStart)}
            </span>
          )}
          {(() => {
            const left = daysToContractEnd(client.contractEnd);
            if (left === null) return null;
            return (
              <span
                className={`badge ${
                  left < 0
                    ? "bg-red-100 text-red-700 border-red-200"
                    : left <= 30
                      ? "bg-amber-100 text-amber-700 border-amber-200"
                      : "bg-zinc-100 text-zinc-700 border-zinc-200"
                }`}
              >
                📅 договор до {dateRu(client.contractEnd)}
                {left < 0 ? " · истёк" : left <= 30 ? ` · осталось ${left} дн.` : ""}
              </span>
            );
          })()}
          {client.profitPercent ? (
            <span className="badge bg-zinc-100 text-zinc-700 border-zinc-200">
              📈 {client.profitPercent}% от прибыли
            </span>
          ) : null}
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="Абонплата" value={som(client.avgCheck)} icon={Wallet} />
        {showMoney && <Stat label="Оплачено всего" value={som(paidTotal)} tone="good" icon={CheckCircle2} />}
        {showMoney && (
          <Stat label="Долг / ожидается" value={som(debtTotal)} tone={debtTotal ? "bad" : "good"} icon={Wallet} />
        )}
        <Stat
          label="Последний CPL"
          value={lastMetrics?.cpl ? `${num(lastMetrics.cpl)} сом` : "—"}
          hint={lastReport ? `цель ${num(lastReport.targetCpl)} сом` : undefined}
          tone={!lastMetrics || lastMetrics.inTarget === null ? "default" : lastMetrics.inTarget ? "good" : "bad"}
          icon={TrendingUp}
        />
      </div>

      <div className="mt-4 card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-500">
          <UserIcon size={15} /> Данные проекта
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Контакт" value={client.contact || "—"} />
          <Field label="Таргетолог" value={client.targetolog?.name ?? "не назначен"} />
          <Field label="Аккаунт-менеджер" value={client.account?.name ?? "—"} />
          <Field label="Источник заявки" value={client.source || "—"} />
          <Field label="Услуги" value={servicesLabel(client.services)} />
          <Field label="Рекламный кабинет" value={client.adAccount || "—"} />
          <Field
            label="День оплаты"
            value={client.paymentDay ? `${client.paymentDay} числа каждого месяца` : "не задан"}
          />
          <Field label="Следующая оплата" value={dateRu(client.nextPaymentAt)} />
          <Field label="Заметки" value={client.notes || "—"} />
        </div>
      </div>

      {showMoney && (
        <Section title="История оплат" icon={Wallet}>
          <div className="mb-3">
            <Collapse title="Добавить платёж" icon={Plus}>
              <PaymentForm clients={[]} contractors={contractors} fixedClientId={client.id} />
            </Collapse>
          </div>
          <Table
            head={[
              "Тип",
              "Сумма",
              "Статус",
              "План",
              "Оплачено",
              "Метод",
              ...(user.role === "OWNER" ? ["Владельцу"] : []),
              "",
            ]}
          >
            {client.payments.map((p) => (
              <tr key={p.id}>
                <td className="td">{PAYMENT_KIND[p.kind as keyof typeof PAYMENT_KIND]}</td>
                <td className="td font-medium">{som(p.amount)}</td>
                <td className="td">
                  <PayStatusBadge status={p.status} />
                </td>
                <td className="td">{dateRu(p.dueAt)}</td>
                <td className="td">{dateRu(p.paidAt)}</td>
                <td className="td text-zinc-500">{PAYMENT_METHOD[p.method as keyof typeof PAYMENT_METHOD]}</td>
                {user.role === "OWNER" && <td className="td">{som(p.ownerNet)}</td>}
                <td className="td">
                  {p.status !== "PAID" && (
                    <MarkPaidButton
                      paymentId={p.id}
                      clientName={client.name}
                      amount={som(p.amount)}
                      dueAt={dateRu(p.dueAt)}
                      compact
                    />
                  )}
                </td>
              </tr>
            ))}
            {client.payments.length === 0 && (
              <tr>
                <td className="td text-zinc-500" colSpan={8}>
                  Оплат пока нет
                </td>
              </tr>
            )}
          </Table>
        </Section>
      )}

      <Section title="Отчёты по таргету (по неделям)" icon={TrendingUp}>
        {can.writeReports(user) && (
          <div className="mb-3">
            <Collapse title="Новый отчёт" icon={Plus}>
              <ReportForm clients={[]} fixedClientId={client.id} defaultTargetCpl={client.targetCpl} />
            </Collapse>
          </div>
        )}
        <Table head={["Период", "Бюджет", "Потрачено", "Заявки", "CPL", "Цель CPL", "CPA", "Связки", ""]}>
          {client.reports.map((r) => {
            const m = reportMetrics(r);
            return (
              <ReportModal
                key={r.id}
                report={r}
                clientName={client.name}
                clientId={client.id}
                canEdit={can.writeReports(user)}
                className={m.inTarget === false ? "bg-red-50" : m.inTarget ? "bg-emerald-50" : ""}
                row={
                  <>
                    <td className="td">
                      {dateRu(r.periodFrom)} — {dateRu(r.periodTo)}
                    </td>
                    <td className="td">{som(r.budget)}</td>
                    <td className="td">{som(r.spent)}</td>
                    <td className="td">{r.leads}</td>
                    <td
                      className={`td font-medium ${
                        m.cplOk === false ? "text-red-600" : m.cplOk ? "text-emerald-600" : ""
                      }`}
                    >
                      {m.cpl ? `${num(m.cpl)} сом` : "—"}
                    </td>
                    <td className="td text-zinc-500">{som(r.targetCpl)}</td>
                    <td className={`td ${m.cpaOk === false ? "text-red-600" : m.cpaOk ? "text-emerald-600" : ""}`}>
                      {m.cpa ? `${num(m.cpa)} сом` : "—"}
                    </td>
                    <td className="td text-zinc-500">{r.bundles || "—"}</td>
                    <td className="td">
                      <Link href={`/reports/${r.id}`} className="btn-ghost !px-3 !py-1 !text-xs">
                        <ExternalLink size={13} /> Клиенту
                      </Link>
                    </td>
                  </>
                }
              />
            );
          })}
          {client.reports.length === 0 && (
            <tr>
              <td className="td text-zinc-500" colSpan={9}>
                Отчётов пока нет
              </td>
            </tr>
          )}
        </Table>
      </Section>

      <Section title="Задачи проекта" icon={KanbanSquare}>
        {user.role !== "CONTRACTOR" && (
          <div className="mb-3">
            <Collapse title="Новая задача" icon={Plus}>
              <TaskForm clients={[]} users={users} fixedClientId={client.id} />
            </Collapse>
          </div>
        )}
        <Table head={["Задача", "Доска", "Этап", "Ответственный", "Дедлайн", ""]}>
          {client.tasks.map((t) => (
            <TaskModal
              key={t.id}
              task={t}
              clients={clientOpts}
              users={users}
              canEdit={user.role !== "CONTRACTOR"}
              className={t.done ? "opacity-50" : ""}
              row={
                <>
                  <td className={`td ${t.done ? "line-through" : ""}`}>{t.title}</td>
                  <td className="td text-zinc-500">{t.board}</td>
                  <td className="td">{stagesFor(t.board)[t.stage] ?? t.stage}</td>
                  <td className="td">{t.assignee?.name ?? "—"}</td>
                  <td className="td text-zinc-500">{dateRu(t.dueAt)}</td>
                  <td className="td">
                    <form action={toggleTask}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="btn-ghost !px-3 !py-1 !text-xs">
                        <CheckCircle2 size={13} /> {t.done ? "Вернуть" : "Готово"}
                      </button>
                    </form>
                  </td>
                </>
              }
            />
          ))}
          {client.tasks.length === 0 && (
            <tr>
              <td className="td text-zinc-500" colSpan={6}>
                Задач пока нет
              </td>
            </tr>
          )}
        </Table>
      </Section>

      {can.manageClients(user) && (
        <div className="mt-8">
          <Collapse title="Редактировать карточку клиента" icon={Pencil}>
            <ClientForm users={users} client={client} canAssignAccount={user.role === "OWNER"} />
            {user.role === "OWNER" && (
              <form action={deleteClient} className="mt-6 border-t border-zinc-200 pt-4">
                <input type="hidden" name="id" value={client.id} />
                <button className="btn-ghost text-red-600">
                  <Trash2 size={15} /> Удалить клиента и все его данные
                </button>
              </form>
            )}
          </Collapse>
        </div>
      )}
    </div>
  );
}
