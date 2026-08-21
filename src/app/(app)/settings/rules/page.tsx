import Link from "next/link";
import { Plus, Sparkles, Trash2, Info, Power, ExternalLink, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deleteBonusRule, toggleBonusRule } from "@/lib/actions";
import {
  BONUS_METRIC,
  BONUS_METRIC_HINT,
  BONUS_AMOUNT_TYPE,
  ROLES,
} from "@/lib/constants";
import { som } from "@/lib/format";
import { Section, Badge, Empty } from "@/components/ui";
import FormModal from "@/components/FormModal";
import BonusRuleForm from "@/components/BonusRuleForm";

export const dynamic = "force-dynamic";

/** Порог осмысленен не для всех метрик — где не нужен, не показываем. */
const USES_THRESHOLD: Record<string, boolean> = {
  CPL_TARGET: true,
  TASKS_ONTIME: true,
  REVENUE_PLAN: false,
  CLIENT_RETAINED: false,
};

export default async function BonusRulesPage() {
  const rules = await prisma.bonusRule.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] });

  return (
    <div>
      <Section
        title="Правила премий"
        icon={Sparkles}
        right={
          <FormModal
            label="Добавить правило"
            title="Новое правило премии"
            icon={<Plus size={16} />}
            hint="Правило считается на лету по данным месяца и попадает в ведомость. Сумма фиксируется в момент выплаты."
          >
            <BonusRuleForm />
          </FormModal>
        }
      >
        {rules.length === 0 ? (
          <Empty text="Правил нет — премии можно начислять вручную в ведомости" />
        ) : (
          <div className="space-y-2">
            {rules.map((r) => (
              <div key={r.id} className={`card p-4 ${r.active ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.name}</span>
                      {r.active ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          включено
                        </Badge>
                      ) : (
                        <Badge>выключено</Badge>
                      )}
                      <Badge className="bg-sky-100 text-sky-700 border-sky-200">
                        {r.amountType === "PERCENT" ? `${r.amount}% от доли` : som(r.amount)}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted">
                      {BONUS_METRIC[r.metric as keyof typeof BONUS_METRIC] ?? r.metric}
                      {USES_THRESHOLD[r.metric] && ` · порог ${r.threshold}`}
                      {r.role ? ` · только ${ROLES[r.role as keyof typeof ROLES]}` : " · всем"}
                      {r.perClient ? " · за каждый проект" : " · один раз за месяц"}
                    </div>
                    {r.hint && <div className="mt-1 text-xs text-muted">{r.hint}</div>}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <FormModal
                      label="Изменить"
                      title={`Правило: ${r.name}`}
                      variant="ghost"
                      icon={<Pencil size={14} />}
                    >
                      <BonusRuleForm rule={r} />
                    </FormModal>
                    <form action={toggleBonusRule}>
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        className="btn-ghost !px-2.5 !py-1.5 !text-xs"
                        title={r.active ? "Выключить" : "Включить"}
                      >
                        <Power size={13} />
                      </button>
                    </form>
                    <form action={deleteBonusRule}>
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        className="btn-ghost !px-2.5 !py-1.5 !text-xs hover:!text-red-600"
                        title="Удалить правило"
                      >
                        <Trash2 size={13} />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-2 rounded-2xl bg-subtle p-3 text-xs text-muted">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            Правила не меняют уже выплаченные месяцы: при выплате сумма записывается снимком.
            Начисленное правилом видно в ведомости голубой плашкой, начисленное вручную — серой.
          </span>
        </div>
      </Section>

      <Section title="Как считается каждая метрика" icon={Info}>
        <div className="card divide-y divide-zinc-100 p-0">
          {Object.entries(BONUS_METRIC).map(([key, label]) => (
            <div key={key} className="p-4">
              <div className="text-sm font-medium">{label}</div>
              <div className="mt-1 text-xs text-muted">{BONUS_METRIC_HINT[key]}</div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Link href="/team?tab=payroll" className="btn-ghost">
            <ExternalLink size={15} /> Открыть ведомость зарплат
          </Link>
        </div>
      </Section>
    </div>
  );
}
