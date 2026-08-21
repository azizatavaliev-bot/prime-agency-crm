"use client";

import { useState, useTransition } from "react";
import {
  ListChecks,
  MessageSquare,
  Plus,
  Trash2,
  Check,
  Archive,
  Repeat,
  Flag,
} from "lucide-react";
import {
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  addTaskComment,
  deleteTaskComment,
  setTaskPriority,
  archiveTask,
  toggleTask,
  assignToSelf,
} from "@/lib/actions";
import { PRIORITY, RECURRENCE } from "@/lib/constants";
import { Field, Avatar } from "./ui";
import { UserPlus } from "lucide-react";

export type TaskDetailData = {
  id: string;
  title: string;
  board: string;
  stage: string;
  priority: string;
  done: boolean;
  dueAtLabel: string;
  deadlineLabel: string;
  recurrence: string | null;
  comment: string | null;
  clientName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  archived: boolean;
  checklist: { id: string; text: string; done: boolean }[];
  comments: { id: string; text: string; author: string; when: string; mine: boolean }[];
};

/** Частые пункты чеклиста таргетолога при запуске рекламы на новом проекте. */
const CHECKLIST_TEMPLATES = [
  "Подключить номер",
  "Подключить Инстаграм",
  "Сделать рекламные креативы",
  "Собрать гипотезы",
  "Настроить рекламный кабинет",
  "Согласовать бюджет с клиентом",
  "Запустить тест",
  "Прислать первый отчёт",
];

