"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, LayoutGrid, Sun, User as UserIcon, List as ListIcon } from "lucide-react";
import TaskBoard from "./TaskBoard";
import TaskCard, { type TaskCardData } from "./TaskCard";
import TaskDetail, { type TaskDetailData } from "./TaskDetail";

export type TaskView = "board" | "today" | "mine" | "list";

const VIEWS: { key: TaskView; label: string; icon: typeof LayoutGrid }[] = [
  { key: "board", label: "Доска", icon: LayoutGrid },
  { key: "today", label: "Сегодня", icon: Sun },
  { key: "mine", label: "Мои", icon: UserIcon },
  { key: "list", label: "Список", icon: ListIcon },
];

/**
 * Клиентская часть раздела задач: переключение представлений и модалка задачи.
 * Данные приходят уже посчитанными с сервера.
 */
export default function TasksClient({
  stages,
  tasks,
  details,
  tagLabels,
  canMove,
  canEdit,
  currentUserName,
  groups,
}: {
  stages: [string, string][];
  tasks: TaskCardData[];
  details: Record<string, TaskDetailData>;
  tagLabels: Record<string, string>;
  canMove: boolean;
  canEdit: boolean;
  currentUserName: string;
  groups: { overdue: string[]; today: string[]; noDate: string[]; mine: string[] };
}) {
  const [view, setView] = useState<TaskView>("board");
  const [openId, setOpenId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openId]);

  const byId = (id: string) => tasks.find((t) => t.id === id);
  const detail = openId ? details[openId] : null;

  const section = (title: string, ids: string[], tone?: string) =>
    ids.length > 0 && (
      <div key={title}>
        <div className={`mb-2 text-sm font-medium ${tone ?? ""}`}>
          {title} <span className="text-xs text-muted">· {ids.length}</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ids.map((id) => {
            const t = byId(id);
            return t ? (
              <TaskCard key={id} task={t} tagLabels={tagLabels} onOpen={() => setOpenId(id)} />
            ) : null;
          })}
        </div>
      </div>
    );

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map((v) => {
          const Icon = v.icon;
          return (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition ${
                view === v.key
                  ? "accent-gradient text-white font-medium"
                  : "bg-subtle text-muted hover:text-zinc-900"
              }`}
            >
              <Icon size={15} /> {v.label}
            </button>
          );
        })}
      </div>

      {view === "board" && (
        <TaskBoard
          stages={stages}
          tasks={tasks}
          tagLabels={tagLabels}
          onOpen={setOpenId}
          canMove={canMove}
        />
      )}

      {view === "today" && (
        <div className="space-y-6">
          {section("Просрочено", groups.overdue, "text-red-600")}
          {section("Сегодня", groups.today, "text-amber-600")}
          {section("Без срока", groups.noDate)}
          {groups.overdue.length + groups.today.length + groups.noDate.length === 0 && (
            <div className="card p-8 text-center text-sm text-muted">На сегодня всё чисто 👌</div>
          )}
        </div>
      )}

      {view === "mine" && (
        <div className="space-y-6">
          {section(`Задачи — ${currentUserName}`, groups.mine)}
          {groups.mine.length === 0 && (
            <div className="card p-8 text-center text-sm text-muted">Задач на вас нет</div>
          )}
        </div>
      )}

      {view === "list" && (
        <div className="space-y-6">
          {stages.map(([key, label]) =>
            section(
              label,
              tasks.filter((t) => t.stage === key).map((t) => t.id)
            )
          )}
        </div>
      )}

      {mounted &&
        openId &&
        detail &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-900/50 p-4 backdrop-blur-sm"
            onClick={() => setOpenId(null)}
          >
            <div
              className="card my-8 w-full max-w-4xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight">{detail.title}</h2>
                  <p className="mt-0.5 text-sm text-muted">{detail.clientName ?? "без клиента"}</p>
                </div>
                <button className="btn-ghost !px-2 !py-1.5" onClick={() => setOpenId(null)}>
                  <X size={16} />
                </button>
              </div>
              <TaskDetail task={detail} canEdit={canEdit} />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
