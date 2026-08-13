"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireUser } from "./auth";

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  return v === null ? "" : String(v);
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
