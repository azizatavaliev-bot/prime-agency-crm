import { FileText, Plus, Pencil, Trash2, Users2, ListChecks, Info } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteRegulation } from "@/lib/actions";
import { PageHeader, Stat, Empty, Avatar } from "@/components/ui";
import FormModal from "@/components/FormModal";
import RegulationForm from "@/components/RegulationForm";

export const dynamic = "force-dynamic";

/** Пункты хранятся плоским списком; строка с «#» открывает новый блок. */
function toBlocks(items: string[]) {
  const blocks: { title: string | null; points: string[] }[] = [];
  let current: { title: string | null; points: string[] } = { title: null, points: [] };
  for (const raw of items) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      if (current.title || current.points.length) blocks.push(current);
      current = { title: line.replace(/^#+\s*/, ""), points: [] };
    } else {
      current.points.push(line);
    }
  }
  if (current.title || current.points.length) blocks.push(current);
  return blocks;
}

export default async function RegulationsPage() {
  const user = await requireUser();
  const isOwner = user.role === "SUPER_ADMIN";

  // Сотрудник видит только свои зоны — чужие обязанности ему не нужны.
  const all = await prisma.regulation.findMany({
    where: { active: true },
    include: { owner: { select: { id: true, name: true } } },
    orderBy: [{ order: "asc" }, { title: "asc" }],
  });
  const regs = isOwner
    ? all
    : all.filter((r) => r.ownerId === user.id || r.assignees.split(",").includes(user.id));

  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  const parsed = regs.map((r) => {
    let items: string[] = [];
    try {
      items = JSON.parse(r.items) as string[];
    } catch {
      items = [];
    }
    const blocks = toBlocks(items);
    return {
      ...r,
      blocks,
      pointCount: blocks.reduce((s, b) => s + b.points.length, 0),
      helpers: r.assignees.split(",").filter(Boolean),
      itemsText: items.join("\n"),
    };
  });

  const totalPoints = parsed.reduce((s, r) => s + r.pointCount, 0);
  const covered = new Set(parsed.flatMap((r) => [r.ownerId, ...r.helpers].filter(Boolean)));

  return (
    <div>
      <PageHeader
        title="Регламенты"
        subtitle="Зоны ответственности: кто что ведёт и что делает регулярно"
        right={
          isOwner && (
            <FormModal
              label="Новый регламент"
              title="Новый регламент"
              icon={<Plus size={16} />}
              hint="Опишите зону ответственности сотрудника: что он делает ежедневно, еженедельно, ежемесячно."
            >
              <RegulationForm users={users} />
            </FormModal>
          )
        }
      />

      <div className="mb-5 grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Stat label="Регламентов" value={String(parsed.length)} icon={FileText} />
        <Stat label="Пунктов всего" value={String(totalPoints)} icon={ListChecks} />
        <Stat label="Сотрудников охвачено" value={String(covered.size)} icon={Users2} />
      </div>

      {!isOwner && (
        <div className="mb-4 flex gap-2 rounded-2xl bg-subtle p-3 text-xs text-muted">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>Здесь показаны только те зоны, за которые отвечаете вы.</span>
        </div>
      )}

      {parsed.length === 0 ? (
        <Empty text={isOwner ? "Регламентов пока нет — создайте первый" : "За вами пока не закреплены зоны"} />
      ) : (
        <div className="space-y-4">
          {parsed.map((r) => (
            <div key={r.id} className="card relative overflow-hidden p-5 pl-6">
              <span className="absolute left-0 top-0 h-full w-1.5" style={{ background: r.color }} />

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-semibold">{r.title}</div>
                  {r.description && <div className="mt-0.5 text-sm text-muted">{r.description}</div>}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="rounded-lg bg-subtle px-2 py-0.5">{r.pointCount} пунктов</span>
                    <span className="rounded-lg bg-subtle px-2 py-0.5">{r.blocks.length} блоков</span>
                  </div>
                </div>

                {isOwner && (
                  <div className="flex gap-2">
                    <FormModal label="Изменить" title={r.title} variant="ghost" icon={<Pencil size={15} />}>
                      <RegulationForm
                        users={users}
                        reg={{
                          id: r.id,
                          title: r.title,
                          description: r.description,
                          color: r.color,
                          itemsText: r.itemsText,
                          notes: r.notes,
                          ownerId: r.ownerId,
                          assignees: r.helpers,
                        }}
                      />
                    </FormModal>
                    <form action={deleteRegulation}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn-ghost text-red-600">
                        <Trash2 size={15} />
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Кто отвечает */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {r.owner && (
                  <span className="flex items-center gap-1.5 rounded-xl border border-zinc-200 py-1 pl-1 pr-2.5">
                    <Avatar name={r.owner.name} size={22} />
                    <span className="text-xs font-medium">{r.owner.name}</span>
                  </span>
                )}
                {r.helpers
                  .filter((id) => id !== r.ownerId)
                  .map((id) => (
                    <span
                      key={id}
                      className="flex items-center gap-1.5 rounded-xl border border-zinc-200 py-1 pl-1 pr-2.5"
                    >
                      <Avatar name={nameById.get(id) ?? "?"} size={22} />
                      <span className="text-xs text-muted">{nameById.get(id) ?? "—"}</span>
                    </span>
                  ))}
                {!r.owner && r.helpers.length === 0 && (
                  <span className="text-xs text-muted">Ответственный не назначен</span>
                )}
              </div>

              {r.blocks.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {r.blocks.map((b, bi) => (
                    <div key={bi} className="rounded-2xl border border-zinc-200 p-3">
                      {b.title && (
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                          {b.title}
                        </div>
                      )}
                      <ol className="space-y-1.5">
                        {b.points.map((p, pi) => (
                          <li key={pi} className="flex gap-2 text-sm">
                            <span
                              className="mt-0.5 shrink-0 text-[11px] font-semibold tabular-nums"
                              style={{ color: r.color }}
                            >
                              {String(pi + 1).padStart(2, "0")}
                            </span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              )}

              {r.notes && (
                <div className="mt-3 rounded-xl bg-subtle p-3 text-xs text-muted">{r.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
