import Link from "next/link";
import { Plus, KanbanSquare, AlertTriangle, Sun, CheckCircle2, Layers } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskScope, clientScope } from "@/lib/access";
import { saveTask } from "@/lib/actions";
import { BOARDS } from "@/lib/constants";
import { dict, stagesOf } from "@/lib/dict";
import { dateRu, daysUntil } from "@/lib/format";
import { deadlineBadge, sortTasks, isOverdue } from "@/lib/tasks";
import { PageHeader, Stat } from "@/components/ui";
import FormModal from "@/components/FormModal";
import TaskForm from "@/components/TaskForm";
import TasksClient from "@/components/TasksClient";
import ApplyTemplate from "@/components/ApplyTemplate";
import type { TaskCardData } from "@/components/TaskCard";
import type { TaskDetailData } from "@/components/TaskDetail";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string; archived?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const board =
    (user.role === "DEVELOPER" || user.role === "EDITOR") ? (sp.board === "VIDEO" ? "VIDEO" : "DEV") : sp.board || "TARGET";
  const boards =
    (user.role === "DEVELOPER" || user.role === "EDITOR")
      ? (["DEV", "VIDEO"] as const)
      : (Object.keys(BOARDS) as (keyof typeof BOARDS)[]);
  const showArchived = sp.archived === "1";

  const rows = await prisma.task.findMany({
    where: {
      AND: [
        taskScope(user),
        { board },
        showArchived ? { NOT: { archivedAt: null } } : { archivedAt: null },
      ],
    },
    include: {
      client: { select: { id: true, name: true } },
      assignee: { select: { name: true } },
      checklist: { orderBy: { order: "asc" } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const sorted = sortTasks(rows);
  const [targetStages, devStages, videoStages, tagList] = await Promise.all([
    dict("STAGE_TARGET"),
    dict("STAGE_DEV"),
    dict("STAGE_VIDEO"),
    dict("TASK_TAG"),
  ]);
  const stagesByBoard: Record<string, { key: string; name: string }[]> = {
    TARGET: targetStages,
    DEV: devStages,
    VIDEO: videoStages,
  };
  const stages: [string, string][] = (await stagesOf(board)).map((s) => [s.key, s.name]);
  const tagLabels = Object.fromEntries(tagList.map((t) => [t.key, t.name]));

  const [clients, users] = await Promise.all([
    prisma.client.findMany({
      where: clientScope(user),
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, role: true } }),
  ]);

  const templates = await prisma.taskTemplate.findMany({
    where: { active: true },
    include: { _count: { select: { items: true } } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  const cards: TaskCardData[] = sorted.map((t) => ({
    id: t.id,
    title: t.title,
    stage: t.stage,
    priority: t.priority,
    done: t.done,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    tags: t.tags,
    recurrence: t.recurrence,
    clientId: t.clientId,
    clientName: t.client?.name ?? null,
    assigneeName: t.assignee?.name ?? null,
    checklistDone: t.checklist.filter((i) => i.done).length,
    checklistTotal: t.checklist.length,
    commentCount: t.comments.length,
    startedAt: t.startedAt ? t.startedAt.toISOString() : null,
    badge: deadlineBadge(t.dueAt, t.done),
  }));

  const details: Record<string, TaskDetailData> = {};
  for (const t of sorted) {
    const d = daysUntil(t.dueAt);
    details[t.id] = {
      id: t.id,
      title: t.title,
      board: t.board,
      stage: t.stage,
      priority: t.priority,
      done: t.done,
      dueAtLabel: dateRu(t.dueAt),
      deadlineLabel: t.done
        ? "выполнена"
        : d === null
          ? "—"
          : d < 0
            ? `просрочено ${-d} дн.`
            : `осталось ${d} дн.`,
      recurrence: t.recurrence,
      comment: t.comment,
      clientName: t.client?.name ?? null,
      assigneeName: t.assignee?.name ?? null,
      archived: Boolean(t.archivedAt),
      checklist: t.checklist.map((i) => ({ id: i.id, text: i.text, done: i.done })),
      comments: t.comments.map((c) => ({
        id: c.id,
        text: c.text,
        author: c.user?.name ?? "—",
        when: dateRu(c.createdAt),
        mine: c.userId === user.id,
      })),
    };
  }

  const active = sorted.filter((t) => !t.done);
  const overdue = active.filter((t) => isOverdue(t.dueAt, t.done));
  const todayList = active.filter((t) => t.dueAt && daysUntil(t.dueAt) === 0);
  const groups = {
    overdue: overdue.map((t) => t.id),
    today: todayList.map((t) => t.id),
    noDate: active.filter((t) => !t.dueAt).map((t) => t.id),
    mine: sorted.filter((t) => t.assigneeId === user.id).map((t) => t.id),
  };

  return (
    <div>
      <PageHeader
        title="Задачи"
        subtitle={
          board === "TARGET"
            ? "Этапы конвейера заявок по каждому проекту"
            : board === "DEV"
              ? "Доска разработки: сайты и чат-боты"
              : "Доска монтажа видео"
        }
        right={
          <div className="flex flex-wrap gap-2">
            {boards.map((b) => (
              <Link key={b} href={`/tasks?board=${b}`} className={board === b ? "btn-primary" : "btn-ghost"}>
                {BOARDS[b]}
              </Link>
            ))}
            <Link
              href={`/tasks?board=${board}${showArchived ? "" : "&archived=1"}`}
              className="btn-ghost"
            >
              {showArchived ? "Активные" : "Архив"}
            </Link>
            {user.role !== "DEVELOPER" && user.role !== "EDITOR" && (
              <ApplyTemplate
                templates={templates.map((t) => ({
                  id: t.id,
                  name: t.name,
                  hint: t.hint,
                  count: t._count.items,
                }))}
                clients={clients}
                users={users}
              />
            )}
            {user.role !== "DEVELOPER" && user.role !== "EDITOR" && (
              <FormModal
                label="Новая задача"
                title="Новая задача"
                icon={<Plus size={16} />}
                hint="Дедлайн включает напоминание исполнителю за день до срока и в день просрочки."
              >
                <TaskForm
                  clients={clients}
                  users={users}
                  defaultBoard={board}
                  stagesByBoard={stagesByBoard}
                  tags={tagList}
                />
              </FormModal>
            )}
          </div>
        }
      />

      <div className="mb-5 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="Всего активных" value={String(active.length)} icon={Layers} />
        <Stat
          label="Просрочено"
          value={String(overdue.length)}
          tone={overdue.length ? "bad" : "good"}
          icon={AlertTriangle}
        />
        <Stat label="Срок сегодня" value={String(todayList.length)} tone={todayList.length ? "warn" : "default"} icon={Sun} />
        <Stat label="Выполнено" value={String(sorted.filter((t) => t.done).length)} tone="good" icon={CheckCircle2} />
      </div>

      {sorted.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          {showArchived ? "В архиве пусто" : "Задач пока нет"}
        </div>
      ) : (
        <TasksClient
          stages={stages}
          tasks={cards}
          details={details}
          tagLabels={tagLabels}
          canMove={!showArchived}
          canEdit={user.role !== "DEVELOPER" && user.role !== "EDITOR"}
          currentUserName={user.name}
          groups={groups}
        />
      )}
    </div>
  );
}
