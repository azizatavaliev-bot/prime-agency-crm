"use client";

import { useState } from "react";
import { CalendarRange, Banknote, Image as ImageIcon } from "lucide-react";
import { saveReport } from "@/lib/actions";
import { toInputDate, num } from "@/lib/format";
import { REPORT_OBJECTIVE, DEFAULTS } from "@/lib/constants";
import Select from "./Select";
import DatePicker from "./DatePicker";
import FormSection from "./FormSection";
import ScreenshotInput from "./ScreenshotInput";

/** Дата на N дней назад в формате инпута. */
function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toInputDate(d);
}

/** Легаси-цель "Посещения профиля" в форме больше не выбирается — показываем как «Трафик». */
function normalizeObjective(objective: string) {
  return objective === "PROFILE_VISITS" ? "TRAFFIC" : objective;
}

export default function ReportForm({
  clients,
  fixedClientId,
  defaultTargetCpl,
  usdRate,
  onSaved,
}: {
  clients: { id: string; name: string; targetCpl?: number | null }[];
  fixedClientId?: string;
  defaultTargetCpl?: number | null;
  /** Курс доллара (Настройки → getUsdRate) — конвертируем "Потрачено, $" в сом при сохранении. */
  usdRate?: number;
  /** Вызывается после отправки формы — родитель может закрыть/переключить вид (модалка-клиента). */
  onSaved?: () => void;
}) {
  const rate = usdRate ?? DEFAULTS.usdRate;
  const [clientId, setClientId] = useState(fixedClientId ?? clients[0]?.id ?? "");
  const today = toInputDate(new Date());
  const [dailyMode, setDailyMode] = useState(false);
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(today);
  const [dailyDate, setDailyDate] = useState(today);
  const [spentUsd, setSpentUsd] = useState("");
  const [leads, setLeads] = useState("");
  const [objective, setObjective] = useState<string>("LEADS");

  // цель по CPL обычно задана в карточке клиента — подставляем её (порог решения теперь не спрашиваем в форме)
  const clientCpl = clients.find((c) => c.id === clientId)?.targetCpl ?? defaultTargetCpl ?? null;

  const spentSom = Number(spentUsd) > 0 ? Number(spentUsd) * rate : 0;
  const cpl = spentSom > 0 && Number(leads) > 0 ? spentSom / Number(leads) : null;
  const overTarget = cpl !== null && clientCpl ? cpl > clientCpl : null;

  const periods: [string, string][] = [
    ["Неделя", daysAgo(7)],
    ["2 недели", daysAgo(14)],
    ["Месяц", daysAgo(30)],
  ];

  return (
    <form
      action={saveReport}
      className="space-y-4"
      onSubmit={() => onSaved?.()}
    >
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
                onClick={() => {
                  setDailyMode(false);
                  setFrom(value);
                }}
                className={`chip transition ${
                  !dailyMode && from === value
                    ? "accent-gradient border-transparent text-white"
                    : "border-zinc-200 text-muted hover:bg-subtle"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setDailyMode(true);
                setDailyDate(today);
              }}
              className={`chip transition ${
                dailyMode
                  ? "accent-gradient border-transparent text-white"
                  : "border-zinc-200 text-muted hover:bg-subtle"
              }`}
            >
              За 1 день
            </button>
          </div>
        </div>
        {dailyMode ? (
          <div className="sm:col-span-2">
            <label className="label">Дата</label>
            <DatePicker
              key={`daily-${dailyDate}`}
              name="periodFrom"
              defaultValue={dailyDate}
              onChange={setDailyDate}
            />
            <input type="hidden" name="periodTo" value={dailyDate} />
          </div>
        ) : (
          <>
            <div>
              <label className="label">Период с</label>
              <DatePicker key={from} name="periodFrom" defaultValue={from} onChange={setFrom} />
            </div>
            <div>
              <label className="label">по</label>
              <DatePicker name="periodTo" defaultValue={to} onChange={setTo} />
            </div>
          </>
        )}
      </FormSection>

      <FormSection title="Деньги и результат" hint="Из этих чисел считается цена заявки" icon={Banknote}>
        <div className="sm:col-span-2">
          <label className="label">Цель кампании</label>
          <Select
            name="objective"
            defaultValue={normalizeObjective(objective)}
            onChange={setObjective}
            options={Object.entries(REPORT_OBJECTIVE).map(([value, label]) => ({ value, label }))}
          />
        </div>
        {/* «Потрачено» — общий расход, важен при любой цели кампании. Вводим в $, храним в сом. */}
        <div>
          <label className="label">Потрачено, $</label>
          <input
            className="input"
            name="spentUsd"
            type="number"
            min="0"
            step="any"
            value={spentUsd}
            onChange={(e) => setSpentUsd(e.target.value)}
          />
          <input type="hidden" name="usdRate" value={rate} />
          {spentSom > 0 && (
            <p className="mt-1 text-xs text-muted">
              ≈ {num(spentSom)} сом при курсе {rate}
            </p>
          )}
        </div>
        {objective === "LEADS" && (
          <div>
            <label className="label">Заявок</label>
            <input
              className="input"
              name="leads"
              type="number"
              min="0"
              value={leads}
              onChange={(e) => setLeads(e.target.value)}
            />
          </div>
        )}
        {objective === "ENGAGEMENT" && (
          <div>
            <label className="label">Вовлечённость (лайки, комментарии, сохранения)</label>
            <input className="input" name="engagement" type="number" min="0" />
          </div>
        )}
        {(objective === "TRAFFIC" || objective === "PROFILE_VISITS") && (
          <div>
            <label className="label">Переходы по ссылке (трафик)</label>
            <input className="input" name="traffic" type="number" min="0" />
          </div>
        )}
        <div>
          <label className="label">Целевых действий</label>
          <input className="input" name="actions" type="number" min="0" />
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

      <FormSection title="Скриншот кабинета" icon={ImageIcon} columns={1}>
        <ScreenshotInput name="screenshot" />
      </FormSection>

      <button className="btn-primary w-full !py-2.5">Сохранить отчёт</button>
    </form>
  );
}
