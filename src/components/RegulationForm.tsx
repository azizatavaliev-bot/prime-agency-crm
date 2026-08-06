"use client";

import { useState } from "react";
import { saveRegulation } from "@/lib/actions";
import Select from "./Select";

const PALETTE = [
  "#6d5efc",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
  "#71717a",
];

export type RegulationDefaults = {
  id: string;
  title: string;
  description: string | null;
  color: string;
  itemsText: string;
  notes: string | null;
  ownerId: string | null;
  assignees: string[];
};

export default function RegulationForm({
  users,
  reg,
}: {
  users: { id: string; name: string; role: string }[];
  reg?: RegulationDefaults;
}) {
  const [color, setColor] = useState(reg?.color ?? PALETTE[0]);

  return (
    <form action={saveRegulation} className="space-y-4">
      {reg && <input type="hidden" name="id" value={reg.id} />}
      <input type="hidden" name="color" value={color} />

      <div>
        <label className="label">Название зоны</label>
        <input
          className="input"
          name="title"
          required
          autoFocus
          defaultValue={reg?.title}
          placeholder="Ведение рекламных кабинетов"
        />
      </div>

      <div>
        <label className="label">Кратко о зоне</label>
        <input
          className="input"
          name="description"
          defaultValue={reg?.description ?? ""}
          placeholder="За что человек отвечает в одну строку"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Основной ответственный</label>
          <Select
            name="ownerId"
            defaultValue={reg?.ownerId ?? ""}
            placeholder="— не назначен —"
            options={[
              { value: "", label: "— не назначен —" },
              ...users.map((u) => ({ value: u.id, label: u.name })),
            ]}
          />
        </div>
        <div>
          <label className="label">Цвет</label>
          <div className="flex flex-wrap gap-2 pt-1.5">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-lg transition ${
                  color === c ? "ring-2 ring-offset-2 ring-zinc-400" : ""
                }`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="label">Кто ещё участвует</label>
        <div className="flex flex-wrap gap-2">
          {users.map((u) => (
            <label key={u.id} className="cursor-pointer">
              <input
                type="checkbox"
                name="assignees"
                value={u.id}
                defaultChecked={reg?.assignees.includes(u.id)}
                className="peer sr-only"
              />
              <span className="chip border-zinc-200 text-muted transition peer-checked:accent-gradient peer-checked:border-transparent peer-checked:text-white">
                {u.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Обязанности</label>
        <textarea
          className="input font-mono text-xs"
          name="items"
          rows={10}
          defaultValue={reg?.itemsText}
          placeholder={
            "#Ежедневно\nПроверить открутку по всем кабинетам\nСвести заявки за вчера\n\n#Еженедельно\nСобрать отчёт клиенту\nОбновить связки"
          }
        />
        <div className="mt-1 text-xs text-muted">
          Каждый пункт с новой строки. Строка, начинающаяся с <code>#</code>, — заголовок блока.
        </div>
      </div>

      <div>
        <label className="label">Примечания</label>
        <textarea className="input" name="notes" rows={2} defaultValue={reg?.notes ?? ""} />
      </div>

      <button className="btn-primary w-full">{reg ? "Сохранить" : "Создать регламент"}</button>
    </form>
  );
}
