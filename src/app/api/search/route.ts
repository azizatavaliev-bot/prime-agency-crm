import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientScope, taskScope } from "@/lib/access";

export type SearchResult = {
  kind: "client" | "task" | "employee";
  id: string;
  title: string;
  subtitle: string;
  link: string;
};

/** Живой поиск по клиентам, задачам и сотрудникам — как глобальный поиск в FADAMOS. */
export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ results: [] }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const [clients, tasks, employees] = await Promise.all([
    prisma.client.findMany({
      where: { AND: [clientScope(user), { name: { contains: q } }] },
      select: { id: true, name: true, niche: true, status: true },
      take: 5,
    }),
    prisma.task.findMany({
      where: { AND: [taskScope(user), { title: { contains: q } }] },
      select: { id: true, title: true, board: true, client: { select: { name: true } } },
      take: 5,
    }),
    user.role === "OWNER"
      ? prisma.user.findMany({
          where: { name: { contains: q } },
          select: { id: true, name: true, email: true },
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  const results: SearchResult[] = [
    ...clients.map((c) => ({
      kind: "client" as const,
      id: c.id,
      title: c.name,
      subtitle: [c.niche, c.status].filter(Boolean).join(" · ") || "клиент",
      link: `/clients/${c.id}`,
    })),
    ...tasks.map((t) => ({
      kind: "task" as const,
      id: t.id,
      title: t.title,
      subtitle: t.client ? `задача · ${t.client.name}` : "задача",
      link: `/tasks?board=${t.board}`,
    })),
    ...employees.map((e) => ({
      kind: "employee" as const,
      id: e.id,
      title: e.name,
      subtitle: e.email,
      link: `/settings/team`,
    })),
  ];

  return NextResponse.json({ results });
}
