import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Plus,
  Wallet,
  Banknote,
  CreditCard,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Landmark,
  AlertCircle,
  Trash2,
  Info,
  Pencil,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/access";
import { accountBalances, cashflow } from "@/lib/accounts";
import {
  saveAccount,
  deleteAccount,
  deleteTransfer,
  deleteIncome,
} from "@/lib/actions";
import { som, dateRu, monthKey, monthLabel } from "@/lib/format";
import { LEDGER_KIND } from "@/lib/constants";
import { dicts, labelOf } from "@/lib/dict";
import { PageHeader, Table, Stat, Section, Badge, MiniStat } from "@/components/ui";
import FormModal from "@/components/FormModal";
import IncomeForm from "@/components/IncomeForm";
import TransferForm from "@/components/TransferForm";

export const dynamic = "force-dynamic";

const KIND_ICON = { CASH: Banknote, BANK: Landmark, CARD: CreditCard } as const;



export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; account?: string; kind?: string }>;
}) {
  const user = await requireUser();
  if (!can.manageMoney(user)) redirect("/no-access");
  const sp = await searchParams;
  const month = sp.month || monthKey();

  const [accounts, flow, clients, d] = await Promise.all([
    accountBalances(),
    cashflow(month),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    dicts(["INCOME_CATEGORY", "EXPENSE_CATEGORY", "PAYMENT_KIND", "ACCOUNT_KIND"]),
  ]);

  const categoryLabel = (kind: string, key: string | null) => {
    if (!key) return "—";
    if (kind === "EXPENSE") return labelOf(d.EXPENSE_CATEGORY, key);
    if (kind === "PAYMENT") return labelOf(d.PAYMENT_KIND, key);
    if (kind === "INCOME") return labelOf(d.INCOME_CATEGORY, key);
    return key;
  };

  const activeAccounts = accounts.filter((a) => a.active);
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const lowAccounts = accounts.filter((a) => a.low && a.active);

  let rows = flow.rows;
  if (sp.account) rows = rows.filter((r) => r.accountName === sp.account);
  if (sp.kind) rows = rows.filter((r) => r.kind === sp.kind);

  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(monthKey(d));
  }

  const incomeCats = d.INCOME_CATEGORY;

  const accountForm = (a?: (typeof accounts)[number]) => (
    <form action={saveAccount} className="grid gap-4 sm:grid-cols-2">
      {a && <input type="hidden" name="id" value={a.id} />}
      <div>
        <label className="label">Название *</label>
        <input className="input" name="name" required defaultValue={a?.name} placeholder="Касса, Оптима, Мбанк" />
      </div>
      <div>
        <label className="label">Тип счёта</label>
        <select className="input" name="kind" defaultValue={a?.kind ?? "CASH"}>
          {d.ACCOUNT_KIND.map((k) => (
            <option key={k.key} value={k.key}>
              {k.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Начальный остаток, сом</label>
        <input className="input" name="opening" type="number" step="any" defaultValue={a?.opening ?? 0} />
      </div>
      <div>
        <label className="label">Минимальный остаток, сом</label>
        <input
          className="input"
          name="minBalance"
          type="number"
          step="any"
          defaultValue={a?.minBalance ?? ""}
          placeholder="предупредим, если ниже"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Заметка</label>
        <input className="input" name="note" defaultValue={a?.note ?? ""} />
      </div>
      <div className="flex items-end">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={a?.active ?? true} /> Активен
        </label>
      </div>
      <div className="sm:col-span-2">
        <button className="btn-primary">{a ? "Сохранить" : "Добавить счёт"}</button>
      </div>
    </form>
  );

  return (
    <div>
      <PageHeader
        title="Финансы"
        subtitle={`${monthLabel(month)} · счета, приходы, расходы и переводы в одном журнале`}
        right={
          <div className="flex flex-wrap gap-2">
            <FormModal
              label="Приход"
              title="Новый приход"
              variant="ghost"
              icon={<ArrowDownLeft size={15} />}
              hint="Это приход, не связанный с абонплатой клиента: возврат, партнёрские, продажа, внесение своих денег. Оплаты клиентов заводятся в разделе «Оплаты»."
            >
              <IncomeForm categories={incomeCats} accounts={activeAccounts} clients={clients} />
            </FormModal>

            <FormModal
              label="Перевод"
              title="Перевод между счетами"
              variant="ghost"
              icon={<ArrowLeftRight size={15} />}
              hint="Перевод не меняет прибыль — деньги просто переезжают с одного счёта на другой (например, снял с банка в кассу)."
            >
              <TransferForm accounts={activeAccounts} />
            </FormModal>

            <FormModal label="Счёт" title="Новый счёт" icon={<Plus size={16} />} hint="Счёт — это где лежат деньги: касса, банковский счёт, карта. Баланс считается автоматически из оплат, приходов, расходов и переводов.">
              {accountForm()}
            </FormModal>
          </div>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="Остаток на счетах" value={som(totalBalance)} tone={totalBalance > 0 ? "good" : "bad"} icon={Wallet} />
        <Stat label="Приход за месяц" value={som(flow.income)} tone="good" icon={TrendingUp} />
        <Stat label="Расход за месяц" value={som(flow.expense)} tone="bad" icon={TrendingDown} />
        <Stat
          label="Денежный поток"
          value={som(flow.profit)}
          hint={`ждём: +${som(flow.plannedIn)} / −${som(flow.plannedOut)}`}
          tone={flow.profit >= 0 ? "good" : "bad"}
          icon={ArrowLeftRight}
        />
      </div>

      {lowAccounts.length > 0 && (
        <div className="mt-4 flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>
            Ниже минимального остатка:{" "}
            {lowAccounts.map((a) => `${a.name} (${som(a.balance)} при минимуме ${som(a.minBalance ?? 0)})`).join(", ")}
          </span>
        </div>
      )}

      <Section title="Счета" icon={Wallet}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => {
            const Icon = KIND_ICON[a.kind as keyof typeof KIND_ICON] ?? Wallet;
            return (
              <div key={a.id} className={`card p-4 ${a.active ? "" : "opacity-50"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className="text-muted" />
                    <span className="font-medium">{a.name}</span>
                  </div>
                  <Badge>{labelOf(d.ACCOUNT_KIND, a.kind)}</Badge>
                </div>
                <div className={`mt-2 text-xl font-semibold ${a.low ? "text-amber-600" : ""}`}>
                  {som(a.balance)}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
                  <span className="text-emerald-600">+ {som(a.income + a.transferIn)}</span>
                  <span className="text-red-600">− {som(a.expense + a.transferOut)}</span>
                </div>
                {a.note && <div className="mt-2 text-xs text-muted">{a.note}</div>}
                <div className="mt-3 flex gap-2">
                  <FormModal
                    label="Изменить"
                    title={`Счёт — ${a.name}`}
                    variant="ghost"
                    icon={<Pencil size={14} />}
                  >
                    {accountForm(a)}
                  </FormModal>
                  <form action={deleteAccount}>
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      className="btn-ghost !px-2.5 !py-2 text-red-600"
                      title="Счёт с операциями будет просто деактивирован"
                    >
                      <Trash2 size={14} />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
          {accounts.length === 0 && (
            <div className="card p-4 text-sm text-muted">
              Счетов пока нет — добавьте кассу и банковский счёт, чтобы видеть реальные остатки
            </div>
          )}
        </div>
      </Section>

      <Section title="Журнал операций" icon={ArrowLeftRight}>
        <div className="mb-3 flex gap-2 rounded-2xl bg-subtle p-3 text-xs text-muted">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            Здесь всё движение денег за месяц: оплаты клиентов, прочие приходы, расходы и переводы между счетами.
            Переводы не влияют на прибыль — они только меняют, где лежат деньги.
          </span>
        </div>

        <form className="mb-3 flex flex-wrap gap-2">
          <select className="input max-w-[180px]" name="month" defaultValue={month}>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
          <select className="input max-w-[180px]" name="account" defaultValue={sp.account ?? ""}>
            <option value="">Все счета</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
          <select className="input max-w-[180px]" name="kind" defaultValue={sp.kind ?? ""}>
            <option value="">Все операции</option>
            {Object.entries(LEDGER_KIND).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button className="btn-ghost">Показать</button>
        </form>

        <div className="mb-3 grid gap-3 grid-cols-2 lg:grid-cols-4">
          <MiniStat label="Операций" value={String(rows.length)} />
          <MiniStat
            label="Приходы"
            value={som(rows.filter((r) => r.direction === "IN" && r.status === "PAID").reduce((s, r) => s + r.amount, 0))}
            tone="good"
          />
          <MiniStat
            label="Расходы"
            value={som(rows.filter((r) => r.direction === "OUT" && r.status === "PAID").reduce((s, r) => s + r.amount, 0))}
            tone="bad"
          />
          <MiniStat
            label="Переводы"
            value={som(rows.filter((r) => r.direction === "MOVE").reduce((s, r) => s + r.amount, 0))}
          />
        </div>

        <Table head={["Дата", "Операция", "Тип", "Счёт", "Сумма", "", ""]}>
          {rows.map((r) => (
            <tr key={`${r.kind}-${r.id}`}>
              <td className="td text-muted">{dateRu(r.date)}</td>
              <td className="td">
                <div className="font-medium">
                  {r.link ? (
                    <Link href={r.link} className="hover:underline">
                      {r.title}
                    </Link>
                  ) : (
                    r.title
                  )}
                </div>
                {r.category && (
                  <div className="text-xs text-muted">{categoryLabel(r.kind, r.category)}</div>
                )}
              </td>
              <td className="td">
                <Badge
                  className={
                    r.direction === "IN"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : r.direction === "OUT"
                        ? "bg-red-100 text-red-700 border-red-200"
                        : "bg-sky-100 text-sky-700 border-sky-200"
                  }
                >
                  {LEDGER_KIND[r.kind]}
                </Badge>
              </td>
              <td className="td text-muted">
                {r.kind === "TRANSFER" ? `${r.accountName} → ${r.toAccountName}` : (r.accountName ?? "—")}
              </td>
              <td
                className={`td font-medium ${
                  r.direction === "IN" ? "text-emerald-600" : r.direction === "OUT" ? "text-red-600" : ""
                }`}
              >
                {r.direction === "IN" ? "+" : r.direction === "OUT" ? "−" : "±"} {som(r.amount)}
              </td>
              <td className="td text-xs">
                {r.status === "PAID" ? (
                  <span className="text-muted">проведена</span>
                ) : (
                  <span className="text-amber-600">ждём</span>
                )}
              </td>
              <td className="td">
                {r.kind === "TRANSFER" && (
                  <form action={deleteTransfer}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn-ghost !px-2 !py-1 text-red-600">
                      <Trash2 size={13} />
                    </button>
                  </form>
                )}
                {r.kind === "INCOME" && (
                  <form action={deleteIncome}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn-ghost !px-2 !py-1 text-red-600">
                      <Trash2 size={13} />
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="td text-muted" colSpan={7}>
                Операций за этот месяц нет
              </td>
            </tr>
          )}
        </Table>
      </Section>

      <Section title="Итог месяца" icon={ArrowUpRight}>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <MiniStat label="Пришло" value={som(flow.income)} tone="good" />
          <MiniStat label="Ушло" value={som(flow.expense)} tone="bad" />
          <MiniStat label="Разница" value={som(flow.profit)} tone={flow.profit >= 0 ? "good" : "bad"} />
          <MiniStat label="Остаток на счетах" value={som(totalBalance)} />
        </div>
      </Section>
    </div>
  );
}
