import {
  Wallet,
  TrendingUp,
  Percent,
  CheckCircle2,
  FileSignature,
  CreditCard,
  CalendarDays,
  CalendarClock,
  AlertTriangle,
  Target,
} from "lucide-react";
import { som, dateRu, daysUntil, num } from "@/lib/format";
import { paymentChip } from "@/lib/payday";
import { HeroStat, CompactStat } from "./ui";

export type ClientOverviewData = {
  avgCheck: number;
  paidTotal: number;
  ownerNet: number;
  profitPercent: number | null;
  openTasks: number;
  totalTasks: number;
  overdueTasks: number;
  contractStart: Date | null;
  contractEnd: Date | null;
  firstPaymentAt: Date | null;
  paymentDay: number | null;
  nextPaymentAt: Date | null;
  debt: number;
  pendingCount: number;
  cpl: number | null;
  targetCpl: number | null;
  lastReportAt: Date | null;
  adAccount: string | null;
};

/**
 * Шапка карточки клиента.
 *
 * Сверху — что требует действия: раньше эти сигналы были размазаны по бейджам
 * и плиткам, и собирать их приходилось глазами. Дальше три главных числа тем же
 * языком, что на дашборде, и лента фактов помельче.
 */
export default function ClientOverview({
  data,
  showMoney,
  showProfit,
}: {
  data: ClientOverviewData;
  showMoney: boolean;
  showProfit: boolean;
}) {
  const payIn = paymentChip(data.paymentDay);
  const nextIn = daysUntil(data.nextPaymentAt);
  const daysSinceReport =
    data.lastReportAt === null ? null : Math.floor((Date.now() - data.lastReportAt.getTime()) / 86400000);
  const contractLeft = daysUntil(data.contractEnd);

  const nextHint =
    nextIn === null
      ? "дата не задана"
      : nextIn < 0
        ? `просрочено ${-nextIn} дн.`
        : nextIn === 0
          ? "сегодня"
          : nextIn === 1
            ? "завтра"
            : `через ${nextIn} дн.`;

  // Что требует действия прямо сейчас
  const risks: string[] = [];
  if (showMoney && data.debt > 0)
    risks.push(`долг ${som(data.debt)} · ${data.pendingCount} платежей не закрыто`);
  if (nextIn !== null && nextIn < 0) risks.push(`платёж просрочен на ${-nextIn} дн.`);
  if (data.overdueTasks > 0) risks.push(`просрочено задач: ${data.overdueTasks}`);
  if (data.cpl !== null && data.targetCpl && data.cpl > data.targetCpl)
    risks.push(`заявка дороже цели: ${num(data.cpl)} против ${num(data.targetCpl)} сом`);
  if (daysSinceReport === null) risks.push("отчётов по рекламе ещё не было");
  else if (daysSinceReport > 10) risks.push(`отчёта нет ${daysSinceReport} дн.`);
  if (contractLeft !== null && contractLeft < 0) risks.push("договор истёк");
  else if (contractLeft !== null && contractLeft <= 30) risks.push(`договор кончается через ${contractLeft} дн.`);

  return (
    <div className="space-y-3">
      {risks.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
            <AlertTriangle size={15} /> Требует внимания
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {risks.map((r) => (
              <span
                key={r}
                className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-[11px] text-amber-800"
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
          <CheckCircle2 size={15} /> По проекту всё в порядке: долгов нет, отчёты свежие, сроки не горят
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        {showMoney && (
          <HeroStat
            label="Всего принёс"
            value={som(data.paidTotal)}
            icon={Wallet}
            tone="good"
            hint={data.avgCheck ? `абонплата ${som(data.avgCheck)} в месяц` : "абонплата не задана"}
          />
        )}
        {showProfit && (
          <HeroStat
            label="Чистая прибыль с клиента"
            value={som(data.ownerNet)}
            icon={TrendingUp}
            tone={data.ownerNet > 0 ? "good" : "default"}
            progress={
              data.paidTotal > 0
                ? {
                    ratio: data.ownerNet / data.paidTotal,
                    caption: `${Math.round((data.ownerNet / data.paidTotal) * 100)}% от того, что клиент заплатил`,
                  }
                : undefined
            }
            hint={data.profitPercent ? `+ ${data.profitPercent}% от прибыли клиента` : undefined}
          />
        )}
        {showMoney && (
          <HeroStat
            label={data.debt > 0 ? "Долг клиента" : "Следующий платёж"}
            value={data.debt > 0 ? som(data.debt) : data.nextPaymentAt ? dateRu(data.nextPaymentAt) : "—"}
            icon={data.debt > 0 ? CreditCard : CalendarClock}
            tone={data.debt > 0 || (nextIn !== null && nextIn < 0) ? "bad" : nextIn !== null && nextIn <= 1 ? "warn" : "default"}
            hint={
              data.debt > 0
                ? `${data.pendingCount} платежей не закрыто · следующий ${data.nextPaymentAt ? dateRu(data.nextPaymentAt) : "не задан"}`
                : nextHint
            }
          />
        )}
      </div>

      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 xl:grid-cols-7">
        <CompactStat
          label="Абонплата"
          value={data.avgCheck ? som(data.avgCheck) : "не задан"}
          hint={data.profitPercent ? `+${data.profitPercent}% от прибыли` : undefined}
          icon={Wallet}
          tone={data.avgCheck ? "default" : "warn"}
        />
        <CompactStat
          label="День оплаты"
          value={data.paymentDay ? `${data.paymentDay} числа` : "не задан"}
          hint={payIn?.label}
          icon={CalendarDays}
          tone={data.paymentDay ? (payIn?.tone ?? "default") : "warn"}
        />
        <CompactStat
          label="Договор"
          value={data.contractStart ? dateRu(data.contractStart) : "нет"}
          hint={
            data.contractEnd
              ? `до ${dateRu(data.contractEnd)}`
              : data.contractStart
                ? "бессрочный"
                : "не заведён"
          }
          icon={FileSignature}
          tone={contractLeft !== null && contractLeft <= 30 ? "warn" : "default"}
        />
        <CompactStat
          label="Первая оплата"
          value={data.firstPaymentAt ? dateRu(data.firstPaymentAt) : "нет"}
          hint={data.firstPaymentAt ? undefined : "ещё не платил"}
          icon={CreditCard}
          tone={data.firstPaymentAt ? "default" : "warn"}
        />
        <CompactStat
          label="Цена заявки"
          value={data.cpl !== null ? `${num(data.cpl)} сом` : "—"}
          hint={data.targetCpl ? `цель ${num(data.targetCpl)}` : "цель не задана"}
          icon={Target}
          tone={
            data.cpl === null || !data.targetCpl ? "default" : data.cpl <= data.targetCpl ? "good" : "bad"
          }
        />
        <CompactStat
          label="Кабинет"
          value={data.adAccount || "не указан"}
          hint={data.adAccount ? undefined : "на кого оформлен"}
          icon={CreditCard}
          tone={data.adAccount ? "default" : "warn"}
        />
        <CompactStat
          label="Задачи"
          value={String(data.openTasks)}
          hint={data.overdueTasks ? `${data.overdueTasks} просрочено` : `всего ${data.totalTasks}`}
          icon={CheckCircle2}
          tone={data.overdueTasks ? "bad" : "default"}
        />
      </div>
    </div>
  );
}
