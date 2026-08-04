import "server-only";
import { prisma } from "./prisma";
import { sendTg, escapeHtml, type TgButton } from "./telegram";
import { PRIORITY, PRIORITY_ORDER, RECURRENCE } from "./constants";
import { dateRu, daysUntil } from "./format";

export type TaskLite = {
  id: string;
  title: string;
  board: string;
  stage: string;
  priority: string;
  dueAt: Date | null;
  done: boolean;
  comment?: string | null;
};

const PRIORITY_EMOJI: Record<string, string> = {
  URGENT: "🔥",
  HIGH: "⬆️",
  MEDIUM: "➖",
  LOW: "⬇️",
};

/** Бейдж срока — одна функция на доску, список, календарь и бота. */
export function deadlineBadge(dueAt: Date | null, done: boolean) {
  if (done) return { text: "выполнена", tone: "good" as const, emoji: "✅" };
  const d = daysUntil(dueAt);
  if (d === null) return { text: "без срока", tone: "muted" as const, emoji: "📅" };
  if (d < 0) return { text: `просрочено ${-d} дн.`, tone: "bad" as const, emoji: "⚠️" };
  if (d === 0) return { text: "сегодня", tone: "warn" as const, emoji: "🔥" };
  if (d === 1) return { text: "завтра", tone: "warn" as const, emoji: "⏳" };
  return { text: dateRu(dueAt), tone: "muted" as const, emoji: "📅" };
}

/** Сортировка: сначала срочные, внутри — по сроку, просроченные выше. */
export function sortTasks<T extends { priority: string; dueAt: Date | null; done: boolean }>(list: T[]) {
  return [...list].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const p = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
    if (p !== 0) return p;
    if (!a.dueAt && !b.dueAt) return 0;
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return a.dueAt.getTime() - b.dueAt.getTime();
  });
}

/** Карточка задачи для Telegram с кнопками смены статуса. */
export function taskCard(t: TaskLite, clientName?: string | null) {
  const b = deadlineBadge(t.dueAt, t.done);
  const lines = [
    `${PRIORITY_EMOJI[t.priority] ?? "➖"} <b>${escapeHtml(t.title)}</b>`,
    clientName ? `👤 ${escapeHtml(clientName)}` : null,
    `${b.emoji} ${b.text}`,
    t.comment ? `\n${escapeHtml(t.comment.slice(0, 200))}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export function taskButtons(t: TaskLite): TgButton[][] {
  if (t.done) return [[{ text: "↩️ Вернуть в работу", data: `t_undone_${t.id}` }]];
  return [
    [
      { text: "🔄 В работу", data: `t_prog_${t.id}` },
      { text: "✅ Готово", data: `t_done_${t.id}` },
    ],
    [{ text: "📋 Мои задачи", data: "t_mine" }],
  ];
}

/** Уведомить исполнителя: в приложении и в Telegram, если привязан. */
export async function notifyAssignee(userId: string, task: TaskLite, headline: string, clientName?: string | null) {
  await prisma.notification.create({
    data: {
      userId,
      kind: "NEW_LEAD",
      title: `${headline}: ${task.title}`,
      body: task.dueAt ? `Срок: ${dateRu(task.dueAt)}` : undefined,
      link: `/tasks?board=${task.board}`,
    },
  });
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u?.tgChatId) return;
  await sendTg(u.tgChatId, `<b>${headline}</b>\n\n${taskCard(task, clientName)}`, undefined, taskButtons(task));
}

/** Следующая дата повтора. Выходные переносим на понедельник — как в FADAMOS. */
export function nextRecurrence(from: Date, rule: string): Date | null {
  const d = new Date(from);
  switch (rule) {
    case "DAILY":
      d.setDate(d.getDate() + 1);
      break;
    case "WEEKDAYS":
      d.setDate(d.getDate() + 1);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      break;
    case "WEEKLY":
      d.setDate(d.getDate() + 7);
      break;
    case "MONTHLY":
      d.setMonth(d.getMonth() + 1);
      break;
    default:
      return null;
  }
  return d;
}

/**
 * Закрытие/возврат задачи в одном месте: используется и доской, и ботом.
 * Повтор создаётся по факту закрытия, а не по расписанию — иначе копятся дубли
 * у того, кто не успел закрыть предыдущую.
 */
export async function closeOrReopenTask(t: { id: string; done: boolean; recurrence: string | null; dueAt: Date | null; title: string; board: string; stage: string; clientId: string | null; assigneeId: string | null; comment: string | null; priority: string; tags: string }, done: boolean) {
  await prisma.task.update({
    where: { id: t.id },
    data: { done, doneAt: done ? new Date() : null },
  });

  if (done && t.recurrence) {
    const base = t.dueAt ?? new Date();
    const next = nextRecurrence(base, t.recurrence);
    if (next) {
      const copy = await prisma.task.create({
        data: {
          title: t.title,
          board: t.board,
          stage: t.stage,
          clientId: t.clientId,
          assigneeId: t.assigneeId,
          comment: t.comment,
          priority: t.priority,
          tags: t.tags,
          dueAt: next,
          recurrence: t.recurrence,
          recurrenceParentId: t.id,
        },
      });
      // Переносим шаблон чеклиста в новую копию — иначе повтор приходит пустым.
      const items = await prisma.taskChecklistItem.findMany({
        where: { taskId: t.id },
        orderBy: { order: "asc" },
      });
      if (items.length)
        await prisma.taskChecklistItem.createMany({
          data: items.map((i) => ({ taskId: copy.id, text: i.text, order: i.order })),
        });
    }
  }
}

export { PRIORITY, RECURRENCE };
