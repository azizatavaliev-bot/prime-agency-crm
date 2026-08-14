"use client";

import { useState } from "react";
import { saveGoal } from "@/lib/actions";
import { GOAL_METRIC, GOAL_METRIC_HINT } from "@/lib/constants";
import Select from "./Select";

export type GoalData = {
  id: string;
  month: string;
  metric: string;
  target: number;
  comment: string | null;
  clientId: string | null;
};

export default function GoalForm({
  goal,
  clients,
  months,
  defaultMonth,
}: {
  goal?: GoalData;
  clients: { id: string; name: string }[];
  months: string[];
  defaultMonth: string;
}) {
  const [metric, setMetric] = useState(goal?.metric ?? "REVENUE");

  return (
    <form action={saveGoal} className="space-y-4">
      {goal && <input type="hidden" name="id" value={goal.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Месяц</label>
          <Select
            name="month"
            defaultValue={goal?.month ?? defaultMonth}
            options={months.map((m) => ({ value: m, label: m }))}
          />
        </div>
        <div>
          <label className="label">На кого цель</label>
          <Select
            name="clientId"
            defaultValue={goal?.clientId ?? ""}
            options={[
              { value: "", label: "Всё агентство" },
              ...clients.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
        <div>
          <label className="label">Показатель</label>
          <Select
            name="metric"
            defaultValue={metric}
            onChange={setMetric}
            options={Object.entries(GOAL_METRIC).map(([value, label]) => ({ value, label }))}
          />
        </div>
        <div>
          <label className="label">План</label>
          <input
            className="input"
            name="target"
            type="number"
            min="0"
            step="any"
            required
            defaultValue={goal?.target ?? ""}
          />
        </div>
      </div>

      <div className="rounded-xl bg-subtle p-2.5 text-xs text-muted">{GOAL_METRIC_HINT[metric]}</div>

      <div>
        <label className="label">За счёт чего достигаем</label>
        <input
          className="input"
          name="comment"
          defaultValue={goal?.comment ?? ""}
          placeholder="два новых клиента и допродажа сайтов"
        />
      </div>

      <button className="btn-primary w-full">{goal ? "Сохранить цель" : "Поставить цель"}</button>
    </form>
  );
}
