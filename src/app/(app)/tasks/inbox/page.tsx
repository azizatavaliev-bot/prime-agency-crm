import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, clientScope } from "@/lib/access";
import { PageHeader } from "@/components/ui";
import TaskInboxClient from "@/components/TaskInboxClient";

export const dynamic = "force-dynamic";

export default async function TaskInboxPage() {
  const user = await requireUser();
  if (!can.manageTaskInbox(user)) redirect("/no-access");

  const [pending, clients, users] = await Promise.all([
    prisma.taskCandidate.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" } }),
    prisma.client.findMany({ where: clientScope(user), select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="ИИ-инбокс задач"
        subtitle="Вставьте транскрипт планёрки или лог чата — ИИ предложит задачи, вы подтверждаете перед созданием"
      />
      <TaskInboxClient
        candidates={pending.map((c) => ({
          id: c.id,
          source: c.source,
          title: c.title,
          comment: c.comment,
          clientId: c.clientId,
          assigneeId: c.assigneeId,
          dueAt: c.dueAt ? c.dueAt.toISOString() : null,
          priority: c.priority,
          rawText: c.rawText,
        }))}
        clients={clients}
        users={users}
      />
    </div>
  );
}
