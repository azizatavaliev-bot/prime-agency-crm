import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bridgeAuthorized, UNAUTHORIZED } from "../../../auth";

const MEMBER_ROLES = ["TARGETOLOG", "ACCOUNT", "CONTRACTOR"];

/** Кто работает на проекте агентства. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!bridgeAuthorized(req)) return NextResponse.json(UNAUTHORIZED, { status: 401 });
  const { id } = await ctx.params;

  const members = await prisma.clientMember.findMany({
    where: { clientId: id },
    select: { id: true, userId: true, role: true, rate: true, rateType: true, user: { select: { name: true } } },
  });
  return NextResponse.json({
    members: members.map((m) => ({ id: m.id, userId: m.userId, name: m.user.name, role: m.role, rate: m.rate, rateType: m.rateType })),
  });
}

/**
 * Замена состава участников. Ставки существующих сохраняем: список приходит
 * из Unity Tasks, где про проценты ничего не знают.
 */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!bridgeAuthorized(req)) return NextResponse.json(UNAUTHORIZED, { status: 401 });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  // Тип задаём здесь: без него параметры дальше выводились как any и ломали сборку.
  const incoming: { userId?: string; role?: string }[] | null = Array.isArray(body?.members)
    ? body.members
    : null;
  if (!incoming) return NextResponse.json({ error: "members обязателен" }, { status: 400 });

  const client = await prisma.client.findUnique({ where: { id }, select: { id: true } });
  if (!client) return NextResponse.json({ error: "клиент не найден" }, { status: 404 });

  const wanted = incoming
    .map((m: { userId?: string; role?: string }) => ({ userId: String(m.userId || ""), role: String(m.role || "TARGETOLOG") }))
    .filter((m: { userId: string; role: string }) => m.userId && MEMBER_ROLES.includes(m.role));

  const existing = await prisma.clientMember.findMany({ where: { clientId: id }, select: { id: true, userId: true, role: true } });
  const key = (m: { userId: string; role: string }) => `${m.userId}:${m.role}`;
  const wantedKeys = new Set(wanted.map(key));
  const existingKeys = new Set(existing.map(key));

  const toRemove = existing.filter((m) => !wantedKeys.has(key(m))).map((m) => m.id);
  const toAdd = wanted.filter((m) => !existingKeys.has(key(m)));

  if (toRemove.length) await prisma.clientMember.deleteMany({ where: { id: { in: toRemove } } });
  if (toAdd.length) await prisma.clientMember.createMany({ data: toAdd.map((m) => ({ clientId: id, userId: m.userId, role: m.role })) });

  return NextResponse.json({ ok: true, added: toAdd.length, removed: toRemove.length });
}
