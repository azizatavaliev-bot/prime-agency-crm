import { redirect } from "next/navigation";
import {
  Plus,
  TrendingDown,
  Wallet,
  Clock,
  Repeat,
  PiggyBank,
  CheckCircle2,
  Trash2,
  Info,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/access";
import { markExpensePaid, deleteExpense, repeatExpenses } from "@/lib/actions";
import { som, dateRu, monthKey, monthLabel, num } from "@/lib/format";
import { EXPENSE_METHOD } from "@/lib/constants";
import { dict, labelOf } from "@/lib/dict";
import { Table, Stat, Section, MiniStat } from "@/components/ui";
import FormModal from "@/components/FormModal";
import ExpenseForm from "@/components/ExpenseForm";
import { ExpenseModal, ExpenseStatusBadge } from "@/components/details";

export default async function ExpensesTab({ sp }: { sp: { month?: string; category?: string } }) {
  const user = await requireUser();
  if (!can.manageMoney(user)) redirect("/no-access");
  const month = sp.month || monthKey();

  const [expenses, payments, clients, team, accounts, customCats] = await Promise.all([
    prisma.expense.findMany({
      where: { AND: [{ periodMonth: month }, sp.category ? { category: sp.category } : {}] },
      include: { client: true, user: true, account: true },
      orderBy: { spentAt: "desc" },
    }),
    prisma.payment.findMany({ where: { periodMonth: month, status: "PAID" } }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
    prisma.account.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    dict("EXPENSE_CATEGORY"),
  ]);

  const paidExpenses = expenses.filter((e) => e.status === "PAID");
  const plannedExpenses = expenses.filter((e) => e.status === "PLANNED");
  const spent = paidExpenses.reduce((s, e) => s + e.amount, 0);
  const planned = plannedExpenses.reduce((s, e) => s + e.amount, 0);
  const recurring = expenses.filter((e) => e.recurring).reduce((s, e) => s + e.amount, 0);

  const revenue = payments.reduce((s, p) => s + p.amount, 0);
  const ownerGross = payments.reduce((s, p) => s + p.ownerNet, 0);
  const netProfit = ownerGross - spent;
  const showProfit = can.seeAgencyFinance(user); // бухгалтер прибыль владельца не видит

  const byCategory = customCats
    .map((c) => ({
      key: c.key,
      sum: paidExpenses.filter((e) => e.category === c.key).reduce((s, e) => s + e.amount, 0),
      count: paidExpenses.filter((e) => e.category === c.key).length,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.sum - a.sum);

  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(monthKey(d));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <form action={repeatExpenses}>
          <input type="hidden" name="month" value={month} />
          <button className="btn-ghost" title="Скопировать ежемесячные расходы в следующий месяц">
            <Repeat size={15} /> Повторить на след. месяц
          </button>
        </form>
        <FormModal
          label="Новый расход"
          title="Новый расход"
          icon={<Plus size={16} />}
          hint="Расход уменьшает чистую прибыль за месяц. Отметьте «ежемесячный» — и одним кликом перенесёте его в следующий месяц."
        >
          <ExpenseForm clients={clients} users={team} accounts={accounts} categories={customCats} />
        </FormModal>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="Потрачено за месяц" value={som(spent)} tone="bad" icon={TrendingDown} />
        <Stat
          label="Запланировано"
          value={som(planned)}
          hint={`${plannedExpenses.length} расходов не закрыто`}
          tone={planned ? "warn" : "good"}
          icon={Clock}
        />
        <Stat label="Постоянные расходы" value={som(recurring)} hint="повторяются каждый месяц" icon={Repeat} />
        {showProfit ? (
          <Stat
            label="Чистая прибыль владельца"
            value={som(netProfit)}
            hint={`доля владельца ${som(ownerGross)} − расходы`}
            tone={netProfit > 0 ? "good" : "bad"}
            icon={PiggyBank}
          />
        ) : (
          <Stat
            label="Выручка месяца"
            value={som(revenue)}
            hint="оплаченные счета клиентов"
            tone="good"
            icon={PiggyBank}
          />
        )}
      </div>

      {showProfit && (
        <Section title="Экономика месяца" icon={Wallet}>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <MiniStat label="Выручка" value={som(revenue)} tone="good" />
            <MiniStat label="Доля владельца до расходов" value={som(ownerGross)} />
            <MiniStat label="Расходы" value={som(spent)} tone="bad" />
            <MiniStat
              label="Осталось на руках"
              value={som(netProfit)}
              tone={netProfit > 0 ? "good" : "bad"}
            />
          </div>
          <div className="mt-3 flex gap-2 rounded-2xl bg-subtle p-3 text-xs text-muted">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              Считаем так: с каждого платежа сначала уходит доля исполнителя и резерв на развитие, остаток — ваша доля.
              Из неё вычитаются расходы этого месяца. Рентабельность по факту:{" "}
              <b>{revenue ? `${num((netProfit / revenue) * 100, 1)}%` : "—"}</b> от выручки.
            </span>
          </div>
        </Section>
      )}

      {byCategory.length > 0 && (
        <Section title="По категориям" icon={TrendingDown}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {byCategory.map((c) => (
              <div key={c.key} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{labelOf(customCats, c.key)}</span>
                  <span className="text-xs text-muted">{c.count} шт</span>
                </div>
                <div className="mt-2 text-lg font-semibold">{som(c.sum)}</div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-subtle">
                  <div
                    className="h-1.5 rounded-full bg-zinc-900"
                    style={{ width: `${spent ? Math.round((c.sum / spent) * 100) : 0}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-muted">
                  {spent ? `${num((c.sum / spent) * 100, 1)}% всех расходов` : "—"}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <form className="my-4 flex flex-wrap gap-2" action="/finance">
        <input type="hidden" name="tab" value="expenses" />
        <select className="input max-w-[180px]" name="month" defaultValue={month}>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        <select className="input max-w-[220px]" name="category" defaultValue={sp.category ?? ""}>
          <option value="">Все категории</option>
          {customCats.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="btn-ghost">Показать</button>
      </form>

      <Table head={["Расход", "Категория", "Сумма", "Статус", "Дата", "Способ", "Проект / кому", ""]}>
        {expenses.map((e) => (
          <ExpenseModal
            key={e.id}
            expense={e}
            clients={clients}
            users={team}
            accounts={accounts}
            categories={customCats}
            row={
              <>
                <td className="td font-medium">
                  {e.title}
                  {e.recurring && <span className="ml-2 text-xs text-muted">ежемесячно</span>}
                </td>
                <td className="td text-muted">{labelOf(customCats, e.category)}</td>
                <td className="td font-medium">{som(e.amount)}</td>
                <td className="td">
                  <ExpenseStatusBadge status={e.status} />
                </td>
                <td className="td">{dateRu(e.spentAt)}</td>
                <td className="td text-muted">
                  {EXPENSE_METHOD[e.method as keyof typeof EXPENSE_METHOD]}
                </td>
                <td className="td text-muted">{e.client?.name ?? e.user?.name ?? "агентство"}</td>
                <td className="td">
                  <div className="flex gap-2">
                    {e.status !== "PAID" && (
                      <form action={markExpensePaid}>
                        <input type="hidden" name="id" value={e.id} />
                        <button className="btn-ghost !px-3 !py-1 !text-xs">
                          <CheckCircle2 size={13} /> Оплачен
                        </button>
                      </form>
                    )}
                    <form action={deleteExpense}>
                      <input type="hidden" name="id" value={e.id} />
                      <button className="btn-ghost !px-2 !py-1 text-red-600">
                        <Trash2 size={13} />
                      </button>
                    </form>
                  </div>
                </td>
              </>
            }
          />
        ))}
        {expenses.length === 0 && (
          <tr>
            <td className="td text-muted" colSpan={8}>
              Расходов за этот месяц нет
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
