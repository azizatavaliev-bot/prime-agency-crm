"use client";

import { useState } from "react";
import { Target, Code2, Clapperboard, CalendarDays } from "lucide-react";
import { saveTask } from "@/lib/actions";
import { BOARDS, stagesFor } from "@/lib/constants";
import { toInputDate } from "@/lib/format";
import Select from "./Select";
import DatePicker from "./DatePicker";

type Opt = { key: string; name: string };
type UserOpt = { id: string; name: string; role: string };

const BOARD_META: Record<string, { icon: typeof Target; hint: string }> = {
  TARGET: { icon: Target, hint: "Реклама и заявки" },
  DEV: { icon: Code2, hint: "Сайты и боты" },
  VIDEO: { icon: Clapperboard, hint: "Съёмка и монтаж" },
};

/** Дата через N дней от сегодня в формате для инпута. */
function shiftDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toInputDate(d);
}

export default function TaskForm({
  clients,
  users,
  task,
  fixedClientId,
  defaultBoard = "TARGET",
  stagesByBoard,
}: {
  clients: { id: string; name: string }[];
  users: UserOpt[];
  task?: {
    id: string;
    title: string;
    board: string;
    stage: string;
    clientId: string | null;
    assigneeId: string | null;
    dueAt: Date | null;
    comment: string | null;
  };
  fixedClientId?: string;
  defaultBoard?: string;
  stagesByBoard?: Record<string, Opt[]>;
}) {
  const [board, setBoard] = useState(task?.board ?? defaultBoard);
  const [due, setDue] = useState(toInputDate(task?.dueAt ?? new Date()));

  const stages: [string, string][] = stagesByBoard?.[board]
    ? stagesByBoard[board].map((s) => [s.key, s.name])
    : Object.entries(stagesFor(board));

  const quickDates: [string, string][] = [
    ["Сегодня", shiftDays(0)],
    ["Завтра", shiftDays(1)],
    ["Через неделю", shiftDays(7)],
  ];

  return (
    <form action={saveTask} className="space-y-5">
      {task && <input type="hidden" name="id" value={task.id} />}
      {fixedClientId && <input type="hidden" name="clientId" value={fixedClientId} />}
      <input type="hidden" name="board" value={board} />

      <div>
        <input
          className="input !text-base !py-3 font-medium"
          name="title"
          required
          autoFocus
          defaultValue={task?.title}
          placeholder="Что нужно сделать?"
        />
      </div>

      {/* Доска — карточками, чтобы было видно, куда попадёт задача */}
      <div>
        <div className="label">Доска</div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(BOARDS).map(([key, label]) => {
            const meta = BOARD_META[key] ?? BOARD_META.TARGET;
            const Icon = meta.icon;
            const active = board === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setBoard(key)}
                className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition ${
                  active
                    ? "accent-soft border-transparent ring-2 ring-[var(--accent)]"
                    : "border-zinc-200 hover:bg-subtle"
                }`}
              >
                <Icon size={18} className={active ? "accent-text" : "text-muted"} />
                <span className="text-xs font-medium">{label}</span>
                <span className="text-[10px] leading-tight text-muted">{meta.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Этап — чипами: сразу видно весь конвейер */}
      <div>
        <div className="label">Этап</div>
        <div className="flex flex-wrap gap-2">
          {stages.map(([key, label], i) => (
            <label key={key} className="cursor-pointer">
              <input
                type="radio"
                name="stage"
                value={key}
                defaultChecked={board === task?.board ? task.stage === key : i === 0}
                className="peer sr-only"
              />
              <span className="chip border-zinc-200 text-muted transition peer-checked:accent-gradient peer-checked:border-transparent peer-checked:text-white">
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {!fixedClientId && (
          <div>
            <label className="label">Клиент</label>
            <Select
              name="clientId"
              defaultValue={task?.clientId ?? ""}
              placeholder="— без клиента —"
              options={[
                { value: "", label: "— без клиента —" },
                ...clients.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
        )}
        <div>
          <label className="label">Ответственный</label>
          <Select
            name="assigneeId"
            defaultValue={task?.assigneeId ?? ""}
            placeholder="— не назначен —"
            options={[
              { value: "", label: "— не назначен —" },
              ...users.map((u) => ({ value: u.id, label: u.name })),
            ]}
          />
        </div>
      </div>

      {/* Дедлайн: быстрые кнопки + свой календарь */}
      <div>
        <label className="label flex items-center gap-1.5">
          <CalendarDays size={13} /> Дедлайн
        </label>
        <div className="mb-2 flex flex-wrap gap-2">
          {quickDates.map(([label, value]) => (
            <button
              key={label}
              type="button"
              onClick={() => setDue(value)}
              className={`chip transition ${
                due === value
                  ? "accent-gradient border-transparent text-white"
                  : "border-zinc-200 text-muted hover:bg-subtle"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {/* key заставляет календарь перечитать значение после быстрых кнопок */}
        <DatePicker key={due} name="dueAt" defaultValue={due} />
      </div>

      <div>
        <label className="label">Комментарий</label>
        <textarea
          className="input"
          name="comment"
          rows={2}
          defaultValue={task?.comment ?? ""}
          placeholder="Детали, ссылки, что важно не забыть"
        />
      </div>

      <button className="btn-primary w-full !py-2.5">{task ? "Сохранить" : "Добавить задачу"}</button>
    </form>
  );
}
