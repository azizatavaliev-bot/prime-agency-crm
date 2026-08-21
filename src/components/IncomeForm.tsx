"use client";

import { ArrowDownLeft, Landmark } from "lucide-react";
import { saveIncome } from "@/lib/actions";
import { toInputDate } from "@/lib/format";
import Select from "./Select";
import DatePicker from "./DatePicker";
import FormSection from "./FormSection";
import DecimalInput from "./DecimalInput";

export default function IncomeForm({
  categories,
  accounts,
  clients,
}: {
  categories: { key: string; name: string }[];
  accounts: { id: string; name: string }[];
  clients: { id: string; name: string }[];
}) {
  return (
    <form action={saveIncome} className="space-y-4">
      <FormSection title="Что за приход" icon={ArrowDownLeft}>
        <div className="sm:col-span-2">
          <label className="label">Откуда деньги *</label>
          <input className="input" name="title" required autoFocus placeholder="Возврат от подрядчика" />
        </div>
        <div>
          <label className="label">Категория</label>
          <Select
            name="category"
            defaultValue={categories[0]?.key ?? "OTHER"}
            options={categories.map((c) => ({ value: c.key, label: c.name }))}
          />
        </div>
        <div>
          <label className="label">Сумма, сом *</label>
          <DecimalInput name="amount" required />
        </div>
      </FormSection>

      <FormSection title="Куда и когда" icon={Landmark}>
        <div>
          <label className="label">Дата</label>
          <DatePicker name="receivedAt" defaultValue={toInputDate(new Date())} />
        </div>
        <div>
          <label className="label">На счёт</label>
          <Select
            name="accountId"
            defaultValue=""
            placeholder="— не указан —"
            options={[
              { value: "", label: "— не указан —" },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Клиент (если связан)</label>
          <Select
            name="clientId"
            defaultValue=""
            placeholder="— без клиента —"
            options={[
              { value: "", label: "— без клиента —" },
              ...clients.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
      </FormSection>

      <div>
        <label className="label">Комментарий</label>
        <input className="input" name="comment" placeholder="уточнение, если нужно" />
      </div>

      <button className="btn-primary w-full !py-2.5">Добавить приход</button>
    </form>
  );
}
