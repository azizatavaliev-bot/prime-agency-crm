"use client";

import { useState } from "react";
import { CalendarRange, Banknote, Target, Layers } from "lucide-react";
import { saveReport } from "@/lib/actions";
import { toInputDate, num } from "@/lib/format";
import { REPORT_OBJECTIVE } from "@/lib/constants";
import Select from "./Select";
import DatePicker from "./DatePicker";
import FormSection from "./FormSection";

/** Дата на N дней назад в формате инпута. */
function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toInputDate(d);
}

export default function ReportForm({
  clients,
  fixedClientId,
  defaultTargetCpl,
}: {
  clients: { id: string; name: string; targetCpl?: number | null }[];
  fixedClientId?: string;
  defaultTargetCpl?: number | null;
}) {
  const [clientId, setClientId] = useState(fixedClientId ?? clients[0]?.id ?? "");
  const [from, setFrom] = useState(daysAgo(7));
  const [spent, setSpent] = useState("");
  const [leads, setLeads] = useState("");
  const [objective, setObjective] = useState<string>("LEADS");

  // цель по CPL обычно задана в карточке клиента — подставляем её
  const clientCpl = clients.find((c) => c.id === clientId)?.targetCpl ?? defaultTargetCpl ?? null;

  const cpl = Number(spent) > 0 && Number(leads) > 0 ? Number(spent) / Number(leads) : null;
  const overTarget = cpl !== null && clientCpl ? cpl > clientCpl : null;

  const periods: [string, string][] = [
    ["Неделя", daysAgo(7)],
    ["2 недели", daysAgo(14)],
    ["Месяц", daysAgo(30)],
  ];

  return (
    <form action={saveReport} className="space-y-4">
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
          <DatePicker name="periodTo" defaultValue={toInputDate(new Date())} />
        </div>
      </FormSection>

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
        <div>
          <label className="label">Рекламный бюджет, сом</label>
          <input className="input" name="budget" type="number" min="0" step="any" />
        </div>
        {/* «Потрачено» — общий расход, важен при любой цели кампании */}
        <div>
          <label className="label">Потрачено, сом</label>
          <input
            className="input"
            name="spent"
            type="number"
            min="0"
            step="any"
            value={spent}
            onChange={(e) => setSpent(e.target.value)}
          />
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
        {objective === "TRAFFIC" && (
          <div>
            <label className="label">Переходы по ссылке (трафик)</label>
            <input className="input" name="traffic" type="number" min="0" />
          </div>
        )}
        {objective === "PROFILE_VISITS" && (
          <div>
            <label className="label">Посещения профиля</label>
            <input className="input" name="profileVisits" type="number" min="0" />
          </div>
        )}
        <div>
          <label className="label">Целевых действий</label>
          <input className="input" name="actions" type="number" min="0" />
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
            defaultValue={clientCpl ?? ""}
            placeholder="порог решения"
          />
        </div>
        <div>
          <label className="label">Целевой CPA, сом</label>
          <input className="input" name="targetCpa" type="number" min="0" step="any" />
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
          <input className="input" name="bundles" placeholder="3 связки в тесте, 1 масштабируем" />
        </div>
        <div>
          <label className="label">Комментарий</label>
          <textarea className="input" name="comment" rows={2} placeholder="что меняем в следующем периоде" />
        </div>
      </FormSection>

      <button className="btn-primary w-full !py-2.5">Сохранить отчёт</button>
    </form>
  );
}
