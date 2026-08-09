import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bridgeAuthorized, UNAUTHORIZED } from "../auth";

/** Сотрудники агентства — чтобы в Unity Tasks выбирать ответственного по проекту. */
export async function GET(req: Request) {
  if (!bridgeAuthorized(req)) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });
  return NextResponse.json({ team: users });
}
