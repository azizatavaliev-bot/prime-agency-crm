"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Landmark,
  Megaphone,
  Users,
  Repeat,
  Building2,
  Receipt,
  GraduationCap,
  Wallet,
  Undo2,
  Handshake,
  PiggyBank,
  CircleDollarSign,
  type LucideIcon,
} from "lucide-react";
import { saveOperation } from "@/lib/actions";
import { som } from "@/lib/format";
import Select from "./Select";
import DatePicker from "./DatePicker";
import { toInputDate } from "@/lib/format";

type Opt = { key: string; name: string };

/**
 * Частые назначения по категории: руками одно и то же печатать долго,
 * а формулировки в журнале должны быть одинаковые — иначе поиск не работает.
 */
const TITLE_HINTS: Record<string, string[]> = {
  CLIENT: ["Абонплата за месяц", "Доплата за месяц", "Разовая услуга"],
  REFUND: ["Возврат от подрядчика", "Возврат за сервис"],
  PARTNER: ["Партнёрская комиссия за рекомендацию"],
  OWN: ["Пополнение кассы"],
  ADS: ["Пополнение рекламного кабинета", "Продвижение постов"],
  SALARY: ["Зарплата за месяц", "Аванс", "Бонус"],
  SUBSCRIPTION: ["Подписка на сервис", "Продление домена"],
  OFFICE: ["Аренда офиса", "Интернет и связь", "Хозрасходы"],
  TAX: ["Налог", "Патент", "Соцфонд"],
  EDU: ["Обучение команды", "Курс для сотрудника"],
};

/** Иконка категории: список глазами читается быстрее, чем строкой текста. */
const CATEGORY_ICON: Record<string, LucideIcon> = {
  ADS: Megaphone,
  SALARY: Users,
  SUBSCRIPTION: Repeat,
  OFFICE: Building2,
  TAX: Receipt,
  EDU: GraduationCap,
  CLIENT: Wallet,
  REFUND: Undo2,
  PARTNER: Handshake,
  OWN: PiggyBank,
  OTHER: CircleDollarSign,
};

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
  // Текст как есть (запятая/точка) — число для расчёта «останется» парсим отдельно,
  // иначе дробная часть слетает при каждом нажатии клавиши.
  const [amountText, setAmountText] = useState("");
  const amount = parseFloat(amountText.replace(",", ".")) || 0;
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [category, setCategory] = useState(incomeCategories[0]?.key ?? "");
  // Назначение держим в состоянии — подсказки должны подставляться в поле
  const [title, setTitle] = useState("");

  const isExpense = kind === "EXPENSE";
  const cats = isExpense ? expenseCategories : incomeCategories;
  const account = accounts.find((a) => a.id === accountId);
  const after = account ? account.balance + (isExpense ? -amount : amount) : null;
  const notEnough = isExpense && account && amount > account.balance;

  return (
    <form action={saveOperation} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />

      {/* Переключатель типа — задаёт смысл всей формы */}
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-subtle p-1.5">
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
              onClick={() => {
                setKind(t.key);
                // Категории у прихода и расхода разные — иначе в форму
                // уходил бы ключ из чужого списка.
                const next = t.key === "EXPENSE" ? expenseCategories : incomeCategories;
                setCategory(next[0]?.key ?? "");
              }}
              /* focus-visible:ring-inset — обычная рамка фокуса вылезала
                 за край серой подложки и кнопка выглядела кривой */
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--accent)] ${
                active
                  ? t.key === "INCOME"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-red-500 text-white shadow-sm"
                  : "text-muted hover:bg-subtle hover:text-zinc-900"
              }`}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Сумма — первое, что заполняют, поэтому крупно и в своей рамке:
          без неё поле выглядело случайной чертой посреди окна */}
      <div
        className={`rounded-2xl border p-4 text-center transition ${
          isExpense ? "border-red-200 bg-red-50/60" : "border-emerald-200 bg-emerald-50/60"
        }`}
      >
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted">
          Сумма операции
        </div>
        <div className="flex items-baseline justify-center gap-2 text-center">
          <input
            className={`amount-big font-display w-auto max-w-[220px] border-0 bg-transparent text-right text-4xl font-semibold tracking-tight outline-none placeholder:text-zinc-300 ${
              isExpense ? "text-red-700" : "text-emerald-700"
            }`}
            name="amount"
            type="text"
            inputMode="decimal"
            required
            autoFocus
            placeholder="0"
            value={amountText}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "" || /^\d*[.,]?\d*$/.test(v)) setAmountText(v);
            }}
          />
          <span className="shrink-0 text-lg font-medium text-muted">сом</span>
        </div>
        {amount > 0 && (
          <div className="mt-1 text-xs text-muted">
            {isExpense ? "спишем" : "зачислим"} {som(amount)}
          </div>
        )}
      </div>

      {/* Категории кнопками с иконками: их немного, и выбор глазами быстрее списка */}
      <div>
        <label className="label">Категория</label>
        <input type="hidden" name="category" value={category} />
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => {
            const Icon = CATEGORY_ICON[c.key] ?? CircleDollarSign;
            const active = category === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`chip transition ${
                  active
                    ? isExpense
                      ? "border-transparent bg-red-500 text-white"
                      : "border-transparent bg-emerald-500 text-white"
                    : "border-zinc-200 text-muted hover:bg-subtle"
                }`}
              >
                <Icon size={13} /> {c.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label">Назначение</label>
        <input
          className="input"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isExpense ? "За что платим" : "За что получили"}
        />
        {/* Готовые формулировки под выбранную категорию — один клик вместо набора */}
        {(TITLE_HINTS[category] ?? []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(TITLE_HINTS[category] ?? []).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setTitle(h)}
                className={`chip transition ${
                  title === h
                    ? "border-transparent bg-zinc-900 text-white"
                    : "border-zinc-200 text-muted hover:bg-subtle"
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Дата</label>
          <DatePicker name="when" defaultValue={toInputDate(new Date())} required />
        </div>
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
          <div className="sm:col-span-2">
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

      {/* Счёт карточками: мелкими чипами было не разобрать, куда уходят деньги,
          поэтому показываем ещё и остаток по каждому счёту */}
      <div>
        {/* Иконка inline-block: у .label задан display:block, и flex на нём не работает */}
        <label className="label">
          <Landmark size={13} className="mr-1.5 inline-block align-[-2px]" />
          Счёт
        </label>
        <input type="hidden" name="accountId" value={accountId} />
        <div className="grid gap-2 sm:grid-cols-3">
          {accounts.map((a) => {
            const on = accountId === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setAccountId(a.id)}
                className={`rounded-2xl border px-3 py-2.5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] ${
                  on
                    ? "accent-gradient border-transparent text-white shadow-sm"
                    : "border-zinc-200 hover:bg-subtle"
                }`}
              >
                <div className="truncate text-sm font-medium">{a.name}</div>
                <div className={`mt-0.5 text-xs ${on ? "text-white/80" : "text-muted"}`}>
                  {som(a.balance)}
                </div>
              </button>
            );
          })}
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
