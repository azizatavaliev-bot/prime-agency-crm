import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bridgeAuthorized, UNAUTHORIZED } from "../auth";

const BOARDS = ["TARGET", "DEV", "VIDEO"];
const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"];

/** Задачи агентства для Unity Tasks. Фильтр по клиенту — ?clientId=… */
export async function GET(req: Request) {
  if (!bridgeAuthorized(req)) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");

  const tasks = await prisma.task.findMany({
    where: { archivedAt: null, ...(clientId ? { clientId } : {}) },
    orderBy: [{ done: "asc" }, { dueAt: "asc" }, { order: "asc" }],
    take: 500,
    select: {
      id: true, title: true, board: true, stage: true, clientId: true, assigneeId: true,
      dueAt: true, done: true, priority: true, comment: true, doneAt: true,
      client: { select: { name: true } },
      assignee: { select: { name: true } },
    },
  });

  return NextResponse.json({
    tasks: tasks.map((t) => ({
      id: t.id, title: t.title, board: t.board, stage: t.stage,
      clientId: t.clientId, clientName: t.client?.name || null,
      assigneeId: t.assigneeId, assigneeName: t.assignee?.name || null,
      dueAt: t.dueAt, done: t.done, doneAt: t.doneAt, priority: t.priority, comment: t.comment,
    })),
  });
}

/** Создание задачи агентства из Unity Tasks. */
export async function POST(req: Request) {
  if (!bridgeAuthorized(req)) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "нужен заголовок" }, { status: 400 });

  const clientId = body.clientId ? String(body.clientId) : null;
  if (clientId) {
    const exists = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "клиент не найден" }, { status: 404 });
  }

  const board = BOARDS.includes(body.board) ? body.board : "TARGET";
  const priority = PRIORITIES.includes(body.priority) ? body.priority : "MEDIUM";

  const task = await prisma.task.create({
    data: {
      title,
      board,
      priority,
      clientId,
      assigneeId: body.assigneeId ? String(body.assigneeId) : null,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      comment: typeof body.comment === "string" ? body.comment.trim() || null : null,
    },
    select: { id: true, title: true },
  });
  return NextResponse.json({ task });
}
