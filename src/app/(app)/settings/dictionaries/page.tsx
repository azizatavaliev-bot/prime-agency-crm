import { Users, Wallet, KanbanSquare, Info } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DICT_TYPES, DICT_HINT, type DictType } from "@/lib/dict";
import { Section } from "@/components/ui";
import DictBlock from "@/components/DictBlock";

export const dynamic = "force-dynamic";

const GROUPS: { title: string; icon: typeof Users; types: DictType[]; color?: DictType[] }[] = [
  {
    title: "Клиенты и проекты",
    icon: Users,
    types: ["CLIENT_STATUS", "SERVICE", "SOURCE", "NICHE"],
    color: ["CLIENT_STATUS"],
  },
  {
    title: "Деньги",
    icon: Wallet,
    types: ["PAYMENT_KIND", "PAYMENT_METHOD", "EXPENSE_CATEGORY", "INCOME_CATEGORY", "ACCOUNT_KIND"],
    color: ["EXPENSE_CATEGORY", "INCOME_CATEGORY"],
  },
  {
    title: "Доски задач",
    icon: KanbanSquare,
    types: ["STAGE_TARGET", "STAGE_DEV", "STAGE_VIDEO"],
  },
];

export default async function DictionariesPage() {
  const dictItems = await prisma.dictItem.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });
  const byType = (t: string) => dictItems.filter((i) => i.type === t);

  return (
    <div>
      <div className="mb-4 flex gap-2 rounded-2xl bg-subtle p-3 text-xs text-muted">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>
          Значения справочников подставляются во все формы системы. Порядок задаёт, как они идут в списках и колонках
          канбана. Встроенные значения не удаляются — только скрываются, чтобы не сломать уже сохранённые записи.
        </span>
      </div>

      {GROUPS.map((g) => (
        <Section key={g.title} title={g.title} icon={g.icon}>
          <div className="grid gap-4 lg:grid-cols-2">
            {g.types.map((t) => (
              <DictBlock
                key={t}
                type={t}
                title={DICT_TYPES[t]}
                hint={DICT_HINT[t]}
                items={byType(t)}
                withColor={g.color?.includes(t) ?? false}
              />
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}
