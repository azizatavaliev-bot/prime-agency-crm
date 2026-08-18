import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bridgeAuthorized, UNAUTHORIZED } from "../../auth";

const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"];

/** Правка задачи агентства из Unity Tasks: закрытие, срок, исполнитель. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!bridgeAuthorized(req)) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "нет тела запроса" }, { status: 400 });

  const task = await prisma.task.findUnique({ where: { id }, select: { id: true, done: true } });
  if (!task) return NextResponse.json({ error: "задача не найдена" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body.comment === "string") data.comment = body.comment.trim() || null;
  if (body.priority && PRIORITIES.includes(body.priority)) data.priority = body.priority;
  if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId || null;
  if (body.clientId !== undefined) data.clientId = body.clientId || null;
  if (body.dueAt !== undefined) data.dueAt = body.dueAt ? new Date(body.dueAt) : null;
  if (typeof body.done === "boolean") {
    data.done = body.done;
    // doneAt нужен отчёту по выполнению: без отметки закрытая задача не попадёт в срез за месяц.
    data.doneAt = body.done ? new Date() : null;
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: "нечего менять" }, { status: 400 });

  const updated = await prisma.task.update({ where: { id }, data, select: { id: true, title: true, done: true } });
  return NextResponse.json({ ok: true, task: updated });
}

/** Убираем в архив, а не удаляем: история выполнения нужна для отчётов. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!bridgeAuthorized(req)) return NextResponse.json(UNAUTHORIZED, { status: 401 });
  const { id } = await ctx.params;
  const task = await prisma.task.findUnique({ where: { id }, select: { id: true } });
  if (!task) return NextResponse.json({ error: "задача не найдена" }, { status: 404 });
  await prisma.task.update({ where: { id }, data: { archivedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
