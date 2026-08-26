"use client";

import { useState } from "react";
import { Target, Code2, Clapperboard, CalendarDays, Flag, Repeat, ListChecks } from "lucide-react";
import { saveTask } from "@/lib/actions";
import { BOARDS, stagesFor, PRIORITY, RECURRENCE } from "@/lib/constants";
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
  defaultAssigneeId,
  defaultBoard = "TARGET",
  stagesByBoard,
  tags = [],
}: {
  clients: { id: string; name: string; targetologId?: string | null; accountId?: string | null }[];
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
    priority?: string;
    tags?: string;
    recurrence?: string | null;
  };
  fixedClientId?: string;
  defaultAssigneeId?: string | null;
  defaultBoard?: string;
  stagesByBoard?: Record<string, Opt[]>;
  tags?: Opt[];
}) {
  const [board, setBoard] = useState(task?.board ?? defaultBoard);
  const [due, setDue] = useState(toInputDate(task?.dueAt ?? new Date()));
  const selectedTags = task?.tags ? task.tags.split(",").filter(Boolean) : [];

  // Ответственный подставляется сам, когда выбираем клиента — это его таргетолог/тимлид.
  // Если человек уже выбрал ответственного вручную, больше не трогаем.
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? defaultAssigneeId ?? "");
  const [assigneeTouched, setAssigneeTouched] = useState(Boolean(task?.assigneeId));
  const handleClientChange = (value: string) => {
    if (assigneeTouched) return;
    const c = clients.find((c) => c.id === value);
    const auto = c?.targetologId ?? c?.accountId ?? "";
    if (auto) setAssigneeId(auto);
  };

  const stages: [string, string][] = stagesByBoard?.[board]
    ? stagesByBoard[board].map((s) => [s.key, s.name])
    : Object.entries(stagesFor(board));

  const quickDates: [string, string][] = [
    ["Сегодня", shiftDays(0)],
    ["Завтра", shiftDays(1)],
    ["Послезавтра", shiftDays(2)],
    ["Через неделю", shiftDays(7)],
  ];

  return (
    /*
      Компактная раскладка: раньше девять блоков шли колонкой, кнопка
      «Добавить задачу» уезжала за экран и её приходилось искать скроллом.
      Теперь парные поля стоят в два столбца, а кнопка закреплена снизу.
    */
    <form action={saveTask} className="space-y-4">
      {task && <input type="hidden" name="id" value={task.id} />}
      {fixedClientId && <input type="hidden" name="clientId" value={fixedClientId} />}
      <input type="hidden" name="board" value={board} />

      <input
        className="input !text-base !py-2.5 font-medium"
        name="title"
        required
        autoFocus
        defaultValue={task?.title}
        placeholder="Что нужно сделать?"
      />

      {/* Доска — одной строкой: иконка и название, без подписи под ними */}
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
                title={meta.hint}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                  active
                    ? "accent-soft border-transparent ring-2 ring-[var(--accent)] font-medium"
                    : "border-zinc-200 text-muted hover:bg-subtle"
                }`}
              >
                <Icon size={15} className={active ? "accent-text" : ""} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
                <span className="chip chip-toggle border-zinc-200 text-muted transition">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="label">
            <Flag size={13} className="mr-1.5 inline-block align-[-2px]" />
            Приоритет
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRIORITY).map(([key, label]) => (
              <label key={key} className="cursor-pointer">
                <input
                  type="radio"
                  name="priority"
                  value={key}
                  defaultChecked={(task?.priority ?? "MEDIUM") === key}
                  className="peer sr-only"
                />
                <span className="chip chip-toggle border-zinc-200 text-muted transition">{label}</span>
              </label>
            ))}
          </div>
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
              onChange={handleClientChange}
              options={[
                { value: "", label: "— без клиента —" },
                ...clients.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
        )}
        <div className={fixedClientId ? "sm:col-span-2" : ""}>
          <label className="label">
            Ответственный
            {!assigneeTouched && assigneeId && <span className="ml-1 text-[10px] text-muted">(по проекту)</span>}
          </label>
          <Select
            name="assigneeId"
            value={assigneeId}
            placeholder="— не назначен —"
            onChange={(v) => {
              setAssigneeId(v);
              setAssigneeTouched(true);
            }}
            options={[
              { value: "", label: "— не назначен —" },
              ...users.map((u) => ({ value: u.id, label: u.name })),
            ]}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Дедлайн: быстрые кнопки и календарь в одну строку, а не друг под другом */}
        <div>
          <label className="label">
            <CalendarDays size={13} className="mr-1.5 inline-block align-[-2px]" />
            Дедлайн
          </label>
          <div className="flex flex-wrap items-center gap-2">
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
            {/* key заставляет календарь перечитать значение после быстрых кнопок */}
            <div className="min-w-[9rem] flex-1">
              <DatePicker key={due} name="dueAt" defaultValue={due} />
            </div>
          </div>
        </div>

        <div>
          <label className="label">
            <Repeat size={13} className="mr-1.5 inline-block align-[-2px]" />
            Повторять
          </label>
          <Select
            name="recurrence"
            defaultValue={task?.recurrence ?? ""}
            placeholder="— не повторять —"
            options={[
              { value: "", label: "— не повторять —" },
              ...Object.entries(RECURRENCE).map(([value, label]) => ({ value, label })),
            ]}
          />
          <div className="mt-1 text-[11px] text-muted">Повтор создастся, когда закроете текущую</div>
        </div>
      </div>

      {tags.length > 0 && (
        <div>
          <div className="label">Метки</div>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <label key={t.key} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="tags"
                  value={t.key}
                  defaultChecked={selectedTags.includes(t.key)}
                  className="peer sr-only"
                />
                <span className="chip chip-toggle border-zinc-200 text-muted transition">{t.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={task ? "sm:col-span-2" : ""}>
          <label className="label">Комментарий</label>
          <textarea
            className="input"
            name="comment"
            rows={3}
            defaultValue={task?.comment ?? ""}
            placeholder="Детали, ссылки, что важно не забыть"
          />
        </div>

        {!task && (
          <div>
            <label className="label">
              <ListChecks size={13} className="mr-1.5 inline-block align-[-2px]" />
              Чеклист
            </label>
            <textarea
              className="input"
              name="checklist"
              rows={3}
              placeholder={"Каждый пункт с новой строки\nснять сторис\nсобрать креативы"}
            />
          </div>
        )}
      </div>

      {/* Кнопка закреплена снизу окна — не нужно скроллить, чтобы сохранить */}
      <div className="form-footer">
        <button className="btn-primary w-full !py-2.5">{task ? "Сохранить" : "Добавить задачу"}</button>
      </div>
    </form>
  );
}
