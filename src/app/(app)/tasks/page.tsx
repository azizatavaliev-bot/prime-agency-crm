import Link from "next/link";
import { Plus, Check, Trash2, User as UserIcon, CalendarDays } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskScope, clientScope } from "@/lib/access";
import { moveTask, toggleTask, deleteTask, saveTask } from "@/lib/actions";
import { BOARDS } from "@/lib/constants";
import { dict, stagesOf } from "@/lib/dict";
import { dateRu, daysUntil } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import FormModal from "@/components/FormModal";
import StageSelect from "@/components/StageSelect";
import TaskForm from "@/components/TaskForm";
import { TaskModal } from "@/components/details";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string; mine?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const board =
    user.role === "CONTRACTOR"
      ? sp.board === "VIDEO"
        ? "VIDEO"
        : "DEV"
      : sp.board || "TARGET";
  const boards =
    user.role === "CONTRACTOR"
      ? (["DEV", "VIDEO"] as const)
      : (Object.keys(BOARDS) as (keyof typeof BOARDS)[]);

  const tasks = await prisma.task.findMany({
    where: {
      AND: [taskScope(user), { board }, sp.mine ? { assigneeId: user.id } : {}],
    },
    include: { client: true, assignee: true },
    orderBy: { createdAt: "desc" },
  });

  const [targetStages, devStages, videoStages] = await Promise.all([
    dict("STAGE_TARGET"),
    dict("STAGE_DEV"),
    dict("STAGE_VIDEO"),
  ]);
  const stagesByBoard: Record<string, { key: string; name: string }[]> = {
    TARGET: targetStages,
    DEV: devStages,
    VIDEO: videoStages,
  };
  const stages: [string, string][] = (await stagesOf(board)).map((s) => [s.key, s.name]);
  const clients = await prisma.client.findMany({
    where: clientScope(user),
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true },
  });

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
              <Link
                key={b}
                href={`/tasks?board=${b}`}
                className={board === b ? "btn-primary" : "btn-ghost"}
              >
                {BOARDS[b]}
              </Link>
            ))}
            <Link href={`/tasks?board=${board}${sp.mine ? "" : "&mine=1"}`} className="btn-ghost">
              {sp.mine ? "Все задачи" : "Только мои"}
            </Link>
            {user.role !== "CONTRACTOR" && (
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
                />
              </FormModal>
            )}
          </div>
        }
      />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(([key, label]) => {
          const col = tasks.filter((t) => t.stage === key);
          return (
            <div key={key} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-zinc-400">{col.length}</div>
              </div>
              <div className="space-y-2 rounded-2xl bg-zinc-100/70 p-2 min-h-[120px]">
                {col.map((t) => {
                  const d = daysUntil(t.dueAt);
                  return (
                    <div key={t.id} className={`card p-3 ${t.done ? "opacity-50" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <TaskModal
                          task={t}
                          clients={clients}
                          users={users}
                          canEdit={user.role !== "CONTRACTOR"}
                          stagesByBoard={stagesByBoard}
                          className="min-w-0 flex-1"
                          trigger={
                            <div className={`text-sm font-medium hover:underline ${t.done ? "line-through" : ""}`}>
                              {t.title}
                            </div>
                          }
                        />
                        <form action={toggleTask}>
                          <input type="hidden" name="id" value={t.id} />
                          <button
                            className="rounded-lg p-1 text-zinc-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                            title={t.done ? "Вернуть в работу" : "Выполнено"}
                          >
                            <Check size={14} />
                          </button>
                        </form>
                      </div>
                      {t.client && (
                        <Link
                          href={`/clients/${t.clientId}`}
                          className="mt-1 block text-xs text-zinc-500 hover:underline"
                        >
                          {t.client.name}
                        </Link>
                      )}
                      {t.comment && <div className="mt-1 text-xs text-zinc-500">{t.comment}</div>}
                      <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <UserIcon size={12} /> {t.assignee?.name ?? "—"}
                        </span>
                        <span
                          className={`flex items-center gap-1 ${
                            d !== null && d < 0 && !t.done ? "text-red-600" : ""
                          }`}
                        >
                          <CalendarDays size={12} /> {dateRu(t.dueAt)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <form action={moveTask} className="flex-1">
                          <input type="hidden" name="id" value={t.id} />
                          <StageSelect stages={stages} value={t.stage} />
                        </form>
                        {user.role !== "CONTRACTOR" && (
                          <form action={deleteTask}>
                            <input type="hidden" name="id" value={t.id} />
                            <button className="rounded-lg p-1 text-zinc-300 transition hover:bg-red-50 hover:text-red-600">
                              <Trash2 size={13} />
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
