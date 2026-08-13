"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireUser } from "./auth";
import { clientScope } from "./access";

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  return v === null ? "" : String(v);
}

/** Голый текст из HTML заметки — для заголовка/комментария задачи. */
function plainText(html: string) {
  return html
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Создать пустую заметку в указанной папке — сразу возвращает её id для перехода в редактор. */
export async function createNote(folder: string) {
  const user = await requireUser();
  const note = await prisma.note.create({
    data: { userId: user.id, folder: folder || "Заметки", title: "", body: "" },
  });
  revalidatePath("/notes");
  return note.id;
}

/** Автосохранение содержимого заметки — вызывается с debounce из редактора. */
export async function saveNote(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const note = await prisma.note.findFirst({ where: { id, userId: user.id } });
  if (!note) return;
  await prisma.note.update({
    where: { id },
    data: { title: str(fd, "title"), body: str(fd, "body") },
  });
  revalidatePath("/notes");
}

export async function deleteNote(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const note = await prisma.note.findFirst({ where: { id, userId: user.id } });
  if (!note) return;
  await prisma.note.delete({ where: { id } });
  revalidatePath("/notes");
}

export async function togglePinNote(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const note = await prisma.note.findFirst({ where: { id, userId: user.id } });
  if (!note) return;
  await prisma.note.update({ where: { id }, data: { pinned: !note.pinned } });
  revalidatePath("/notes");
}

export async function moveNote(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const folder = str(fd, "folder") || "Заметки";
  const note = await prisma.note.findFirst({ where: { id, userId: user.id } });
  if (!note) return;
  await prisma.note.update({ where: { id }, data: { folder } });
  revalidatePath("/notes");
}

/** Привязать заметку к проекту (или отвязать — пустой clientId). */
export async function setNoteClient(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const clientId = str(fd, "clientId");
  const note = await prisma.note.findFirst({ where: { id, userId: user.id } });
  if (!note) return;
  if (clientId) {
    const client = await prisma.client.findFirst({ where: { AND: [{ id: clientId }, clientScope(user)] } });
    if (!client) return;
  }
  await prisma.note.update({ where: { id }, data: { clientId: clientId || null } });
  revalidatePath("/notes");
}

/**
 * Превращает заметку в настоящую задачу на доске — заголовок из первой строки,
 * остальное в комментарий, проект уже подставлен, если заметка была к нему привязана.
 * Заметка не удаляется — можно оставить как черновик и превратить в задачу ещё раз.
 */
export async function convertNoteToTask(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const note = await prisma.note.findFirst({ where: { id, userId: user.id } });
  if (!note) return null;

  if (note.clientId) {
    const client = await prisma.client.findFirst({ where: { AND: [{ id: note.clientId }, clientScope(user)] } });
    if (!client) return null;
  }

  const text = plainText(note.body);
  const lines = text.split("\n").filter(Boolean);
  const title = note.title.trim() || lines[0] || "Задача из заметки";
  const comment = (note.title.trim() ? lines : lines.slice(1)).join("\n") || null;

  const task = await prisma.task.create({
    data: {
      title,
      board: "TARGET",
      stage: "TODO",
      clientId: note.clientId,
      assigneeId: user.id,
      comment,
    },
  });
  revalidatePath("/notes");
  revalidatePath("/tasks");
  return task.id;
}
