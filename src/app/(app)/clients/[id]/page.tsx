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
  MessageSquare,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientScope, can } from "@/lib/access";
import { reportMetrics } from "@/lib/finance";
import { deleteClient, toggleTask, addClientNote, deleteClientNote } from "@/lib/actions";
import { som, dateRu, num } from "@/lib/format";
import { paymentChip, daysToContractEnd } from "@/lib/payday";
import { dict } from "@/lib/dict";
import {
  PAYMENT_KIND,
  PAYMENT_METHOD,
  stagesFor,
} from "@/lib/constants";
import { PageHeader, Table, Collapse, Stat, Field, Section } from "@/components/ui";
import ClientForm from "@/components/ClientForm";
import ClientOverview from "@/components/ClientOverview";
import ClientStages from "@/components/ClientStages";
import ClientTabs from "@/components/ClientTabs";
import GrowthPoints from "@/components/GrowthPoints";
import ClientLinks from "@/components/ClientLinks";
import MembersBlock from "@/components/MembersBlock";
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
      snapshots: { orderBy: { takenAt: "asc" } },
      links: { orderBy: { createdAt: "desc" } },
      projectNotes: { include: { author: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!client) notFound();

  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true },
  });
  const contractors = users.filter((u) => u.role === "DEVELOPER");
  const clientOpts = [{ id: client.id, name: client.name }];
  const clientStatuses = await dict("CLIENT_STATUS");
  const links = client.links;

  const showMoney = can.seePayments(user);
  const showCard = can.seeCard(user, client);
  const paidTotal = client.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  const debtTotal = client.payments.filter((p) => p.status !== "PAID").reduce((s, p) => s + p.amount, 0);
  const paidList = client.payments.filter((p) => p.status === "PAID" && p.paidAt);
  const ownerNet = paidList.reduce((sum, p) => sum + p.ownerNet, 0);
  const firstPaymentAt = paidList.length
    ? paidList.reduce((min, p) => (p.paidAt! < min ? p.paidAt! : min), paidList[0].paidAt!)
    : null;
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

      <ClientOverview
        data={{
          avgCheck: client.avgCheck,
          paidTotal,
          ownerNet,
          profitPercent: client.profitPercent,
          openTasks: client.tasks.filter((t) => !t.done).length,
          totalTasks: client.tasks.length,
          contractStart: client.contractStart,
          firstPaymentAt,
          paymentDay: client.paymentDay,
          nextPaymentAt: client.nextPaymentAt,
        }}
        showMoney={showMoney}
        showProfit={can.seeAgencyFinance(user)}
      />

      <div className="mt-4">
        <ClientStages
          clientId={client.id}
          current={client.status}
          stages={clientStatuses}
          canEdit={can.manageClients(user)}
        />
      </div>

      <div className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-3">
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
        <Stat label="Рекламный кабинет" value={client.adAccount || "не указан"} icon={UserIcon} />
      </div>

      <ClientTabs
        visible={[
          "overview",
          "tasks",
          ...(showMoney ? (["payments"] as const) : []),
          "reports",
          "links",
          "notes",
          ...(can.editClient(user, client) ? (["settings"] as const) : []),
        ]}
        counts={{
          tasks: client.tasks.filter((t) => !t.done).length,
          payments: client.payments.length,
          reports: client.reports.length,
          links: links.length,
          notes: client.projectNotes.length,
        }}
        panels={{
          overview: (
            <div className="space-y-4">
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
                        {showCard && (
                          <Field
                            label="Карта клиента"
                            value={client.cardLast4 ? `•• ${client.cardLast4}${client.cardHolder ? ` — ${client.cardHolder}` : ""}` : "—"}
                          />
                        )}
                          <Field label="Заметки" value={client.notes || "—"} />
                      </div>
                    </div>
              <MembersBlock
                clientId={client.id}
                members={client.members}
                users={users}
                canEdit={user.role === "SUPER_ADMIN"}
                avgCheck={client.avgCheck}
              />
              <GrowthPoints
                clientId={client.id}
                snapshots={client.snapshots}
                canEdit={can.manageClients(user)}
              />
            </div>
          ),
          tasks: (
            <>
                    <Section title="Задачи проекта" icon={KanbanSquare}>
                      {user.role !== "DEVELOPER" && user.role !== "EDITOR" && (
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
                            canEdit={user.role !== "DEVELOPER" && user.role !== "EDITOR"}
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
            </>
          ),
          payments: (
            <>
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
                            ...(user.role === "SUPER_ADMIN" ? ["Владельцу"] : []),
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
                              {user.role === "SUPER_ADMIN" && <td className="td">{som(p.ownerNet)}</td>}
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
            </>
          ),
          reports: (
            <>
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
                              defaultTargetCpl={client.targetCpl}
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
            </>
          ),
          links: (
            <ClientLinks
              clientId={client.id}
              links={links}
              canEdit={can.manageClients(user)}
            />
          ),
          notes: (
            <Section title="Заметки по проекту" icon={MessageSquare}>
              <div className="space-y-3">
                {client.projectNotes.map((note) => (
                  <div key={note.id} className="group rounded-2xl border border-zinc-200 p-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium">{note.author?.name ?? "—"}</span>
                      <span className="text-[10px] text-muted">
                        {note.createdAt.toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {(user.role === "SUPER_ADMIN" || note.authorId === user.id) && (
                        <form action={deleteClientNote} className="ml-auto opacity-0 group-hover:opacity-100">
                          <input type="hidden" name="id" value={note.id} />
                          <button className="rounded p-0.5 text-zinc-300 hover:text-red-600">
                            <Trash2 size={11} />
                          </button>
                        </form>
                      )}
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-sm">{note.text}</div>
                  </div>
                ))}
                {client.projectNotes.length === 0 && (
                  <div className="text-sm text-zinc-500">Заметок пока нет</div>
                )}
              </div>

              <form action={addClientNote} className="mt-3 flex gap-2">
                <input type="hidden" name="clientId" value={client.id} />
                <input
                  type="text"
                  name="text"
                  placeholder="Написать заметку…"
                  className="input flex-1"
                  required
                />
                <button className="btn-primary !px-4">Добавить</button>
              </form>
            </Section>
          ),
          settings: (
            <>
                    {can.editClient(user, client) && (
                      <div className="mt-8">
                        <Collapse title="Редактировать карточку клиента" icon={Pencil}>
                          <ClientForm users={users} client={client} canAssignAccount={user.role === "SUPER_ADMIN"} />
                          {user.role === "SUPER_ADMIN" && (
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
            </>
          ),
        }}
      />
    </div>
  );
}
