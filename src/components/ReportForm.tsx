"use client";

import { useRef, useState } from "react";
import { CalendarRange, Banknote, Target, Layers, Plus, Trash2 } from "lucide-react";
import { saveReport } from "@/lib/actions";
import { toInputDate, num } from "@/lib/format";
import { REPORT_OBJECTIVE, DEFAULTS } from "@/lib/constants";
import Select from "./Select";
import DatePicker from "./DatePicker";
import FormSection from "./FormSection";

/** Дата на N дней назад в формате инпута. */
function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toInputDate(d);
}

/** Название поля-метрики в зависимости от цели кампании. */
const METRIC_FIELD: Record<string, string> = {
  LEADS: "leads",
  ENGAGEMENT: "engagement",
  TRAFFIC: "traffic",
  PROFILE_VISITS: "profileVisits",
};

const METRIC_LABEL: Record<string, string> = {
  LEADS: "Заявок",
  ENGAGEMENT: "Вовлечённость",
  TRAFFIC: "Переходы",
  PROFILE_VISITS: "Посещения профиля",
};

export default function ReportForm({
  clients,
  fixedClientId,
  defaultTargetCpl,
  report,
}: {
  clients: { id: string; name: string; targetCpl?: number | null }[];
  fixedClientId?: string;
  defaultTargetCpl?: number | null;
  report?: {
    id: string;
    periodFrom: Date | string;
    periodTo: Date | string;
    objective: string;
    budget: number;
    spent: number;
    leads: number;
    actions: number;
    engagement: number;
    traffic: number;
    profileVisits: number;
    targetCpl: number;
    targetCpa: number | null;
    bundles: string | null;
    comment: string | null;
  };
}) {
  type Row = {
    key: string;
    spent: number;
    currency: string;
    metric: number;
    actions: number;
  };

  const [clientId, setClientId] = useState(fixedClientId ?? clients[0]?.id ?? "");
  const [from, setFrom] = useState(report ? toInputDate(new Date(report.periodFrom)) : daysAgo(7));
  const [objective, setObjective] = useState<string>(report?.objective ?? "LEADS");

  const rowKeySeq = useRef(0);
  const newRow = (init?: Partial<Row>): Row => ({
    key: `row-${++rowKeySeq.current}`,
    spent: 0,
    currency: "KGS",
    metric: 0,
    actions: 0,
    ...init,
  });

  // При редактировании существующего отчёта — одна строка с текущими значениями,
  // дальше пользователь может по желанию добавить ещё кампании в тот же отчёт.
  const [rows, setRows] = useState<Row[]>([
    newRow(
      report
        ? {
            spent: report.spent,
            currency: "KGS",
            metric: report[METRIC_FIELD[report.objective] as keyof typeof report] as number,
            actions: report.actions,
          }
        : undefined
    ),
  ]);
  const [rate, setRate] = useState(DEFAULTS.usdRate);

  const addRow = () => setRows((rs) => [...rs, newRow()]);
  const removeRow = (key: string) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // Каждую строку переводим в сомы по общему курсу и суммируем — так несколько
  // кампаний/кабинетов за один период сводятся в один отчёт.
  const rowSom = (r: Row) => (r.currency === "USD" ? r.spent * rate : r.spent);
  const spentSom = rows.reduce((sum, r) => sum + rowSom(r), 0);
  const metricSum = rows.reduce((sum, r) => sum + r.metric, 0);
  const actionsSum = rows.reduce((sum, r) => sum + r.actions, 0);
  const hasUsdRow = rows.some((r) => r.currency === "USD");

  // цель по CPL обычно задана в карточке клиента — подставляем её
  const clientCpl = clients.find((c) => c.id === clientId)?.targetCpl ?? defaultTargetCpl ?? null;

  const cpl = spentSom > 0 && metricSum > 0 ? spentSom / metricSum : null;
  const overTarget = cpl !== null && clientCpl ? cpl > clientCpl : null;

  const periods: [string, string][] = [
    ["Неделя", daysAgo(7)],
    ["2 недели", daysAgo(14)],
    ["Месяц", daysAgo(30)],
  ];

  const metricFieldName = METRIC_FIELD[objective] ?? "leads";

  return (
    <form action={saveReport} className="space-y-4">
      {report && <input type="hidden" name="id" value={report.id} />}
      <FormSection title="Проект и период" icon={CalendarRange}>
        {fixedClientId ? (
          <input type="hidden" name="clientId" value={fixedClientId} />
        ) : (
          <div className="sm:col-span-2">
            <label className="label">Проект *</label>
            <Select
              name="clientId"
              required
              defaultValue={clientId}
              onChange={setClientId}
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
        )}
        <div className="sm:col-span-2">
          <div className="mb-2 flex flex-wrap gap-2">
            {periods.map(([label, value]) => (
              <button
                key={label}
                type="button"
                onClick={() => setFrom(value)}
                className={`chip transition ${
                  from === value
                    ? "accent-gradient border-transparent text-white"
                    : "border-zinc-200 text-muted hover:bg-subtle"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Период с</label>
          <DatePicker key={from} name="periodFrom" defaultValue={from} />
        </div>
        <div>
          <label className="label">по</label>
          <DatePicker
            name="periodTo"
            defaultValue={report ? toInputDate(new Date(report.periodTo)) : toInputDate(new Date())}
          />
        </div>
      </FormSection>

      {/* Итоговые поля, которые реально уходят в saveReport — считаются из строк ниже. */}
      <input type="hidden" name="spent" value={spentSom} />
      <input type="hidden" name={metricFieldName} value={metricSum} />
      <input type="hidden" name="actions" value={actionsSum} />

      <FormSection title="Деньги и результат" hint="Из этих чисел считается цена заявки" icon={Banknote}>
        <div className="sm:col-span-2">
          <label className="label">Цель кампании</label>
          <Select
            name="objective"
            defaultValue={objective}
            onChange={setObjective}
            options={Object.entries(REPORT_OBJECTIVE).map(([value, label]) => ({ value, label }))}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Рекламный бюджет, сом</label>
          <input className="input" name="budget" type="number" min="0" step="any" defaultValue={report?.budget || ""} />
        </div>
      </FormSection>

      <FormSection title="Кампании" hint="Несколько кабинетов/кампаний за период — сложатся в один отчёт" icon={Banknote} columns={1}>
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
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                  <label className="label">Потрачено</label>
                  <div className="flex gap-2">
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="any"
                      value={r.spent}
                      onChange={(e) => updateRow(r.key, { spent: Number(e.target.value) || 0 })}
                    />
                    <div className="w-24">
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
                  <label className="label">{METRIC_LABEL[objective] ?? "Заявок"}</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={r.metric}
                    onChange={(e) => updateRow(r.key, { metric: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="label">Целевых действий</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={r.actions}
                    onChange={(e) => updateRow(r.key, { actions: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addRow} className="btn-ghost !text-xs">
            <Plus size={13} /> Добавить строку
          </button>

          {hasUsdRow && (
            <div className="flex items-center gap-2">
              <label className="label !mb-0">Курс USD</label>
              <input
                className="input !py-1.5 w-28"
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value) || 0)}
              />
              <span className="text-xs text-muted">
                итого потрачено — {Math.round(spentSom).toLocaleString("ru-RU")} сом
              </span>
            </div>
          )}
        </div>
      </FormSection>

      <FormSection title="Пороги решения" hint="Дороже порога — связку отключаем, дешевле — масштабируем" icon={Target}>
        <div>
          <label className="label">Целевой CPL, сом *</label>
          <input
            className="input"
            name="targetCpl"
            type="number"
            min="0"
            step="any"
            required
            defaultValue={report ? report.targetCpl : clientCpl ?? ""}
            placeholder="порог решения"
          />
        </div>
        <div>
          <label className="label">Целевой CPA, сом</label>
          <input className="input" name="targetCpa" type="number" min="0" step="any" defaultValue={report?.targetCpa || ""} />
        </div>
      </FormSection>

      {/* живой расчёт: видно результат ещё до сохранения */}
      {cpl !== null && (
        <div
          className={`rounded-2xl p-3 text-sm ${
            overTarget ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          Цена заявки: <b>{num(cpl)} сом</b>
          {clientCpl ? (
            <>
              {" "}
              при цели {num(clientCpl)} сом — {overTarget ? "порог превышен" : "в цели"}
            </>
          ) : null}
        </div>
      )}

      <FormSection title="Связки и комментарий" icon={Layers} columns={1}>
        <div>
          <label className="label">Статус связок</label>
          <input className="input" name="bundles" placeholder="3 связки в тесте, 1 масштабируем" defaultValue={report?.bundles ?? ""} />
        </div>
        <div>
          <label className="label">Комментарий</label>
          <textarea className="input" name="comment" rows={2} placeholder="что меняем в следующем периоде" defaultValue={report?.comment ?? ""} />
        </div>
      </FormSection>

      <button className="btn-primary w-full !py-2.5">{report ? "Сохранить" : "Сохранить отчёт"}</button>
    </form>
  );
}
