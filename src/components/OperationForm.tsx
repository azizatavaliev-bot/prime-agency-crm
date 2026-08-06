"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Landmark } from "lucide-react";
import { saveOperation } from "@/lib/actions";
import { som } from "@/lib/format";
import Select from "./Select";
import DatePicker from "./DatePicker";
import { toInputDate } from "@/lib/format";

type Opt = { key: string; name: string };

/**
 * Приход и расход одной формой: сверху переключатель, дальше поля общие.
 * Сумма вводится крупно — это первое, что заполняют.
 */
export default function OperationForm({
  incomeCategories,
  expenseCategories,
  accounts,
  clients,
  users,
}: {
  incomeCategories: Opt[];
  expenseCategories: Opt[];
  accounts: { id: string; name: string; balance: number }[];
  clients: { id: string; name: string }[];
  users: { id: string; name: string }[];
}) {
  const [kind, setKind] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [amount, setAmount] = useState(0);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");

  const isExpense = kind === "EXPENSE";
  const cats = isExpense ? expenseCategories : incomeCategories;
  const account = accounts.find((a) => a.id === accountId);
  const after = account ? account.balance + (isExpense ? -amount : amount) : null;
  const notEnough = isExpense && account && amount > account.balance;

  return (
    <form action={saveOperation} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />

      {/* Переключатель типа — задаёт смысл всей формы */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-subtle p-1">
        {(
          [
            { key: "INCOME", label: "Доход", icon: TrendingUp },
            { key: "EXPENSE", label: "Расход", icon: TrendingDown },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = kind === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setKind(t.key)}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? t.key === "INCOME"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-red-500 text-white shadow-sm"
                  : "text-muted hover:text-zinc-900"
              }`}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Сумма крупно, как в FADAMOS */}
      <div className="text-center">
        <input
          className="amount-big w-full border-0 bg-transparent text-center text-4xl font-semibold tracking-tight outline-none placeholder:text-zinc-300"
          name="amount"
          type="number"
          step="0.01"
          required
          autoFocus
          placeholder="0"
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
        />
        <div className="mt-1 inline-flex rounded-lg bg-subtle px-2.5 py-1 text-xs text-muted">
          сом · KGS
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Дата</label>
          <DatePicker name="when" defaultValue={toInputDate(new Date())} required />
        </div>
        <div>
          <label className="label">Категория</label>
          <Select
            name="category"
            required
            options={cats.map((c) => ({ value: c.key, label: c.name }))}
            defaultValue={cats[0]?.key}
          />
        </div>
      </div>

      <div>
        <label className="label">Назначение</label>
        <input
          className="input"
          name="title"
          placeholder={isExpense ? "За что платим" : "За что получили"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Клиент (необязательно)</label>
          <Select
            name="clientId"
            placeholder="— без клиента —"
            options={[
              { value: "", label: "— без клиента —" },
              ...clients.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
        {isExpense && (
          <div>
            <label className="label">Кому платим</label>
            <Select
              name="userId"
              placeholder="— не сотруднику —"
              options={[
                { value: "", label: "— не сотруднику —" },
                ...users.map((u) => ({ value: u.id, label: u.name })),
              ]}
            />
          </div>
        )}
      </div>

      {/* Счёт кнопками: их мало, выпадающий список тут только мешает */}
      <div>
        <label className="label flex items-center gap-1.5">
          <Landmark size={13} /> Счёт
        </label>
        <input type="hidden" name="accountId" value={accountId} />
        <div className="flex flex-wrap gap-2">
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAccountId(a.id)}
              className={`chip transition ${
                accountId === a.id
                  ? "accent-gradient border-transparent text-white"
                  : "border-zinc-200 text-muted hover:bg-subtle"
              }`}
            >
              {a.name}
            </button>
          ))}
        </div>
        {account && amount > 0 && (
          <div className={`mt-2 text-xs ${notEnough ? "text-red-600" : "text-muted"}`}>
            {notEnough
              ? `На счёте только ${som(account.balance)} — уйдёт в минус`
              : `Остаток: ${som(account.balance)} → ${som(after ?? 0)}`}
          </div>
        )}
      </div>

      <div>
        <label className="label">Описание</label>
        <textarea className="input" name="comment" rows={2} placeholder="Комментарий к операции…" />
      </div>

      <button className={`w-full ${isExpense ? "btn-primary !bg-red-500 !bg-none" : "btn-primary"}`}>
        {isExpense ? "Записать расход" : "Записать доход"}
      </button>
    </form>
  );
}
