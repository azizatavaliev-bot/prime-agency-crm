"use client";

import Link from "next/link";
import { Check, CalendarDays, ListChecks, Repeat, MessageSquare } from "lucide-react";
import { toggleTask } from "@/lib/actions";
import { PRIORITY_BAR } from "@/lib/constants";
import { Avatar } from "./ui";

export type TaskCardData = {
  id: string;
  title: string;
  stage: string;
  priority: string;
  done: boolean;
  dueAt: string | null;
  tags: string;
  recurrence: string | null;
  clientId: string | null;
  clientName: string | null;
  assigneeName: string | null;
  checklistDone: number;
  checklistTotal: number;
  commentCount: number;
  startedAt: string | null;
  badge: { text: string; tone: string; emoji: string };
};

const TONE: Record<string, string> = {
  good: "text-emerald-600",
  warn: "text-amber-600",
  bad: "text-red-600",
  muted: "text-zinc-400",
};

/**
 * Карточка на доске. Приоритет — цветной полосой слева, чтобы срочное
 * читалось не открывая задачу (как в Unity и FADAMOS).
 */
export default function TaskCard({
  task,
  tagLabels,
  onOpen,
  dragging,
}: {
  task: TaskCardData;
  tagLabels: Record<string, string>;
  onOpen?: () => void;
  dragging?: boolean;
}) {
  const tags = task.tags ? task.tags.split(",").filter(Boolean) : [];
  const pct = task.checklistTotal ? (task.checklistDone / task.checklistTotal) * 100 : 0;

  return (
    <div
      className={`card relative overflow-hidden p-3 pl-4 ${task.done ? "opacity-50" : ""} ${
        dragging ? "shadow-lg ring-2 ring-[var(--accent)]" : ""
      }`}
    >
      <span
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: PRIORITY_BAR[task.priority] ?? PRIORITY_BAR.MEDIUM }}
      />

      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          className={`min-w-0 flex-1 text-left text-sm font-medium hover:underline ${
            task.done ? "line-through" : ""
          }`}
        >
          {task.title}
        </button>
        <form action={toggleTask}>
          <input type="hidden" name="id" value={task.id} />
          <button
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
              task.done
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-zinc-300 text-transparent hover:border-emerald-500 hover:text-emerald-500"
            }`}
            title={task.done ? "Выполнено — вернуть в работу" : "Отметить выполненной"}
          >
            <Check size={13} strokeWidth={3} />
          </button>
        </form>
      </div>

      {task.clientName && (
        <Link href={`/clients/${task.clientId}`} className="mt-1 block text-xs text-muted hover:underline">
          {task.clientName}
        </Link>
      )}

      {task.checklistTotal > 0 && (
        <div className="mt-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <ListChecks size={12} />
            {task.checklistDone}/{task.checklistTotal}
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-subtle">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-md bg-subtle px-1.5 py-0.5 text-[10px] text-muted">
              {tagLabels[t] ?? t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <div className="flex min-w-0 items-center gap-2 text-muted">
          {task.assigneeName ? (
            <span className="flex items-center gap-1.5">
              <Avatar name={task.assigneeName} size={18} />
              <span className="truncate">{task.assigneeName}</span>
            </span>
          ) : (
            <span>не назначен</span>
          )}
          {task.commentCount > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare size={11} /> {task.commentCount}
            </span>
          )}
          {task.recurrence && <Repeat size={11} />}
          {task.startedAt && !task.done && (
            <span className="rounded bg-amber-100 px-1 text-[10px] text-amber-700">в работе</span>
          )}
        </div>
        <span className={`flex shrink-0 items-center gap-1 ${TONE[task.badge.tone] ?? ""}`}>
          <CalendarDays size={12} /> {task.badge.text}
        </span>
      </div>
    </div>
  );
}
