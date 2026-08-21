import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  KanbanSquare,
  Pencil,
  ExternalLink,
  Target,
  CalendarClock,
  User as UserIcon,
  Trash2,
  CheckCircle2,
  CircleCheck,
  CircleAlert,
  Plus,
  TrendingDown,
  LayoutGrid,
  Settings2,
  MessageSquare,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { can } from "@/lib/access";
import { reportMetrics, reportMetricValue } from "@/lib/finance";
import { isOverdue } from "@/lib/tasks";
import {
  markPaid,
  deletePayment,
  deleteReport,
  deleteClient,
  toggleTask,
  deleteTask,
  markExpensePaid,
  deleteExpense,
  addEmployeeNote,
  deleteEmployeeNote,
} from "@/lib/actions";
import { som, dateRu, num, daysUntil, targetCplLabel } from "@/lib/format";
import { paymentChip, daysToContractEnd } from "@/lib/payday";
import {
  CLIENT_STATUS,
  CLIENT_STATUS_COLOR,
  PAYMENT_KIND,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_STATUS_COLOR,
  ROLES,
  SERVICES,
  DEFAULTS,
  OBJECTIVE_METRIC_LABEL,
  stagesFor,
  EXPENSE_CATEGORY,
  EXPENSE_CATEGORY_COLOR,
  EXPENSE_METHOD,
  EXPENSE_STATUS,
  EXPENSE_STATUS_COLOR,
} from "@/lib/constants";
import ClientOverview from "./ClientOverview";
import ClientStages from "./ClientStages";
import { Avatar, Badge, Field, MiniStat, MiniTable, Section } from "@/components/ui";
import Modal from "@/components/Modal";
import ClientForm from "@/components/ClientForm";
import FormModal from "@/components/FormModal";
import MembersBlock from "@/components/MembersBlock";
import SideTabs from "@/components/SideTabs";
import PaymentForm from "@/components/PaymentForm";
import ReportForm from "@/components/ReportForm";
import TaskForm from "@/components/TaskForm";
import ExpenseForm from "@/components/ExpenseForm";
import MarkPaidButton from "@/components/MarkPaidButton";

type UserOpt = { id: string; name: string; role: string };

type PaymentRow = {
  id: string;
  kind: string;
  amount: number;
  status: string;
  method: string;
  dueAt: Date;
  paidAt: Date | null;
  periodMonth: string;
  comment: string | null;
  account?: { name: string } | null;
  execShare: number;
  reserve: number;
  ownerNet: number;
};

type ReportRow = {
  id: string;
  periodFrom: Date;
  periodTo: Date;
  objective: string;
  budget: number;
  spent: number;
  leads: number;
  actions: number;
  engagement: number;
  traffic: number;
  profileVisits: number;
  views: number;
  targetCpl: number;
  targetCpa: number | null;
  bundles: string | null;
  comment: string | null;
  screenshot?: unknown;
};

type TaskRow = {
  id: string;
  title: string;
  board: string;
  stage: string;
  dueAt: Date | null;
  comment: string | null;
  done: boolean;
  clientId: string | null;
  assigneeId: string | null;
  assignee?: { name: string } | null;
  client?: { name: string } | null;
};

export type ClientFull = {
  paymentDay?: number | null;
  contractStart?: Date | null;
  contractEnd?: Date | null;
  profitPercent?: number | null;
  id: string;
  name: string;
  niche: string | null;
  contact: string | null;
  source: string | null;
  status: string;
  avgCheck: number;
  startedAt: Date;
  services: string;
  adAccount: string | null;
  nextPaymentAt: Date | null;
  notes: string | null;
  targetologId: string | null;
  accountId: string | null;
  targetolog?: { name: string } | null;
  account?: { name: string } | null;
  goal?: string | null;
  agreement?: string | null;
  targetCpl?: number | null;
  sitePrice?: number | null;
  botPrice?: number | null;
  videoPrice?: number | null;
  payments: PaymentRow[];
  reports: ReportRow[];
  tasks: TaskRow[];
  members?: {
    id: string;
    role: string;
    rateType: string;
    rate: number;
    note: string | null;
    user: { id: string; name: string; role: string };
  }[];
  expenses?: {
    id: string;
    title: string;
    category: string;
    amount: number;
    status: string;
    spentAt: Date;
  }[];
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={CLIENT_STATUS_COLOR[status]}>
      {CLIENT_STATUS[status as keyof typeof CLIENT_STATUS]}
    </Badge>
  );
}

export function PayStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={PAYMENT_STATUS_COLOR[status]}>
      {PAYMENT_STATUS[status as keyof typeof PAYMENT_STATUS]}
    </Badge>
  );
}

export function servicesLabel(services: string) {
  return (
    services
      .split(",")
      .filter(Boolean)
      .map((s) => SERVICES[s as keyof typeof SERVICES])
      .join(", ") || "—"
  );
}

