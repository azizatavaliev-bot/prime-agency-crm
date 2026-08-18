"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarRange, Banknote, Layers, Plus, Trash2, Camera, X, Clipboard } from "lucide-react";
import { saveReport } from "@/lib/actions";
import { toInputDate, num } from "@/lib/format";
import { REPORT_OBJECTIVE, DEFAULTS } from "@/lib/constants";
import Select from "./Select";
import DatePicker from "./DatePicker";
import FormSection from "./FormSection";
import { Collapse } from "./ui";

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
  ENGAGEMENT: "Заявки",
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
    views: number;
    targetCpl: number;
    targetCpa: number | null;
    bundles: string | null;
    comment: string | null;
    hasScreenshot?: boolean;
  };
}) {
  type Row = {
    key: string;
    /** Держим как есть, что ввёл человек ("29,3") — парсим в число только при подсчётах. */
    spent: string;
    currency: string;
    metric: number;
    views: number;
    objective: string;
  };
  /** "29,3" → 29.3. Разделитель — запятая или точка, без разницы. */
  const parseSpent = (v: string) => parseFloat(v.replace(",", ".")) || 0;

  // Старые отчёты могли быть сохранены с целью "Заявки"/"Посещения профиля" —
  // эти варианты убраны из выбора, но старые данные остаются читаемыми:
  // заявки показываем как вовлечённость, посещения профиля — как трафик.
  const normalizeObjective = (o?: string) =>
    o === "LEADS" ? "ENGAGEMENT" : o === "PROFILE_VISITS" ? "TRAFFIC" : o ?? "ENGAGEMENT";

  const [clientId, setClientId] = useState(fixedClientId ?? clients[0]?.id ?? "");
  const [from, setFrom] = useState(report ? toInputDate(new Date(report.periodFrom)) : daysAgo(7));
  const [to, setTo] = useState(report ? toInputDate(new Date(report.periodTo)) : toInputDate(new Date()));

  const rowKeySeq = useRef(0);
  const newRow = (init?: Partial<Row>): Row => ({
    key: `row-${++rowKeySeq.current}`,
    spent: "",
    currency: "USD",
    metric: 0,
    views: 0,
    objective: "ENGAGEMENT",
    ...init,
  });

  // При редактировании существующего отчёта — одна строка с текущими значениями
  // (в сомах, как и хранится), дальше пользователь может по желанию добавить
  // ещё кампании в тот же отчёт.
  const [rows, setRows] = useState<Row[]>([
    newRow(
      report
        ? {
            spent: String(report.spent),
            currency: "KGS",
            metric: report[METRIC_FIELD[report.objective] as keyof typeof report] as number,
            views: report.views ?? 0,
            objective: normalizeObjective(report.objective),
          }
        : undefined
    ),
  ]);
  const [rateText, setRateText] = useState(String(DEFAULTS.usdRate));
  const rate = parseFloat(rateText.replace(",", ".")) || 0;

  // Скриншот кабинета: файл держим напрямую в input (через DataTransfer, чтобы
  // форма отправила его как обычную загрузку), а превью — отдельно в state.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotRemoved, setScreenshotRemoved] = useState(false);
  const hadScreenshot = Boolean(report?.hasScreenshot);

  const attachScreenshot = (file: File) => {
    if (fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
    }
    setScreenshotPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setScreenshotRemoved(false);
  };

  const clearScreenshot = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setScreenshotPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setScreenshotRemoved(true);
  };

  // Ctrl+V в любом месте формы — вставляет картинку из буфера обмена.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      if (!item) return;
      const file = item.getAsFile();
      if (!file) return;
      e.preventDefault();
      attachScreenshot(file);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const addRow = () => setRows((rs) => [...rs, newRow()]);
  const removeRow = (key: string) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // Каждую строку переводим в сомы по общему курсу и суммируем — так несколько
  // кампаний/кабинетов за один период сводятся в один отчёт.
  const rowSom = (r: Row) => (r.currency === "USD" ? parseSpent(r.spent) * rate : parseSpent(r.spent));
  const spentSom = rows.reduce((sum, r) => sum + rowSom(r), 0);
  const viewsSum = rows.reduce((sum, r) => sum + r.views, 0);
  const hasUsdRow = rows.some((r) => r.currency === "USD");

  // Кампании в одном отчёте могут гнаться за разными целями (вовлечённость и трафик
  // в один день) — сводим метрики отдельно по каждой цели, а не в одну кучу.
  const objectivesUsed = [...new Set(rows.map((r) => r.objective))];
  const groupTotals = objectivesUsed.map((obj) => {
    const objRows = rows.filter((r) => r.objective === obj);
    return {
      objective: obj,
      spent: objRows.reduce((s, r) => s + rowSom(r), 0),
      metric: objRows.reduce((s, r) => s + r.metric, 0),
    };
  });
  const metricTotals: Record<string, number> = {};
  for (const g of groupTotals) metricTotals[METRIC_FIELD[g.objective] ?? "leads"] = g.metric;
  // Основная цель отчёта (для порога CPL и уведомлений) — та, где потрачено больше.
  const primaryObjective = groupTotals.slice().sort((a, b) => b.spent - a.spent)[0]?.objective ?? "ENGAGEMENT";

  // цель по CPL обычно задана в карточке клиента — подставляем её
  const clientCpl = clients.find((c) => c.id === clientId)?.targetCpl ?? defaultTargetCpl ?? null;

  const cplByObjective = groupTotals
    .filter((g) => g.spent > 0 && g.metric > 0)
    .map((g) => ({
      ...g,
      cpl: g.spent / g.metric,
      overTarget: clientCpl ? g.spent / g.metric > clientCpl : null,
    }));

  const periods: [string, string][] = [
    ["Неделя", daysAgo(7)],
    ["2 недели", daysAgo(14)],
    ["Месяц", daysAgo(30)],
  ];
  const days: [string, number][] = [
    ["Сегодня", 0],
    ["Вчера", 1],
    ["Позавчера", 2],
    ["3 дня назад", 3],
  ];

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
          <div className="mb-1.5 flex flex-wrap gap-2">
            {days.map(([label, daysBack]) => {
              const value = daysAgo(daysBack);
              const active = from === value && to === value;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setFrom(value);
                    setTo(value);
                  }}
                  className={`chip transition ${
                    active
                      ? "accent-gradient border-transparent text-white"
                      : "border-zinc-200 text-muted hover:bg-subtle"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="mb-2 flex flex-wrap gap-2">
            {periods.map(([label, value]) => {
              const active = from === value && to === toInputDate(new Date());
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setFrom(value);
                    setTo(toInputDate(new Date()));
                  }}
                  className={`chip transition ${
                    active
                      ? "accent-gradient border-transparent text-white"
                      : "border-zinc-200 text-muted hover:bg-subtle"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="label">Период с</label>
          <DatePicker key={`from-${from}`} name="periodFrom" defaultValue={from} onChange={setFrom} />
        </div>
        <div>
          <label className="label">по</label>
          <DatePicker key={`to-${to}`} name="periodTo" defaultValue={to} onChange={setTo} />
        </div>
      </FormSection>

      {/* Итоговые поля, которые реально уходят в saveReport — считаются из строк ниже.
          Метрика пишется в свою колонку по каждой встретившейся цели — так один отчёт
          может нести и вовлечённость, и трафик одновременно. */}
      <input type="hidden" name="spent" value={spentSom} />
      <input type="hidden" name="leads" value={metricTotals.leads ?? 0} />
      <input type="hidden" name="engagement" value={metricTotals.engagement ?? 0} />
      <input type="hidden" name="traffic" value={metricTotals.traffic ?? 0} />
      <input type="hidden" name="profileVisits" value={metricTotals.profileVisits ?? 0} />
      <input type="hidden" name="views" value={viewsSum} />
      <input type="hidden" name="actions" value={0} />
      <input type="hidden" name="objective" value={primaryObjective} />

      {/* Цель по CPL решает клиент/владелец в карточке проекта — здесь её не переопределяем,
          просто передаём дальше, чтобы алерт по превышению порога продолжал работать. */}
      <input type="hidden" name="targetCpl" value={clientCpl ?? 999999} />

      <FormSection
        title="Скриншот кабинета"
        hint="Ctrl+V — вставить из буфера обмена, или выберите файл"
        icon={Camera}
        columns={1}
      >
        <input
          ref={fileInputRef}
          className="hidden"
          name="screenshot"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) attachScreenshot(file);
          }}
        />
        <input type="hidden" name="removeScreenshot" value={screenshotRemoved ? "1" : ""} />

        {screenshotPreview ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={screenshotPreview} alt="Скриншот кабинета" className="max-h-48 rounded-xl border border-zinc-200" />
            <button
              type="button"
              onClick={clearScreenshot}
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white shadow"
              title="Убрать скриншот"
            >
              <X size={14} />
            </button>
          </div>
        ) : hadScreenshot && !screenshotRemoved ? (
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 text-sm text-muted">
            <Camera size={16} /> Скриншот уже прикреплён к отчёту
            <button type="button" onClick={clearScreenshot} className="btn-ghost !px-2 !py-1 !text-xs text-red-600">
              <X size={13} /> Удалить
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-muted hover:bg-subtle"
          >
            <Clipboard size={15} /> Нажмите Ctrl+V или выберите файл
          </button>
        )}
      </FormSection>

      <FormSection title="Кампании" hint="Несколько кабинетов/кампаний за период — сложатся в один отчёт" icon={Banknote} columns={1}>
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.key} className="rounded-xl border border-zinc-200 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
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
              <div className="mb-3">
                <label className="label">Цель кампании</label>
                <Select
                  name={`row-objective-${r.key}`}
                  defaultValue={r.objective}
                  onChange={(v) => updateRow(r.key, { objective: v })}
                  options={Object.entries(REPORT_OBJECTIVE).map(([value, label]) => ({ value, label }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <div>
                  <label className="label">Потрачено</label>
                  <div className="flex gap-2">
                    <input
                      className="input"
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={r.spent}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || /^\d*[.,]?\d*$/.test(v)) updateRow(r.key, { spent: v });
                      }}
                    />
                    <div className="w-24">
                      <Select
                        name={`row-currency-${r.key}`}
                        options={[
                          { value: "USD", label: "USD" },
                          { value: "KGS", label: "сом" },
                        ]}
                        defaultValue={r.currency}
                        onChange={(v) => updateRow(r.key, { currency: v })}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="label">{METRIC_LABEL[r.objective] ?? "Заявки"}</label>
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={r.metric === 0 ? "" : r.metric}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d*$/.test(v)) updateRow(r.key, { metric: v === "" ? 0 : Number(v) || 0 });
                    }}
                  />
                </div>
                <div>
                  <label className="label">Показы</label>
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={r.views === 0 ? "" : r.views}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d*$/.test(v)) updateRow(r.key, { views: v === "" ? 0 : Number(v) || 0 });
                    }}
                  />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addRow} className="btn-ghost !text-xs">
            <Plus size={13} /> Добавить строку
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {hasUsdRow && (
              <>
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
              </>
            )}
            <span className="text-xs text-muted">
              итого потрачено — {Math.round(spentSom).toLocaleString("ru-RU")} сом
            </span>
          </div>
        </div>
      </FormSection>

      {/* живой расчёт: видно результат ещё до сохранения, отдельно по каждой цели, если их несколько */}
      {cplByObjective.length > 0 && (
        <div className="space-y-2">
          {cplByObjective.map((g) => (
            <div
              key={g.objective}
              className={`rounded-2xl p-3 text-sm ${
                g.overTarget ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {cplByObjective.length > 1 && <b>{REPORT_OBJECTIVE[g.objective as keyof typeof REPORT_OBJECTIVE]}: </b>}
              Цена заявки: <b>{num(g.cpl)} сом</b>
              {clientCpl ? (
                <>
                  {" "}
                  при цели {num(clientCpl)} сом — {g.overTarget ? "порог превышен" : "в цели"}
                </>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <Collapse title="Связки и комментарий (необязательно)" icon={Layers}>
        <div className="space-y-3">
          <div>
            <label className="label">Статус связок</label>
            <input className="input" name="bundles" placeholder="3 связки в тесте, 1 масштабируем" defaultValue={report?.bundles ?? ""} />
          </div>
          <div>
            <label className="label">Комментарий</label>
            <textarea className="input" name="comment" rows={2} placeholder="что меняем в следующем периоде" defaultValue={report?.comment ?? ""} />
          </div>
        </div>
      </Collapse>

      <button className="btn-primary w-full !py-2.5">{report ? "Сохранить" : "Сохранить отчёт"}</button>
    </form>
  );
}
