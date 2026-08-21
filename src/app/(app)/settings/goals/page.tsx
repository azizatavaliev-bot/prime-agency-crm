import Link from "next/link";
import { Plus, Target, Trash2, Pencil, Info, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deleteGoal } from "@/lib/actions";
import { GOAL_METRIC } from "@/lib/constants";
import { som, num, monthKey, monthLabel } from "@/lib/format";
import { Section, Table, Badge, Empty } from "@/components/ui";
import FormModal from "@/components/FormModal";
import GoalForm from "@/components/GoalForm";

export const dynamic = "force-dynamic";

const MONEY = ["REVENUE", "PROFIT", "CPL"];

export default async function GoalsSettingsPage() {
  const [goals, clients] = await Promise.all([
    prisma.goal.findMany({
      include: { client: { select: { id: true, name: true } } },
      orderBy: [{ month: "desc" }, { metric: "asc" }],
    }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const mk = monthKey();
  // Планировать вперёд важнее, чем назад: даём три будущих месяца и год назад.
  const months: string[] = [];
  for (let i = 3; i >= -12; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    months.push(monthKey(d));
  }

  return (
    <div>
      <Section
        title="Цели на месяц"
        icon={Target}
        right={
          <FormModal
            label="Поставить цель"
            title="Цель на месяц"
            icon={<Plus size={16} />}
            hint="Цель без клиента — план всего агентства, он виден на дашборде. С клиентом — план по конкретному проекту."
          >
            <GoalForm clients={clients} months={months} defaultMonth={mk} />
          </FormModal>
        }
      >
        {goals.length === 0 ? (
          <Empty text="Целей нет — поставьте план по выручке или заявкам" />
        ) : (
          <Table head={["Месяц", "На кого", "Показатель", "План", "За счёт чего", ""]}>
            {goals.map((g) => (
              <tr key={g.id}>
                <td className="td whitespace-nowrap">
                  {monthLabel(g.month)}
                  {g.month === mk && (
                    <Badge className="ml-2 bg-emerald-100 text-emerald-700 border-emerald-200">
                      текущий
                    </Badge>
                  )}
                </td>
                <td className="td">
                  {g.client ? (
                    <Link href={`/clients/${g.client.id}`} className="hover:underline">
                      {g.client.name}
                    </Link>
                  ) : (
                    "Агентство"
                  )}
                </td>
                <td className="td">{GOAL_METRIC[g.metric as keyof typeof GOAL_METRIC] ?? g.metric}</td>
                <td className="td font-medium whitespace-nowrap">
                  {MONEY.includes(g.metric) ? som(g.target) : num(g.target)}
                </td>
                <td className="td text-muted">{g.comment || "—"}</td>
                <td className="td">
                  <div className="flex items-center gap-1.5">
                    <FormModal
                      label="Изменить"
                      title="Цель на месяц"
                      variant="ghost"
                      icon={<Pencil size={13} />}
                    >
                      <GoalForm goal={g} clients={clients} months={months} defaultMonth={mk} />
                    </FormModal>
                    <form action={deleteGoal}>
                      <input type="hidden" name="id" value={g.id} />
                      <button
                        className="btn-ghost !px-2.5 !py-1.5 !text-xs hover:!text-red-600"
                        title="Удалить цель"
                      >
                        <Trash2 size={13} />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}

        <div className="mt-3 flex gap-2 rounded-2xl bg-subtle p-3 text-xs text-muted">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            Здесь цели ставятся и правятся, выполнение считается в «Аналитике». Цель по выручке
            агентства ещё используется правилом премии «Выполнен план по выручке».
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/finance?tab=analytics" className="btn-ghost">
            <ExternalLink size={15} /> Выполнение целей в «Аналитике»
          </Link>
          <Link href="/settings/rules" className="btn-ghost">
            <ExternalLink size={15} /> Правила премий
          </Link>
        </div>
      </Section>
    </div>
  );
}