/* ------------------------------ КЛИЕНТ ------------------------------ */

type ClientDict = {
  CLIENT_STATUS: { key: string; name: string; color?: string | null }[];
  SERVICE: { key: string; name: string }[];
  SOURCE?: { key: string; name: string }[];
  NICHE?: { key: string; name: string }[];
};

export function ClientModal({
  client,
  users,
  user,
  dict,
  trigger,
  row,
  className,
}: {
  client: ClientFull;
  users: UserOpt[];
  user: SessionUser;
  dict?: ClientDict;
  trigger?: React.ReactNode;
  row?: React.ReactNode;
  className?: string;
}) {
  const showMoney = can.seePayments(user);
  const paidTotal = client.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  const debtTotal = client.payments.filter((p) => p.status !== "PAID").reduce((s, p) => s + p.amount, 0);
  const last = client.reports[0];
  const lastM = last ? reportMetrics(last) : null;
  const contractors = users.filter((u) => u.role === "DEVELOPER");
  const openTasks = client.tasks.filter((t) => !t.done).length;
  const paidList = client.payments.filter((p) => p.status === "PAID" && p.paidAt);
  const ownerNet = paidList.reduce((s, p) => s + p.ownerNet, 0);
  const firstPaymentAt = paidList.length
    ? paidList.reduce((min, p) => (p.paidAt! < min ? p.paidAt! : min), paidList[0].paidAt!)
    : null;

  return (
    <Modal
      trigger={trigger}
      row={row}
      className={className}
      width="max-w-4xl"
      avatar={<Avatar name={client.name} size={44} />}
      title={client.name}
      subtitle={`${client.niche || "ниша не указана"} · старт ${dateRu(client.startedAt)}`}
      badge={
        dict ? (
          <span
            className={`badge ${dict.CLIENT_STATUS.find((x) => x.key === client.status)?.color ?? ""}`}
          >
            {dict.CLIENT_STATUS.find((x) => x.key === client.status)?.name ?? client.status}
          </span>
        ) : (
          <StatusBadge status={client.status} />
        )
      }
    >
      <ClientOverview
        data={{
          avgCheck: client.avgCheck,
          paidTotal,
          ownerNet,
          profitPercent: client.profitPercent ?? null,
          openTasks,
          totalTasks: client.tasks.length,
          overdueTasks: client.tasks.filter((t) => isOverdue(t.dueAt, t.done)).length,
          contractStart: client.contractStart ?? null,
          contractEnd: client.contractEnd ?? null,
          firstPaymentAt,
          paymentDay: client.paymentDay ?? null,
          nextPaymentAt: client.nextPaymentAt ?? null,
          debt: debtTotal,
          pendingCount: client.payments.filter((p) => p.status !== "PAID").length,
          cpl: lastM?.cpl ?? null,
          targetCpl: client.targetCpl ?? null,
          lastReportAt: last?.periodTo ?? null,
          adAccount: client.adAccount,
        }}
        showMoney={showMoney}
        showProfit={can.seeAgencyFinance(user)}
      />

      {dict && (
        <div className="mt-4">
          <ClientStages
            clientId={client.id}
            current={client.status}
            stages={dict.CLIENT_STATUS}
            canEdit={can.manageClients(user)}
          />
        </div>
      )}

      <div className="mt-6">
        <SideTabs
          large
          tabs={[
            {
              key: "overview",
              label: "Обзор",
              icon: "overview",
              content: (
                <div className="space-y-4">
                        <Section title="Данные проекта" icon={UserIcon}>
                          <div className="grid gap-4 rounded-2xl border border-zinc-200 p-4 sm:grid-cols-2 lg:grid-cols-3">
                            <Field label="Контакт" value={client.contact || "—"} />
                            <Field label="Таргетолог" value={client.targetolog?.name ?? "не назначен"} />
                            <Field label="Аккаунт-менеджер" value={client.account?.name ?? "—"} />
                            <Field label="Источник заявки" value={client.source || "—"} />
                            <Field
                              label="Услуги"
                              value={
                                dict
                                  ? client.services
                                      .split(",")
                                      .filter(Boolean)
                                      .map((sv) => dict.SERVICE.find((x) => x.key === sv)?.name ?? sv)
                                      .join(", ") || "—"
                                  : servicesLabel(client.services)
                              }
                            />
                            <Field label="Целевой CPL" value={client.targetCpl ? som(client.targetCpl) : "—"} />
                            <Field label="Цель клиента" value={client.goal || "—"} />
                            <Field label="Договорённости" value={client.agreement || "—"} />
                            <Field
                              label="Цены доп. услуг"
                              value={
                                [
                                  client.sitePrice ? `сайт ${som(client.sitePrice)}` : null,
                                  client.botPrice ? `бот ${som(client.botPrice)}` : null,
                                  client.videoPrice ? `монтаж ${som(client.videoPrice)}` : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || "—"
                              }
                            />
                            <Field label="Заметки" value={client.notes || "—"} />
                          </div>
                        </Section>

                        {client.members && (
                          <MembersBlock
                            clientId={client.id}
                            members={client.members}
                            users={users}
                            canEdit={user.role === "SUPER_ADMIN"}
                            avgCheck={client.avgCheck}
                          />
                        )}

                </div>
              ),
            },
            ...(showMoney
              ? [
                  {
                    key: "payments",
                    label: "Оплаты",
                    icon: "payments",
                    count: client.payments.length,
                    content: (
                      <>
                              {showMoney && (
                                <Section
                                  title="История оплат"
                                  icon={Wallet}
                                  right={
                                    <FormModal
                                      label="Платёж"
                                      title={`Новый платёж — ${client.name}`}
                                      variant="ghost"
                                      icon={<Plus size={15} />}
                                      hint="Сумма делится автоматически: доля исполнителя → резерв на развитие → остаток владельцу. Статус «Ожидается» ставит напоминание за 3 дня до даты."
                                    >
                                      <PaymentForm clients={[]} contractors={contractors} fixedClientId={client.id} />
                                    </FormModal>
                                  }
                                >

                                  <MiniTable head={["Тип", "Сумма", "Статус", "План", "Оплачено", "Метод", ""]}>
                                    {client.payments.map((p) => (
                                      <tr key={p.id}>
                                        <td className="px-3 py-2 text-sm">{PAYMENT_KIND[p.kind as keyof typeof PAYMENT_KIND]}</td>
                                        <td className="px-3 py-2 text-sm font-medium whitespace-nowrap">{som(p.amount)}</td>
                                        <td className="px-3 py-2">
                                          <PayStatusBadge status={p.status} />
                                        </td>
                                        <td className="px-3 py-2 text-sm whitespace-nowrap">{dateRu(p.dueAt)}</td>
                                        <td className="px-3 py-2 text-sm whitespace-nowrap">{dateRu(p.paidAt)}</td>
                                        <td className="px-3 py-2 text-sm text-zinc-500">
                                          {PAYMENT_METHOD[p.method as keyof typeof PAYMENT_METHOD]}
                                        </td>
                                        <td className="px-3 py-2">
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
                                        <td className="px-3 py-3 text-sm text-zinc-500" colSpan={7}>
                                          Оплат пока нет
                                        </td>
                                      </tr>
                                    )}
                                  </MiniTable>
                                </Section>
                              )}

                      </>
                    ),
                  },
                ]
              : []),
            {
              key: "reports",
              label: "Отчёты",
              icon: "reports",
              count: client.reports.length,
              content: (
                <>
                        <Section
                          title="Отчёты по таргету"
                          icon={TrendingUp}
                          right={
                            can.writeReports(user) ? (
                              <FormModal
                                label="Отчёт"
                                title={`Отчёт за период — ${client.name}`}
                                variant="ghost"
                                icon={<Plus size={15} />}
                                hint="Целевой CPL — порог решения: выше него связки отключаем, ниже — масштабируем. При превышении система пришлёт алерт таргетологу и владельцу."
                              >
                                <ReportForm clients={[]} fixedClientId={client.id} defaultTargetCpl={client.targetCpl} />
                              </FormModal>
                            ) : undefined
                          }
                        >

                          <MiniTable head={["Период", "Потрачено", "Заявки", "CPL", "Цель", "Статус", ""]}>
                            {client.reports.map((r) => {
                              const m = reportMetrics(r);
                              return (
                                <tr key={r.id} className={m.inTarget === false ? "bg-red-50" : m.inTarget ? "bg-emerald-50" : ""}>
                                  <td className="px-3 py-2 text-sm whitespace-nowrap">
                                    {dateRu(r.periodFrom)} — {dateRu(r.periodTo)}
                                  </td>
                                  <td className="px-3 py-2 text-sm whitespace-nowrap">{som(r.spent)}</td>
                                  <td className="px-3 py-2 text-sm">{r.leads}</td>
                                  <td
                                    className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${
                                      m.cplOk === false ? "text-red-600" : m.cplOk ? "text-emerald-600" : ""
                                    }`}
                                  >
                                    {m.cpl ? `${num(m.cpl)} сом` : "—"}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-zinc-500 whitespace-nowrap">{targetCplLabel(r.targetCpl)}</td>
                                  <td className="px-3 py-2 text-sm whitespace-nowrap">
                                    {m.inTarget === null ? (
                                      "—"
                                    ) : m.inTarget ? (
                                      <span className="inline-flex items-center gap-1.5 text-emerald-600">
                                        <CircleCheck size={14} /> в цели
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 text-red-600">
                                        <CircleAlert size={14} /> превышение
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <Link href={`/reports/${r.id}`} className="btn-ghost !px-2.5 !py-1 !text-xs">
                                        <ExternalLink size={13} /> Клиенту
                                      </Link>
                                      {can.writeReports(user) && (
                                        <>
                                          <FormModal
                                            label="Изменить"
                                            title={`Отчёт за период — ${client.name}`}
                                            variant="ghost"
                                            icon={<Pencil size={13} />}
                                            hint="Если ошиблись в цифрах — поправьте и сохраните заново."
                                          >
                                            <ReportForm
                                              clients={[]}
                                              fixedClientId={client.id}
                                              defaultTargetCpl={client.targetCpl}
                                              report={r}
                                            />
                                          </FormModal>
                                          <form action={deleteReport}>
                                            <input type="hidden" name="id" value={r.id} />
                                            <button className="btn-ghost !px-2.5 !py-1 !text-xs text-red-600 hover:bg-red-50">
                                              <Trash2 size={13} /> Удалить
                                            </button>
                                          </form>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {client.reports.length === 0 && (
                              <tr>
                                <td className="px-3 py-3 text-sm text-zinc-500" colSpan={7}>
                                  Отчётов пока нет
                                </td>
                              </tr>
                            )}
                          </MiniTable>
                        </Section>

                        {client.expenses && client.expenses.length > 0 && (
                          <Section
                            title="Расходы по проекту"
                            icon={TrendingDown}
                            right={
                              <span className="text-xs text-muted">
                                всего {som(client.expenses.reduce((s, e) => s + e.amount, 0))}
                              </span>
                            }
                          >
                            <MiniTable head={["Расход", "Категория", "Сумма", "Статус", "Дата"]}>
                              {client.expenses.map((e) => (
                                <tr key={e.id}>
                                  <td className="px-3 py-2 text-sm">{e.title}</td>
                                  <td className="px-3 py-2">
                                    <ExpenseCategoryBadge category={e.category} />
                                  </td>
                                  <td className="px-3 py-2 text-sm font-medium whitespace-nowrap">{som(e.amount)}</td>
                                  <td className="px-3 py-2">
                                    <ExpenseStatusBadge status={e.status} />
                                  </td>
                                  <td className="px-3 py-2 text-sm text-muted whitespace-nowrap">{dateRu(e.spentAt)}</td>
                                </tr>
                              ))}
                            </MiniTable>
                          </Section>
                        )}

                </>
              ),
            },
            {
              key: "tasks",
              label: "Задачи",
              icon: "tasks",
              count: openTasks,
              content: (
                <>
                        <Section
                          title="Задачи проекта"
                          icon={KanbanSquare}
                          right={
                            user.role !== "DEVELOPER" ? (
                              <FormModal
                                label="Задача"
                                title={`Новая задача — ${client.name}`}
                                variant="ghost"
                                icon={<Plus size={15} />}
                                hint="Этапы доски «Таргет» повторяют конвейер заявок: бриф → гипотезы → съёмка → тест → отсев → масштаб."
                              >
                                <TaskForm
                                  clients={[]}
                                  users={users}
                                  fixedClientId={client.id}
                                  defaultAssigneeId={client.targetologId ?? client.accountId}
                                />
                              </FormModal>
                            ) : undefined
                          }
                        >

                          <MiniTable head={["Задача", "Доска", "Этап", "Ответственный", "Дедлайн", ""]}>
                            {client.tasks.map((t) => (
                              <tr key={t.id} className={t.done ? "opacity-50" : ""}>
                                <td className={`px-3 py-2 text-sm ${t.done ? "line-through" : ""}`}>{t.title}</td>
                                <td className="px-3 py-2 text-sm text-zinc-500">{t.board}</td>
                                <td className="px-3 py-2 text-sm whitespace-nowrap">{stagesFor(t.board)[t.stage] ?? t.stage}</td>
                                <td className="px-3 py-2 text-sm">{t.assignee?.name ?? "—"}</td>
                                <td className="px-3 py-2 text-sm text-zinc-500 whitespace-nowrap">{dateRu(t.dueAt)}</td>
                                <td className="px-3 py-2">
                                  <form action={toggleTask}>
                                    <input type="hidden" name="id" value={t.id} />
                                    <button className="btn-ghost !px-2.5 !py-1 !text-xs">
                                      <CheckCircle2 size={13} /> {t.done ? "Вернуть" : "Готово"}
                                    </button>
                                  </form>
                                </td>
                              </tr>
                            ))}
                            {client.tasks.length === 0 && (
                              <tr>
                                <td className="px-3 py-3 text-sm text-zinc-500" colSpan={6}>
                                  Задач пока нет
                                </td>
                              </tr>
                            )}
                          </MiniTable>
                        </Section>

                </>
              ),
            },
            ...(can.editClient(user, client)
              ? [
                  {
                    key: "settings",
                    label: "Правка",
                    icon: "settings",
                    content: (
                      <>
                              {can.editClient(user, client) && (
                                <Section title="Управление" icon={Pencil}>
                                  <div className="flex flex-wrap gap-2">
                                    <FormModal
                                      label="Редактировать карточку"
                                      title={`Карточка клиента — ${client.name}`}
                                      width="max-w-4xl"
                                      icon={<Pencil size={16} />}
                                      hint="Цель и договорённости видны всей команде проекта — это основа для отчётов и задач."
                                    >
                                      <ClientForm
                                      users={users}
                                      client={client}
                                      canAssignAccount={user.role === "SUPER_ADMIN"}
                                      statuses={dict?.CLIENT_STATUS}
                                      services={dict?.SERVICE}
                                      sources={dict?.SOURCE}
                                      niches={dict?.NICHE}
                                    />
                                      {user.role === "SUPER_ADMIN" && (
                                        <form action={deleteClient} className="mt-6 border-t border-zinc-200 pt-4">
                                          <input type="hidden" name="id" value={client.id} />
                                          <button className="btn-ghost text-red-600">
                                            <Trash2 size={15} /> Удалить клиента и все его данные
                                          </button>
                                        </form>
                                      )}
                                    </FormModal>
                                    <Link href={`/clients/${client.id}`} className="btn-ghost btn-modal">
                                      <ExternalLink size={15} /> Открыть страницей
                                    </Link>
                                  </div>
                                </Section>
                              )}
                      </>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>
    </Modal>
  );
}

/* ------------------------------ ПЛАТЁЖ ------------------------------ */

export function PaymentModal({
  payment,
  clientName,
  clientId,
  isOwner,
  trigger,
  row,
  className,
}: {
  payment: PaymentRow;
  clientName: string;
  clientId: string;
  isOwner: boolean;
  trigger?: React.ReactNode;
  row?: React.ReactNode;
  className?: string;
}) {
  const d = daysUntil(payment.dueAt);
  return (
    <Modal
      trigger={trigger}
      row={row}
      className={className}
      width="max-w-xl"
      title={`${PAYMENT_KIND[payment.kind as keyof typeof PAYMENT_KIND]} · ${som(payment.amount)}`}
      subtitle={clientName}
      badge={<PayStatusBadge status={payment.status} />}
    >
      <div className="grid gap-3 grid-cols-2">
        <MiniStat label="Сумма" value={som(payment.amount)} />
        <MiniStat
          label={payment.status === "PAID" ? "Оплачено" : "Осталось до оплаты"}
          value={
            payment.status === "PAID"
              ? dateRu(payment.paidAt)
              : d === null
                ? "—"
                : d < 0
                  ? `просрочено ${-d} дн.`
                  : `${d} дн.`
          }
          tone={payment.status === "PAID" ? "good" : d !== null && d < 0 ? "bad" : "warn"}
        />
      </div>

      <Section title="Детали платежа" icon={Wallet}>
        <div className="grid gap-4 rounded-2xl border border-zinc-200 p-4 sm:grid-cols-2">
          <Field label="Плановая дата" value={dateRu(payment.dueAt)} />
          <Field label="Метод" value={PAYMENT_METHOD[payment.method as keyof typeof PAYMENT_METHOD]} />
          <Field label="Месяц выручки" value={payment.periodMonth} />
          <Field label="Счёт" value={payment.account?.name ?? "не указан"} />
          <Field label="Комментарий" value={payment.comment || "—"} />
        </div>
      </Section>

      {isOwner && (
        <Section title="Распределение" icon={Target}>
          <div className="grid gap-3 grid-cols-3">
            <MiniStat label="Исполнителю" value={som(payment.execShare)} />
            <MiniStat label="Резерв" value={som(payment.reserve)} />
            <MiniStat label="Владельцу" value={som(payment.ownerNet)} tone="good" />
          </div>
        </Section>
      )}

      <div className="mt-6 flex flex-wrap gap-2 border-t border-zinc-200 pt-4">
        {payment.status !== "PAID" && (
          <MarkPaidButton
            paymentId={payment.id}
            clientName={clientName}
            amount={som(payment.amount)}
            dueAt={dateRu(payment.dueAt)}
          />
        )}
        <Link href={`/clients/${clientId}`} className="btn-ghost">
          <ExternalLink size={15} /> К клиенту
        </Link>
        {isOwner && (
          <form action={deletePayment}>
            <input type="hidden" name="id" value={payment.id} />
            <button className="btn-ghost text-red-600">
              <Trash2 size={15} /> Удалить
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------ ОТЧЁТ ------------------------------ */

export function ReportModal({
  report,
  clientName,
  clientId,
  canEdit,
  defaultTargetCpl,
  usdRate = DEFAULTS.usdRate,
  trigger,
  row,
  className,
}: {
  report: ReportRow;
  clientName: string;
  clientId: string;
  canEdit: boolean;
  defaultTargetCpl?: number | null;
  usdRate?: number;
  trigger?: React.ReactNode;
  row?: React.ReactNode;
  className?: string;
}) {
  const m = reportMetrics(report);
  return (
    <Modal
      trigger={trigger}
      row={row}
      className={className}
      width="max-w-2xl"
      title={clientName}
      subtitle={`Период ${dateRu(report.periodFrom)} — ${dateRu(report.periodTo)}`}
      badge={
        <Badge
          className={
            m.inTarget === null
              ? ""
              : m.inTarget
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-red-100 text-red-700 border-red-200"
          }
        >
          {m.inTarget === null ? "нет заявок" : m.inTarget ? "в цели" : "превышение порога"}
        </Badge>
      }
    >
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <MiniStat label="Потрачено" value={som(report.spent)} hint={`≈ $${num(report.spent / usdRate)}`} />
        <MiniStat label={OBJECTIVE_METRIC_LABEL[report.objective] ?? "Результат"} value={String(reportMetricValue(report))} />
        <MiniStat label="Показы" value={report.views ? String(report.views) : "—"} />
        <MiniStat
          label="CPL"
          value={m.cpl ? `${num(m.cpl)} сом` : "—"}
          tone={m.cplOk === false ? "bad" : m.cplOk ? "good" : "default"}
        />
        <MiniStat
          label="CPA"
          value={m.cpa ? `${num(m.cpa)} сом` : "—"}
          tone={m.cpaOk === false ? "bad" : m.cpaOk ? "good" : "default"}
        />
      </div>

      <Section title="Пороги решения и связки" icon={Target}>
        <div className="grid gap-4 rounded-2xl border border-zinc-200 p-4 sm:grid-cols-2">
          <Field label="Рекламный бюджет" value={som(report.budget)} />
          <Field label="Целевых действий" value={String(report.actions)} />
          <Field label="Целевой CPL" value={targetCplLabel(report.targetCpl)} />
          <Field label="Целевой CPA" value={report.targetCpa ? som(report.targetCpa) : "—"} />
          <Field label="Статус связок" value={report.bundles || "—"} />
          <Field label="Комментарий" value={report.comment || "—"} />
        </div>
      </Section>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-zinc-200 pt-4">
        <Link href={`/reports/${report.id}`} className="btn-primary">
          <ExternalLink size={16} /> Отчёт для клиента
        </Link>
        <Link href={`/clients/${clientId}`} className="btn-ghost">
          К клиенту
        </Link>
        {canEdit && (
          <>
            <FormModal
              label="Изменить"
              title={`Отчёт за период — ${clientName}`}
              variant="ghost"
              icon={<Pencil size={15} />}
              hint="Если ошиблись в цифрах, цели или скриншоте — поправьте и сохраните заново."
            >
              <ReportForm
                clients={[]}
                fixedClientId={clientId}
                defaultTargetCpl={defaultTargetCpl}
                report={{ ...report, hasScreenshot: Boolean(report.screenshot) }}
              />
            </FormModal>
            <form action={deleteReport}>
              <input type="hidden" name="id" value={report.id} />
              <button className="btn-ghost text-red-600">
                <Trash2 size={15} /> Удалить
              </button>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------ ЗАДАЧА ------------------------------ */

export function TaskModal({
  task,
  clients,
  users,
  canEdit,
  stagesByBoard,
  trigger,
  row,
  className,
}: {
  task: TaskRow;
  clients: { id: string; name: string }[];
  users: UserOpt[];
  canEdit: boolean;
  stagesByBoard?: Record<string, { key: string; name: string }[]>;
  trigger?: React.ReactNode;
  row?: React.ReactNode;
  className?: string;
}) {
  const d = daysUntil(task.dueAt);
  return (
    <Modal
      trigger={trigger}
      row={row}
      className={className}
      width="max-w-2xl"
      title={task.title}
      subtitle={task.client?.name ?? "без клиента"}
      badge={
        <Badge
          className={
            task.done
              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
              : d !== null && d < 0
                ? "bg-red-100 text-red-700 border-red-200"
                : ""
          }
        >
          {task.done
            ? "выполнена"
            : stagesByBoard?.[task.board]?.find((s) => s.key === task.stage)?.name ??
              stagesFor(task.board)[task.stage] ??
              task.stage}
        </Badge>
      }
    >
      <div className="grid gap-4 rounded-2xl border border-zinc-200 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Ответственный" value={task.assignee?.name ?? "не назначен"} />
        <Field label="Дедлайн" value={dateRu(task.dueAt)} />
        <Field
          label="Срок"
          value={
            task.done ? "выполнена" : d === null ? "—" : d < 0 ? `просрочено ${-d} дн.` : `осталось ${d} дн.`
          }
        />
        <Field label="Комментарий" value={task.comment || "—"} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <form action={toggleTask}>
          <input type="hidden" name="id" value={task.id} />
          <button className="btn-primary">
            <CheckCircle2 size={16} /> {task.done ? "Вернуть в работу" : "Отметить выполненной"}
          </button>
        </form>
        {task.clientId && (
          <Link href={`/clients/${task.clientId}`} className="btn-ghost">
            <ExternalLink size={15} /> К клиенту
          </Link>
        )}
        {canEdit && (
          <form action={deleteTask}>
            <input type="hidden" name="id" value={task.id} />
            <button className="btn-ghost text-red-600">
              <Trash2 size={15} /> Удалить
            </button>
          </form>
        )}
      </div>

      {canEdit && (
        <Section title="Изменить задачу" icon={Pencil}>
          <TaskForm clients={clients} users={users} task={task} stagesByBoard={stagesByBoard} />
        </Section>
      )}
    </Modal>
  );
}

/* ------------------------------ СОТРУДНИК ------------------------------ */

export function TeamModal({
  member,
  projects,
  tasks,
  payout,
  limit,
  trigger,
  row,
  className,
  children,
  notes,
  canManageNotes,
}: {
  member: { id: string; name: string; email: string; role: string; rate: number | null; rateType: string; projectLimit: number; active: boolean };
  projects: { id: string; name: string; status: string; avgCheck: number }[];
  tasks: TaskRow[];
  payout: number;
  limit: number;
  trigger?: React.ReactNode;
  row?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  notes?: { id: string; text: string; createdAt: Date; authorId: string | null; author: { name: string } | null }[];
  canManageNotes?: boolean;
}) {
  const load = projects.filter((p) => ["TEST", "ACTIVE", "RISK"].includes(p.status)).length;
  const pct = Math.round((load / limit) * 100);
  const openTasks = tasks.filter((t) => !t.done).length;

  return (
    <Modal
      trigger={trigger}
      row={row}
      className={className}
      width="max-w-3xl"
      avatar={<Avatar name={member.name} size={44} />}
      title={member.name}
      subtitle={member.email}
      badge={<Badge>{ROLES[member.role as keyof typeof ROLES]}</Badge>}
    >
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <MiniStat
          label="Загрузка"
          value={`${load} из ${limit}`}
          tone={pct >= 100 ? "bad" : pct >= 80 ? "warn" : "good"}
        />
        <MiniStat label="Открытых задач" value={String(openTasks)} />
        <MiniStat
          label="Ставка"
          value={member.rate ? (member.rateType === "PERCENT" ? `${member.rate}%` : som(member.rate)) : "—"}
        />
        <MiniStat label="К выплате за месяц" value={som(payout)} tone="good" />
      </div>

      <Section title="Назначенные проекты" icon={KanbanSquare}>
        <MiniTable head={["Клиент", "Статус", "Чек"]}>
          {projects.map((p) => (
            <tr key={p.id}>
              <td className="px-3 py-2 text-sm font-medium">{p.name}</td>
              <td className="px-3 py-2">
                <StatusBadge status={p.status} />
              </td>
              <td className="px-3 py-2 text-sm whitespace-nowrap">{som(p.avgCheck)}</td>
            </tr>
          ))}
          {projects.length === 0 && (
            <tr>
              <td className="px-3 py-3 text-sm text-zinc-500" colSpan={3}>
                Проектов нет
              </td>
            </tr>
          )}
        </MiniTable>
      </Section>

      <Section title="Задачи в работе" icon={CalendarClock}>
        <MiniTable head={["Задача", "Клиент", "Этап", "Дедлайн"]}>
          {tasks.filter((t) => !t.done).slice(0, 15).map((t) => (
            <tr key={t.id}>
              <td className="px-3 py-2 text-sm">{t.title}</td>
              <td className="px-3 py-2 text-sm text-zinc-500">{t.client?.name ?? "—"}</td>
              <td className="px-3 py-2 text-sm whitespace-nowrap">{stagesFor(t.board)[t.stage] ?? t.stage}</td>
              <td className="px-3 py-2 text-sm text-zinc-500 whitespace-nowrap">{dateRu(t.dueAt)}</td>
            </tr>
          ))}
          {openTasks === 0 && (
            <tr>
              <td className="px-3 py-3 text-sm text-zinc-500" colSpan={4}>
                Открытых задач нет
              </td>
            </tr>
          )}
        </MiniTable>
      </Section>

      {notes && (
        <Section title="Заметки о сотруднике" icon={MessageSquare}>
          <div className="space-y-3">
            {notes.map((note) => (
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
                  {canManageNotes && (
                    <form action={deleteEmployeeNote} className="ml-auto opacity-0 group-hover:opacity-100">
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
            {notes.length === 0 && <div className="text-sm text-zinc-500">Заметок пока нет</div>}
          </div>

          {canManageNotes && (
            <form action={addEmployeeNote} className="mt-3 flex gap-2">
              <input type="hidden" name="userId" value={member.id} />
              <input type="text" name="text" placeholder="Написать заметку…" className="input flex-1" required />
              <button className="btn-primary !px-4">Добавить</button>
            </form>
          )}
        </Section>
      )}

      {children && (
        <Section title="Изменить сотрудника" icon={Pencil}>
          {children}
        </Section>
      )}
    </Modal>
  );
}


/* ------------------------------ РАСХОД ------------------------------ */

export type ExpenseRow = {
  id: string;
  title: string;
  category: string;
  amount: number;
  status: string;
  method: string;
  spentAt: Date;
  periodMonth: string;
  recurring: boolean;
  comment: string | null;
  clientId: string | null;
  userId: string | null;
  accountId?: string | null;
  client?: { name: string } | null;
  user?: { name: string } | null;
  account?: { name: string } | null;
};

export function ExpenseCategoryBadge({ category }: { category: string }) {
  return (
    <Badge className={EXPENSE_CATEGORY_COLOR[category]}>
      {EXPENSE_CATEGORY[category as keyof typeof EXPENSE_CATEGORY]}
    </Badge>
  );
}

export function ExpenseStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={EXPENSE_STATUS_COLOR[status]}>
      {EXPENSE_STATUS[status as keyof typeof EXPENSE_STATUS]}
    </Badge>
  );
}

export function ExpenseModal({
  expense,
  clients,
  users,
  accounts = [],
  categories = [],
  trigger,
  row,
  className,
}: {
  expense: ExpenseRow;
  clients: { id: string; name: string }[];
  users: { id: string; name: string }[];
  accounts?: { id: string; name: string }[];
  categories?: { key: string; name: string }[];
  trigger?: React.ReactNode;
  row?: React.ReactNode;
  className?: string;
}) {
  const d = daysUntil(expense.spentAt);
  return (
    <Modal
      trigger={trigger}
      row={row}
      className={className}
      width="max-w-2xl"
      title={`${expense.title} · ${som(expense.amount)}`}
      subtitle={expense.client?.name ?? "расход агентства"}
      badge={<ExpenseStatusBadge status={expense.status} />}
    >
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <MiniStat label="Сумма" value={som(expense.amount)} tone="bad" />
        <MiniStat
          label={expense.status === "PAID" ? "Оплачен" : "До оплаты"}
          value={
            expense.status === "PAID"
              ? dateRu(expense.spentAt)
              : d === null
                ? "—"
                : d < 0
                  ? `просрочен ${-d} дн.`
                  : `${d} дн.`
          }
          tone={expense.status === "PAID" ? "default" : d !== null && d < 0 ? "bad" : "warn"}
        />
        <MiniStat label="Повтор" value={expense.recurring ? "каждый месяц" : "разовый"} />
      </div>

      <Section title="Детали расхода" icon={Wallet}>
        <div className="grid gap-4 rounded-2xl border border-zinc-200 p-4 sm:grid-cols-2">
          <Field label="Категория" value={<ExpenseCategoryBadge category={expense.category} />} />
          <Field label="Способ оплаты" value={EXPENSE_METHOD[expense.method as keyof typeof EXPENSE_METHOD]} />
          <Field label="Месяц учёта" value={expense.periodMonth} />
          <Field label="Получатель" value={expense.user?.name ?? "—"} />
          <Field label="Счёт" value={expense.account?.name ?? "не указан"} />
          <Field label="Проект" value={expense.client?.name ?? "расход агентства"} />
          <Field label="Комментарий" value={expense.comment || "—"} />
        </div>
      </Section>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-zinc-200 pt-4">
        {expense.status !== "PAID" && (
          <form action={markExpensePaid}>
            <input type="hidden" name="id" value={expense.id} />
            <button className="btn-primary">
              <CheckCircle2 size={16} /> Отметить оплату
            </button>
          </form>
        )}
        {expense.clientId && (
          <Link href={`/clients/${expense.clientId}`} className="btn-ghost">
            <ExternalLink size={15} /> К клиенту
          </Link>
        )}
        <form action={deleteExpense}>
          <input type="hidden" name="id" value={expense.id} />
          <button className="btn-ghost text-red-600">
            <Trash2 size={15} /> Удалить
          </button>
        </form>
      </div>

      <Section title="Изменить расход" icon={Pencil}>
        <ExpenseForm
          clients={clients}
          users={users}
          accounts={accounts}
          categories={categories}
          expense={expense}
        />
      </Section>
    </Modal>
  );
}
