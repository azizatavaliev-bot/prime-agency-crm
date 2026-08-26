"use client";

import { useRef, useState } from "react";
import { CalendarDays, Plus, Trash2, TrendingUp, Users2 } from "lucide-react";
import { saveMarketingReport } from "@/lib/actions";
import FormSection from "./FormSection";
import Select, { type SelectOption } from "./Select";
import DatePicker from "./DatePicker";
import SubmitButton from "./SubmitButton";
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
    clicks?: number;
    inquiries?: number;
    notes?: string;
  };
}) {
  type Row = {
    key: string;
    /** Держим как есть, что ввёл человек ("29,3") — парсим в число только при подсчётах. */
    spend: string;
    currency: string;
    leads: number;
    impressions: number;
    clicks: number;
    inquiries: number;
  };
  const parseSpend = (v: string) => parseFloat(v.replace(",", ".")) || 0;

  const rowKeySeq = useRef(0);
  const newRow = (init?: Partial<Row>): Row => ({
    key: `row-${++rowKeySeq.current}`,
    spend: "",
    currency: "KGS",
    leads: 0,
    impressions: 0,
    clicks: 0,
    inquiries: 0,
    ...init,
  });

  const [clientId, setClientId] = useState(defaults?.clientId ?? "");
  const [rows, setRows] = useState<Row[]>([
    newRow({
      spend: defaults?.spend ? String(defaults.spend) : "",
      currency: defaults?.currency ?? "KGS",
      leads: defaults?.leads ?? 0,
      impressions: defaults?.impressions ?? 0,
      clicks: defaults?.clicks ?? 0,
      inquiries: defaults?.inquiries ?? 0,
    }),
  ]);
  const [rateText, setRateText] = useState(String(usdRate));
  const rate = parseFloat(rateText.replace(",", ".")) || 0;

  const addRow = () => setRows((rs) => [...rs, newRow()]);
  const removeRow = (key: string) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // Каждую строку переводим в сомы по общему курсу и суммируем — так несколько
  // кампаний/кабинетов за один день сводятся в один отчёт.
  const rowSom = (r: Row) => (r.currency === "USD" ? parseSpend(r.spend) * rate : parseSpend(r.spend));
  const spendSom = rows.reduce((sum, r) => sum + rowSom(r), 0);
  const leads = rows.reduce((sum, r) => sum + r.leads, 0);
  const impressions = rows.reduce((sum, r) => sum + r.impressions, 0);
  const clicks = rows.reduce((sum, r) => sum + r.clicks, 0);
  const inquiries = rows.reduce((sum, r) => sum + r.inquiries, 0);
  const hasUsdRow = rows.some((r) => r.currency === "USD");
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

      {/*
        Клиент и дата — первое, что заполняют, и по отдельной крупной секции:
        раньше клиент был последним необязательным полем среди четырёх других
        и терялся — маркетолог половину отчётов заводил «общими», без привязки.
      */}
      <FormSection title="Клиент и дата" icon={Users2} columns={2} hint="Сначала клиент — так отчёт сразу попадёт в его историю">
        {clients.length > 0 ? (
          <div className="sm:col-span-2">
            <label className="label">Клиент</label>
            <Select
              name="clientId"
              options={clients}
              defaultValue={clientId}
              onChange={setClientId}
              placeholder="Общий отчёт агентства, без клиента"
            />
          </div>
        ) : (
          <input type="hidden" name="clientId" value="" />
        )}
        <div>
          <label className="label">Дата</label>
          <DatePicker name="date" defaultValue={defaults?.date ?? toInputDate(new Date())} required />
        </div>
        {/* Канал (таргет/органика) почти всегда один и тот же — раньше выбор
            дублировал «Источник» глазами таргетолога. Значение по-прежнему
            пишется в отчёт и участвует в аналитике «По каналам», просто без
            лишнего клика: по умолчанию «Таргет», первый пункт словаря. */}
        <input type="hidden" name="channel" value={defaults?.channel ?? channels[0]?.value ?? ""} />
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
      </FormSection>

      {/* Итоговые поля, которые реально уходят в saveMarketingReport — считаются из строк ниже. */}
      <input type="hidden" name="spend" value={spendSom} />
      <input type="hidden" name="currency" value="KGS" />
      <input type="hidden" name="leads" value={leads} />
      <input type="hidden" name="impressions" value={impressions} />
      <input type="hidden" name="clicks" value={clicks} />
      <input type="hidden" name="inquiries" value={inquiries} />

      <FormSection title="Данные отчёта" icon={TrendingUp} columns={1}>
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.key} className="rounded-xl border border-zinc-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted">
                  {rows.length > 1 ? `Кампания ${i + 1}` : "Кампания"}
                </span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(r.key)}
                    className="btn-ghost !px-2 !py-1 !text-xs text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              {/* На телефоне 2 колонки вместо 4 — иначе цифры сжимаются до нечитаемых
                  полей шире одного символа. Расход — на всю ширину: рядом с ним селектор валюты. */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="label">Расход</label>
                  <div className="flex gap-2">
                    <input
                      className="input"
                      type="text"
                      inputMode="decimal"
                      value={r.spend}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || /^\d*[.,]?\d*$/.test(v)) updateRow(r.key, { spend: v });
                      }}
                    />
                    <div className="w-24 shrink-0">
                      <Select
                        name={`row-currency-${r.key}`}
                        options={[
                          { value: "KGS", label: "сом" },
                          { value: "USD", label: "USD" },
                        ]}
                        defaultValue={r.currency}
                        onChange={(v) => updateRow(r.key, { currency: v })}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="label">Лиды</label>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    value={r.leads || ""}
                    placeholder="0"
                    onChange={(e) => updateRow(r.key, { leads: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="label">Клики</label>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    value={r.clicks || ""}
                    placeholder="0"
                    onChange={(e) => updateRow(r.key, { clicks: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="label">Показы</label>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    value={r.impressions || ""}
                    placeholder="0"
                    onChange={(e) => updateRow(r.key, { impressions: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="label">Обращения</label>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    value={r.inquiries || ""}
                    placeholder="0"
                    onChange={(e) => updateRow(r.key, { inquiries: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addRow} className="btn-ghost !text-xs">
            <Plus size={13} /> Добавить строку
          </button>

          {hasUsdRow && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="label !mb-0">Курс USD</label>
              <input
                className="input !py-1.5 w-28"
                type="text"
                inputMode="decimal"
                value={rateText}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*[.,]?\d*$/.test(v)) setRateText(v);
                }}
              />
              <span className="text-xs text-muted">
                итого расход — {Math.round(spendSom).toLocaleString("ru-RU")} сом
              </span>
            </div>
          )}
        </div>
      </FormSection>

      <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${toneClass}`}>
        {cplValue === null
          ? "Укажите лиды, чтобы увидеть цену заявки"
          : `Цена заявки: ${cplValue} сом${rows.length > 1 ? ` · всего расход ${Math.round(spendSom).toLocaleString("ru-RU")} сом` : ""}`}
      </div>

      <div>
        <label className="label">Заметки</label>
        <textarea className="input" name="notes" rows={2} defaultValue={defaults?.notes ?? ""} />
      </div>

      <div className="form-footer">
        <SubmitButton pendingLabel="Сохраняем отчёт…">
          {defaults?.id ? "Сохранить изменения" : "Сохранить отчёт"}
        </SubmitButton>
      </div>
    </form>
  );
}
