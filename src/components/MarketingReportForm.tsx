"use client";

import { useState } from "react";
import { CalendarDays, TrendingUp } from "lucide-react";
import { saveMarketingReport } from "@/lib/actions";
import FormSection from "./FormSection";
import Select, { type SelectOption } from "./Select";
import DatePicker from "./DatePicker";
import { toInputDate } from "@/lib/format";

export default function MarketingReportForm({
  channels,
  sources,
  directions,
  clients,
  usdRate,
  defaults,
}: {
  channels: SelectOption[];
  sources: SelectOption[];
  directions: SelectOption[];
  clients: SelectOption[];
  usdRate: number;
  defaults?: {
    id?: string;
    date?: string;
    channel?: string;
    source?: string;
    direction?: string;
    clientId?: string;
    spend?: number;
    currency?: string;
    leads?: number;
    impressions?: number;
    inquiries?: number;
    notes?: string;
  };
}) {
  const [spend, setSpend] = useState(defaults?.spend ?? 0);
  const [leads, setLeads] = useState(defaults?.leads ?? 0);
  const [currency, setCurrency] = useState(defaults?.currency ?? "KGS");
  const [rate, setRate] = useState(usdRate);

  // Считаем и храним всё в сомах, доллары пересчитываем сразу.
  const spendSom = currency === "USD" ? spend * rate : spend;
  const cplValue = leads > 0 ? Math.round(spendSom / leads) : null;
  const tone = cplValue === null ? "default" : cplValue > 300 ? "bad" : cplValue > 200 ? "warn" : "good";
  const toneClass = {
    default: "bg-subtle text-muted",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    bad: "bg-red-50 text-red-700",
  }[tone];

  return (
    <form action={saveMarketingReport} className="space-y-4">
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}

      <FormSection title="Период и канал" icon={CalendarDays} columns={2}>
        <div>
          <label className="label">Дата</label>
          <DatePicker name="date" defaultValue={defaults?.date ?? toInputDate(new Date())} required />
        </div>
        <div>
          <label className="label">Канал</label>
          <Select name="channel" options={channels} defaultValue={defaults?.channel ?? channels[0]?.value} required />
        </div>
        <div>
          <label className="label">Источник</label>
          <Select name="source" options={sources} defaultValue={defaults?.source} placeholder="Не указан" />
        </div>
        <div>
          <label className="label">Направление</label>
          <Select
            name="direction"
            options={directions}
            defaultValue={defaults?.direction}
            placeholder="Не указано"
          />
        </div>
        {clients.length > 0 && (
          <div>
            <label className="label">Клиент (если отчёт по проекту)</label>
            <Select name="clientId" options={clients} defaultValue={defaults?.clientId} placeholder="Общий, без привязки" />
          </div>
        )}
      </FormSection>

      <FormSection title="Данные отчёта" icon={TrendingUp} columns={2}>
        <div>
          <label className="label">Расход</label>
          <div className="flex gap-2">
            <input
              className="input"
              name="spend"
              type="number"
              step="0.01"
              defaultValue={defaults?.spend ?? 0}
              onChange={(e) => setSpend(Number(e.target.value) || 0)}
            />
            <div className="w-28">
              <Select
                name="currency"
                options={[
                  { value: "KGS", label: "сом" },
                  { value: "USD", label: "USD" },
                ]}
                defaultValue={defaults?.currency ?? "KGS"}
                onChange={setCurrency}
              />
            </div>
          </div>
          {currency === "USD" && (
            <div className="mt-2 flex items-center gap-2">
              <input
                className="input !py-1.5 w-28"
                name="usdRate"
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value) || 0)}
              />
              <span className="text-xs text-muted">
                курс — в базу уйдёт {Math.round(spendSom).toLocaleString("ru-RU")} сом
              </span>
            </div>
          )}
        </div>
        <div>
          <label className="label">Лиды</label>
          <input
            className="input"
            name="leads"
            type="number"
            defaultValue={defaults?.leads ?? 0}
            onChange={(e) => setLeads(Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="label">Показы</label>
          <input className="input" name="impressions" type="number" defaultValue={defaults?.impressions ?? 0} />
        </div>
        <div>
          <label className="label">Обращения</label>
          <input className="input" name="inquiries" type="number" defaultValue={defaults?.inquiries ?? 0} />
        </div>
      </FormSection>

      <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${toneClass}`}>
        {cplValue === null ? "Укажите лиды, чтобы увидеть цену заявки" : `Цена заявки: ${cplValue} сом`}
      </div>

      <div>
        <label className="label">Заметки</label>
        <textarea className="input" name="notes" rows={2} defaultValue={defaults?.notes ?? ""} />
      </div>

      <button className="btn-primary w-full">Сохранить отчёт</button>
    </form>
  );
}
