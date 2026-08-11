import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClientTask } from "@/lib/actions";
import { dateRu } from "@/lib/format";
import { PageHeader, Section, Empty } from "@/components/ui";
import { ListTodo, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortalTasksPage() {
  const session = await requireClient();

  const [client, tasks] = await Promise.all([
    prisma.client.findUnique({ where: { id: session.clientId }, select: { targetolog: { select: { name: true } } } }),
    prisma.task.findMany({
      where: { clientId: session.clientId },
      include: { assignee: true },
      orderBy: [{ done: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div>
      <PageHeader
        title="Задачи"
        subtitle={
          client?.targetolog
            ? `Ставятся на таргетолога проекта — ${client.targetolog.name}`
            : "Ставятся на таргетолога, назначенного на проект"
        }
      />

      <Section title="Новая задача" icon={Plus}>
        <form action={createClientTask} className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="label">Что нужно сделать</label>
            <input className="input" name="title" required placeholder="например, обновить баннер к акции" />
          </div>
          <div>
            <label className="label">Срок (необязательно)</label>
            <input className="input" name="dueAt" type="date" />
          </div>
          <div className="sm:col-span-3">
            <button className="btn-primary">Поставить задачу</button>
          </div>
        </form>
      </Section>

      <Section title="Открытые" icon={ListTodo}>
        <div className="space-y-2">
          {open.map((t) => (
            <div key={t.id} className="card p-4">
              <div className="text-sm font-medium">{t.title}</div>
              <div className="mt-1 text-xs text-zinc-500">
                {t.assignee?.name ?? "исполнитель не назначен"}
                {t.dueAt ? ` · срок ${dateRu(t.dueAt)}` : ""}
              </div>
            </div>
          ))}
          {open.length === 0 && <Empty text="Открытых задач нет" />}
        </div>
      </Section>

      {done.length > 0 && (
        <Section title="Выполненные" icon={ListTodo}>
          <div className="space-y-2">
            {done.map((t) => (
              <div key={t.id} className="card p-4 opacity-60">
                <div className="text-sm font-medium line-through">{t.title}</div>
                <div className="mt-1 text-xs text-zinc-500">{t.assignee?.name ?? "—"}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
