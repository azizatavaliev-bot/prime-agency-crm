import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bridgeAuthorized, UNAUTHORIZED } from "../auth";

/** Клиенты агентства = «проекты Агентство» на стороне Unity Tasks. */
export async function GET(req: Request) {
  if (!bridgeAuthorized(req)) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const clients = await prisma.client.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      niche: true,
      status: true,
      avgCheck: true,
      services: true,
      adAccount: true,
      nextPaymentAt: true,
      targetCpl: true,
      goal: true,
      targetolog: { select: { id: true, name: true } },
      account: { select: { id: true, name: true } },
      _count: { select: { tasks: true, reports: true } },
    },
  });

  return NextResponse.json({
    projects: clients.map((c) => ({
      id: c.id,
      name: c.name,
      niche: c.niche,
      status: c.status,
      avgCheck: c.avgCheck,
      services: c.services ? c.services.split(",").filter(Boolean) : [],
      adAccount: c.adAccount,
      nextPaymentAt: c.nextPaymentAt,
      targetCpl: c.targetCpl,
      goal: c.goal,
      targetolog: c.targetolog,
      account: c.account,
      tasksCount: c._count.tasks,
      reportsCount: c._count.reports,
    })),
  });
}
