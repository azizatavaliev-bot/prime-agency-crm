"use client";

import { useState } from "react";
import { HandCoins } from "lucide-react";
import { saveExpense } from "@/lib/actions";
import { EXPENSE_METHOD, EXPENSE_STATUS, EXPENSE_CATEGORY } from "@/lib/constants";
import { toInputDate } from "@/lib/format";
import Select from "./Select";
import DatePicker from "./DatePicker";

const toOpts = (o: Record<string, string>) => Object.entries(o).map(([key, name]) => ({ key, name }));

export default function ExpenseForm({
  clients,
  users,
  accounts = [],
  categories = [],
  expense,
}: {
  clients: { id: string; name: string }[];
  users: { id: string; name: string }[];
  accounts?: { id: string; name: string }[];
  categories?: { key: string; name: string }[];
  expense?: {
    id: string;
    title: string;
    category: string;
    amount: number;
    status: string;
    method: string;
    spentAt: Date;
    recurring: boolean;
    comment: string | null;
    clientId: string | null;
    userId: string | null;
    accountId?: string | null;
  };
}) {
  const catList = categories.length ? categories : toOpts(EXPENSE_CATEGORY);
  const [category, setCategory] = useState(expense?.category ?? catList[0]?.key ?? "OTHER");

  // «Выплаты команде» без получателя бессмысленны — подсвечиваем поле и требуем заполнить
  const isSalary = category === "SALARY";

  return (
    <form action={saveExpense} className="grid gap-4 sm:grid-cols-2">
      {expense && <input type="hidden" name="id" value={expense.id} />}
      <div className="sm:col-span-2">
        <label className="label">Что за расход *</label>
        <input
          className="input"
          name="title"
          required
          defaultValue={expense?.title}
          placeholder="Подписка на сервис аналитики"
        />
      </div>
      <div>
        <label className="label">Категория</label>
        <Select
          name="category"
          defaultValue={category}
          onChange={setCategory}
          options={catList.map((c) => ({ value: c.key, label: c.name }))}
        />
      </div>
      <div>
        <label className="label">Сумма, сом *</label>
        <input
          className="input"
          name="amount"
          type="number"
          min="0"
          step="any"
          required
          defaultValue={expense?.amount}
        />
      </div>
      <div>
        <label className="label">Статус</label>
        <Select
          name="status"
          defaultValue={expense?.status ?? "PAID"}
          options={Object.entries(EXPENSE_STATUS).map(([value, label]) => ({ value, label }))}
        />
      </div>
      <div>
        <label className="label">Дата</label>
        <DatePicker name="spentAt" defaultValue={toInputDate(expense?.spentAt ?? new Date())} />
      </div>
      <div>
        <label className="label">С какого счёта</label>
        <Select
          name="accountId"
          defaultValue={expense?.accountId ?? ""}
          placeholder="— не указан —"
          options={[
            { value: "", label: "— не указан —" },
            ...accounts.map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
      </div>
      <div>
        <label className="label">Способ оплаты</label>
        <Select
          name="method"
          defaultValue={expense?.method ?? "TRANSFER"}
          options={Object.entries(EXPENSE_METHOD).map(([value, label]) => ({ value, label }))}
        />
      </div>
      <div>
        <label className="label">Проект (если расход по клиенту)</label>
        <Select
          name="clientId"
          defaultValue={expense?.clientId ?? ""}
          placeholder="— расход агентства —"
          options={[
            { value: "", label: "— расход агентства —" },
            ...clients.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </div>
      <div className={isSalary ? "rounded-2xl accent-soft p-3 -m-1" : ""}>
        <label className="label flex items-center gap-1.5">
          {isSalary && <HandCoins size={13} className="accent-text" />}
          Кому платим {isSalary && <span className="accent-text">— обязательно для выплаты</span>}
        </label>
        <Select
          name="userId"
          required={isSalary}
          defaultValue={expense?.userId ?? ""}
          placeholder={isSalary ? "Выберите сотрудника" : "— не указано —"}
          options={[
            ...(isSalary ? [] : [{ value: "", label: "— не указано —" }]),
            ...users.map((u) => ({ value: u.id, label: u.name })),
          ]}
        />
      </div>
      <div className="flex items-end">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="recurring" defaultChecked={expense?.recurring ?? false} />
          Ежемесячный расход
        </label>
      </div>
      <div className="sm:col-span-2">
        <label className="label">Комментарий</label>
        <input className="input" name="comment" defaultValue={expense?.comment ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <button className="btn-primary">{expense ? "Сохранить" : "Добавить расход"}</button>
      </div>
    </form>
  );
}
