"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { Plus, X } from "lucide-react";
import TaskCard, { type TaskCardData } from "./TaskCard";
import { moveTask, saveDictItem } from "@/lib/actions";

/** Быстрое добавление этапа прямо с доски — то же, что и в Настройки → Справочники,
    но без перехода на другую страницу. */
function AddStageColumn({ board }: { board: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-40 shrink-0 items-center justify-center gap-1.5 self-start rounded-2xl border border-dashed border-zinc-300 text-xs text-muted transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <Plus size={13} /> Этап
      </button>
    );
  }

  const submit = () => {
    if (!name.trim()) return;
    const fd = new FormData();
    fd.set("type", `STAGE_${board}`);
    fd.set("active", "1");
    fd.set("name", name.trim());
    // Форма закрывается только после того, как этап реально сохранился —
    // иначе сворачиваем поле раньше, чем успевает уйти запрос.
    start(async () => {
      await saveDictItem(fd);
      setName("");
      setOpen(false);
    });
  };

  return (
    <div className="w-56 shrink-0">
      <div className="flex items-center gap-1">
        <input
          className="input !py-1.5 !text-sm"
          autoFocus
          disabled={pending}
          placeholder="Название этапа"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending || !name.trim()}
          className="btn-ghost !px-2 !py-1.5"
          title="Добавить"
        >
          <Plus size={14} />
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setName("");
          }}
          className="btn-ghost !px-2 !py-1.5"
          title="Отмена"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

function DraggableCard({
  task,
  tagLabels,
  onOpen,
  disabled,
}: {
  task: TaskCardData;
  tagLabels: Record<string, string>;
  onOpen: () => void;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`touch-manipulation ${isDragging ? "opacity-30" : ""}`}
    >
      <TaskCard task={task} tagLabels={tagLabels} onOpen={onOpen} />
    </div>
  );
}

function Column({
  stageKey,
  label,
  tasks,
  tagLabels,
  onOpen,
  disabled,
}: {
  stageKey: string;
  label: string;
  tasks: TaskCardData[];
  tagLabels: Record<string, string>;
  onOpen: (id: string) => void;
  disabled?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stageKey });
  return (
    <div className="w-72 shrink-0">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-zinc-400">{tasks.length}</div>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-[120px] space-y-2 rounded-2xl p-2 transition ${
          isOver ? "bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]" : "bg-subtle"
        }`}
      >
        {tasks.map((t) => (
          <DraggableCard
            key={t.id}
            task={t}
            tagLabels={tagLabels}
            onOpen={() => onOpen(t.id)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Канбан с перетаскиванием. Карточка переезжает сразу, запрос уходит следом —
 * при ошибке состояние откатывается (подход FADAMOS: доска не мигает перезагрузкой).
 */
export default function TaskBoard({
  stages,
  tasks: initial,
  tagLabels,
  onOpen,
  canMove,
  board,
  canEditStages,
}: {
  stages: [string, string][];
  tasks: TaskCardData[];
  tagLabels: Record<string, string>;
  onOpen: (id: string) => void;
  canMove: boolean;
  board?: string;
  canEditStages?: boolean;
}) {
  const [tasks, setTasks] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, start] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Сервер прислал новые данные — берём их за истину.
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setTasks(initial);
  }

  const active = tasks.find((t) => t.id === activeId) ?? null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const id = String(e.active.id);
    const stage = e.over ? String(e.over.id) : null;
    if (!stage) return;

    const task = tasks.find((t) => t.id === id);
    if (!task || task.stage === stage) return;

    const before = tasks;
    setTasks((list) => list.map((t) => (t.id === id ? { ...t, stage } : t)));

    const fd = new FormData();
    fd.set("id", id);
    fd.set("stage", stage);
    start(async () => {
      try {
        await moveTask(fd);
      } catch {
        setTasks(before); // откат: этап не сохранился
      }
    });
  }

  return (
    // id задан явно: иначе dnd-kit генерирует aria-атрибуты со счётчиком,
    // который на сервере и клиенте разный — и React ругается на гидратацию.
    <DndContext id="task-board" sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 scroll-hint">
        {stages.map(([key, label]) => (
          <Column
            key={key}
            stageKey={key}
            label={label}
            tasks={tasks.filter((t) => t.stage === key)}
            tagLabels={tagLabels}
            onOpen={onOpen}
            disabled={!canMove}
          />
        ))}
        {canEditStages && board && <AddStageColumn board={board} />}
      </div>
      <DragOverlay>
        {active && (
          <div className="w-72 rotate-2">
            <TaskCard task={active} tagLabels={tagLabels} dragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