/** Правая часть модалки задачи: чеклист и обсуждение — как в Unity/FADAMOS. */
export default function TaskDetail({
  task,
  canEdit,
  currentUserId,
}: {
  task: TaskDetailData;
  canEdit: boolean;
  currentUserId?: string;
}) {
  const [pending, start] = useTransition();
  const [newItem, setNewItem] = useState("");
  const [newComment, setNewComment] = useState("");

  const doneCount = task.checklist.filter((i) => i.done).length;
  const pct = task.checklist.length ? (doneCount / task.checklist.length) * 100 : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        {/* Полей переменное число (повтор и описание есть не у всех задач) —
            fill-last-row дотягивает последнее, чтобы ряд не обрывался */}
        <div className="fill-last-row grid gap-4 rounded-2xl border border-zinc-200 p-4 sm:grid-cols-2">
          <Field label="Ответственный" value={task.assigneeName ?? "не назначен"} />
          <Field label="Клиент" value={task.clientName ?? "—"} />
          <Field label="Дедлайн" value={task.dueAtLabel} />
          <Field label="Срок" value={task.deadlineLabel} />
          {task.recurrence && (
            <Field
              label="Повтор"
              value={
                <span className="flex items-center gap-1.5">
                  <Repeat size={13} /> {RECURRENCE[task.recurrence as keyof typeof RECURRENCE]}
                </span>
              }
            />
          )}
          {task.comment && <Field label="Описание" value={task.comment} />}
        </div>

        {canEdit && (
          <div className="rounded-2xl border border-zinc-200 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Flag size={14} /> Приоритет
            </div>
            {/* Тот же паттерн выбора, что и в форме задачи (chip + accent-gradient) —
                раньше активный вариант почти не отличался от неактивного. */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(PRIORITY).map(([key, label]) => {
                const active = task.priority === key;
                return (
                  <form key={key} action={setTaskPriority}>
                    <input type="hidden" name="id" value={task.id} />
                    <input type="hidden" name="priority" value={key} />
                    <button
                      className={`chip transition ${
                        active
                          ? "accent-gradient border-transparent text-white ring-2 ring-offset-1 ring-[var(--accent)]"
                          : "border-zinc-200 text-muted hover:bg-subtle"
                      }`}
                    >
                      {label}
                    </button>
                  </form>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <form action={toggleTask}>
            <input type="hidden" name="id" value={task.id} />
            <button className={task.done ? "btn-ghost" : "btn-primary"}>
              <Check size={15} /> {task.done ? "Вернуть в работу" : "Выполнено"}
            </button>
          </form>
          {canEdit && currentUserId && task.assigneeId !== currentUserId && (
            <form action={assignToSelf}>
              <input type="hidden" name="id" value={task.id} />
              <button className="btn-ghost">
                <UserPlus size={15} /> Взять на себя
              </button>
            </form>
          )}
          {canEdit && (
            <form action={archiveTask}>
              <input type="hidden" name="id" value={task.id} />
              <button className="btn-ghost">
                <Archive size={15} /> {task.archived ? "Вернуть из архива" : "В архив"}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ListChecks size={14} /> Чеклист
            </div>
            {task.checklist.length > 0 && (
              <span className="text-xs text-muted">
                {doneCount}/{task.checklist.length}
              </span>
            )}
          </div>

          {task.checklist.length > 0 && (
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-subtle">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          )}

          <div className="space-y-1">
            {task.checklist.map((i) => (
              <div key={i.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-subtle">
                <form action={toggleChecklistItem}>
                  <input type="hidden" name="id" value={i.id} />
                  <button
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                      i.done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-zinc-300 hover:border-emerald-500"
                    }`}
                  >
                    {i.done && <Check size={11} strokeWidth={3} />}
                  </button>
                </form>
                <span className={`min-w-0 flex-1 text-sm ${i.done ? "text-muted line-through" : ""}`}>
                  {i.text}
                </span>
                {canEdit && (
                  <form action={deleteChecklistItem} className="opacity-0 transition group-hover:opacity-100">
                    <input type="hidden" name="id" value={i.id} />
                    <button className="rounded p-0.5 text-zinc-300 hover:text-red-600">
                      <Trash2 size={12} />
                    </button>
                  </form>
                )}
              </div>
            ))}
            {task.checklist.length === 0 && (
              <div className="py-1 text-xs text-muted">Пунктов пока нет</div>
            )}
          </div>

          {canEdit && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {CHECKLIST_TEMPLATES.filter(
                (tpl) => !task.checklist.some((i) => i.text === tpl)
              ).map((tpl) => (
                <button
                  key={tpl}
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("taskId", task.id);
                    fd.set("text", tpl);
                    start(() => addChecklistItem(fd));
                  }}
                  className="rounded-lg border border-dashed border-zinc-300 px-2 py-1 text-[11px] text-muted transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  + {tpl}
                </button>
              ))}
            </div>
          )}

          <form
            action={(fd) => {
              start(() => addChecklistItem(fd));
              setNewItem("");
            }}
            className="mt-2 flex gap-2"
          >
            <input type="hidden" name="taskId" value={task.id} />
            <input
              className="input !py-1.5 text-sm"
              name="text"
              placeholder="Добавить пункт…"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
            />
            <button className="btn-ghost !px-2.5 !py-1.5" disabled={pending || !newItem.trim()}>
              <Plus size={15} />
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-zinc-200 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <MessageSquare size={14} /> Обсуждение
          </div>

          <div className="space-y-3">
            {task.comments.map((c) => (
              <div key={c.id} className="group flex gap-2">
                <Avatar name={c.author} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium">{c.author}</span>
                    <span className="text-[10px] text-muted">{c.when}</span>
                    {c.mine && (
                      <form action={deleteTaskComment} className="ml-auto opacity-0 group-hover:opacity-100">
                        <input type="hidden" name="id" value={c.id} />
                        <button className="rounded p-0.5 text-zinc-300 hover:text-red-600">
                          <Trash2 size={11} />
                        </button>
                      </form>
                    )}
                  </div>
                  <div className="mt-0.5 whitespace-pre-wrap text-sm">{c.text}</div>
                </div>
              </div>
            ))}
            {task.comments.length === 0 && (
              <div className="text-xs text-muted">Комментариев пока нет</div>
            )}
          </div>

          <form
            action={(fd) => {
              start(() => addTaskComment(fd));
              setNewComment("");
            }}
            className="mt-3 flex gap-2"
          >
            <input type="hidden" name="taskId" value={task.id} />
            <input
              className="input !py-1.5 text-sm"
              name="text"
              placeholder="Написать…"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button className="btn-primary !px-3 !py-1.5" disabled={pending || !newComment.trim()}>
              <Plus size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
