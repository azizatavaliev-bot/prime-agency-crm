"use client";

import { useState } from "react";
import { saveBonusRule } from "@/lib/actions";
import { BONUS_METRIC, BONUS_METRIC_HINT, BONUS_AMOUNT_TYPE, ROLES } from "@/lib/constants";
import Select from "./Select";

export type BonusRuleData = {
  id: string;
  name: string;
  metric: string;
  role: string | null;
  amountType: string;
  amount: number;
  threshold: number;
  perClient: boolean;
  active: boolean;
  hint: string | null;
  order: number;
};

/** Порог нужен не всем метрикам: у «плана по выручке» и «удержания» его нет. */
const THRESHOLD_LABEL: Record<string, string> = {
  CPL_TARGET: "Допуск к целевому CPL, %",
  TASKS_ONTIME: "Минимум задач в срок, %",
};

export default function BonusRuleForm({ rule }: { rule?: BonusRuleData }) {
  const [metric, setMetric] = useState(rule?.metric ?? "CPL_TARGET");
  const [amountType, setAmountType] = useState(rule?.amountType ?? "FIXED");
  const thresholdLabel = THRESHOLD_LABEL[metric];

  return (
    <form action={saveBonusRule} className="space-y-4">
      {rule && <input type="hidden" name="id" value={rule.id} />}

      <div>
        <label className="label">Название</label>
        <input
          className="input"
          name="name"
          required
          defaultValue={rule?.name}
          placeholder="Премия за попадание в CPL"
        />
      </div>

      <div>
        <label className="label">За какой результат</label>
        <Select
          name="metric"
          defaultValue={metric}
          onChange={setMetric}
          options={Object.entries(BONUS_METRIC).map(([value, label]) => ({ value, label }))}
        />
        <div className="mt-1.5 rounded-xl bg-subtle p-2.5 text-xs text-muted">
          {BONUS_METRIC_HINT[metric]}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Тип суммы</label>
          <Select
            name="amountType"
            defaultValue={amountType}
            onChange={setAmountType}
            options={Object.entries(BONUS_AMOUNT_TYPE).map(([value, label]) => ({ value, label }))}
          />
        </div>
        <div>
          <label className="label">{amountType === "PERCENT" ? "Процент, %" : "Сумма, сом"}</label>
          <input
            className="input"
            name="amount"
            type="number"
            min="0"
            step="any"
            required
            defaultValue={rule?.amount ?? ""}
            placeholder={amountType === "PERCENT" ? "10" : "5000"}
          />
        </div>

        {thresholdLabel && (
          <div>
            <label className="label">{thresholdLabel}</label>
            <input
              className="input"
              name="threshold"
              type="number"
              min="0"
              step="any"
              defaultValue={rule?.threshold ?? 0}
              placeholder={metric === "TASKS_ONTIME" ? "90" : "0"}
            />
          </div>
        )}

        <div>
          <label className="label">Кому применяется</label>
          <Select
            name="role"
            defaultValue={rule?.role ?? ""}
            options={[
              { value: "", label: "Всем сотрудникам" },
              ...Object.entries(ROLES)
                .filter(([key]) => key !== "OWNER")
                .map(([value, label]) => ({ value, label })),
            ]}
          />
        </div>
      </div>

      <div>
        <label className="label">Пояснение для себя</label>
        <input
          className="input"
          name="hint"
          defaultValue={rule?.hint ?? ""}
          placeholder="договорились на планёрке в августе"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="perClient" defaultChecked={rule?.perClient ?? true} />
          Начислять за каждый подходящий проект, а не один раз за месяц
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={rule?.active ?? true} />
          Правило включено
        </label>
      </div>

      <input type="hidden" name="order" value={rule?.order ?? 100} />

      <button className="btn-primary w-full">{rule ? "Сохранить" : "Добавить правило"}</button>
    </form>
  );
}
