"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { requireUser } from "./auth";
import { can, clientScope } from "./access";
import { extractTaskCandidates } from "./ai";
import { notifyAssignee } from "./tasks";
import { notifyTaskStakeholders } from "./actions";

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  return v === null || v === "" ? null : String(v);
}
function req(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}
function date(fd: FormData, k: string) {
  const v = str(fd, k);
  return v ? new Date(v) : null;
}

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: "текста, вставленного вручную",
  AUDIO: "транскрипта аудиозаписи планёрки",
  CHAT: "лога командного чата",
};

/**
 * Прогоняет вставленный текст через Claude и сохраняет кандидатов в задачи
 * со статусом PENDING — ничего не создаёт на доске напрямую, ждёт подтверждения
 * человеком на /tasks/inbox.
 */
export type ExtractState = { ok: boolean; error?: string; count?: number };

export async function extractCandidates(_prev: ExtractState, fd: FormData): Promise<ExtractState> {
  const user = await requireUser();
  if (!can.manageTaskInbox(user)) redirect("/no-access");

  const rawText = req(fd, "rawText");
  const source = req(fd, "source") || "MANUAL";
  if (!rawText) return { ok: false, error: "Вставьте текст" };

  const [clients, users] = await Promise.all([
    prisma.client.findMany({ where: clientScope(user), select: { id: true, name: true } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, role: true } }),
  ]);

  let found;
  try {
    found = await extractTaskCandidates(rawText, {
      clients,
      users,
      sourceLabel: SOURCE_LABEL[source] ?? SOURCE_LABEL.MANUAL,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Не удалось разобрать текст" };
  }

  if (found.length) {
    await prisma.taskCandidate.createMany({
      data: found.map((c) => ({
        source,
        rawText: c.rawText || rawText.slice(0, 500),
        title: c.title,
        comment: c.comment,
        clientId: c.clientId && clients.some((cl) => cl.id === c.clientId) ? c.clientId : null,
        assigneeId: c.assigneeId && users.some((u) => u.id === c.assigneeId) ? c.assigneeId : null,
        dueAt: c.dueAt ? new Date(c.dueAt) : null,
        priority: c.priority || "MEDIUM",
        status: "PENDING",
      })),
    });
  }

  revalidatePath("/tasks/inbox");
  return { ok: true, count: found.length };
}

/** Подтверждение кандидата (с возможной правкой полей) — создаёт настоящую задачу. */
export async function confirmCandidate(fd: FormData) {
  const user = await requireUser();
  if (!can.manageTaskInbox(user)) redirect("/no-access");

  const id = req(fd, "id");
  const candidate = await prisma.taskCandidate.findFirst({ where: { id, status: "PENDING" } });
  if (!candidate) return;

  const data = {
    title: req(fd, "title") || candidate.title,
    board: "TARGET",
    stage: "TODO",
    clientId: str(fd, "clientId"),
    assigneeId: str(fd, "assigneeId"),
    dueAt: date(fd, "dueAt"),
    comment: str(fd, "comment"),
    priority: req(fd, "priority") || candidate.priority,
  };

  const task = await prisma.task.create({ data });

  await prisma.taskCandidate.update({
    where: { id },
    data: { status: "CONFIRMED", createdTaskId: task.id, createdById: user.id, decidedAt: new Date() },
  });

  if (data.assigneeId && data.assigneeId !== user.id) await notifyAssignee(data.assigneeId, task, "Новая задача");
  const client = data.clientId
    ? await prisma.client.findUnique({ where: { id: data.clientId }, select: { targetologId: true, accountId: true } })
    : null;
  await notifyTaskStakeholders(task, client, "TASK_DUE", `Задача из ИИ-инбокса: ${task.title}`);

  revalidatePath("/tasks/inbox");
  revalidatePath("/tasks");
}

export async function rejectCandidate(fd: FormData) {
  const user = await requireUser();
  if (!can.manageTaskInbox(user)) redirect("/no-access");
  const id = req(fd, "id");
  const candidate = await prisma.taskCandidate.findFirst({ where: { id, status: "PENDING" } });
  if (!candidate) return;
  await prisma.taskCandidate.update({
    where: { id },
    data: { status: "REJECTED", createdById: user.id, decidedAt: new Date() },
  });
  revalidatePath("/tasks/inbox");
}
