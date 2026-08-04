"use client";

import { useState } from "react";
import { ArrowRight, AlertCircle } from "lucide-react";
import { saveTransfer } from "@/lib/actions";
import { toInputDate, som } from "@/lib/format";
import Select from "./Select";
import DatePicker from "./DatePicker";

type Acc = { id: string; name: string; balance: number };

export default function TransferForm({ accounts }: { accounts: Acc[] }) {
  const [fromId, setFromId] = useState(accounts[0]?.id ?? "");
  const [toId, setToId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");

  const from = accounts.find((a) => a.id === fromId);
  const to = accounts.find((a) => a.id === toId);
  const sum = Number(amount) || 0;

  const sameAccount = fromId === toId;
  const notEnough = from ? sum > from.balance : false;

  return (
    <form action={saveTransfer} className="space-y-4">
      {/* Наглядно: откуда → куда и что станет с остатками */}
      <div className="rounded-2xl border border-zinc-200 p-4">
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <div>
            <label className="label">Со счёта</label>
            <Select
              name="fromAccountId"
              required
              defaultValue={fromId}
              onChange={setFromId}
              options={accounts.map((a) => ({ value: a.id, label: a.name, hint: som(a.balance) }))}
            />
          </div>
          <div className="hidden pb-2.5 sm:block">
            <ArrowRight size={18} className="text-muted" />
          </div>
          <div>
            <label className="label">На счёт</label>
            <Select
              name="toAccountId"
              required
              defaultValue={toId}
              onChange={setToId}
              options={accounts.map((a) => ({ value: a.id, label: a.name, hint: som(a.balance) }))}
            />
          </div>
        </div>

        {sum > 0 && from && to && !sameAccount && (
          <div className="mt-3 grid gap-2 rounded-xl bg-subtle p-3 text-xs sm:grid-cols-2">
            <div>
              {from.name}: {som(from.balance)} →{" "}
              <b className={notEnough ? "text-red-600" : ""}>{som(from.balance - sum)}</b>
            </div>
            <div>
              {to.name}: {som(to.balance)} → <b className="text-emerald-600">{som(to.balance + sum)}</b>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Сумма, сом *</label>
          <input
            className="input"
            name="amount"
            type="number"
            min="0"
            step="any"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Дата</label>
          <DatePicker name="madeAt" defaultValue={toInputDate(new Date())} />
        </div>
      </div>

      <div>
        <label className="label">Комментарий</label>
        <input className="input" name="comment" placeholder="снял на текущие расходы" />
      </div>

      {sameAccount && (
        <div className="flex items-center gap-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-700">
          <AlertCircle size={14} /> Счёт отправителя и получателя совпадают — выберите разные
        </div>
      )}
      {notEnough && !sameAccount && (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle size={14} /> На счёте столько нет — после перевода уйдёт в минус
        </div>
      )}

      <button className="btn-primary w-full !py-2.5" disabled={sameAccount}>
        Сделать перевод
      </button>
    </form>
  );
}
