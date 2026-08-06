import {
  Wallet,
  TrendingUp,
  Percent,
  CheckCircle2,
  FileSignature,
  CreditCard,
  CalendarDays,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import { som, dateRu, daysUntil } from "@/lib/format";
import { paymentChip } from "@/lib/payday";

/** Крупная плитка показателя — как шапка карточки клиента в FADAMOS. */
function BigStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  corner,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "good" | "warn" | "bad";
  corner?: string;
}) {
  const tones = {
    default: "accent-soft accent-text",
    good: "bg-emerald-100 text-emerald-600",
    warn: "bg-amber-100 text-amber-600",
    bad: "bg-red-100 text-red-600",
  };
  const valueTone = {
    default: "",
    good: "text-emerald-600",
    warn: "text-amber-600",
    bad: "text-red-600",
  };
  return (
    <div className="card card-hover relative p-4">
      {corner && <span className="absolute right-3 top-3 text-[11px] text-muted">{corner}</span>}
      <div className={`stat-icon ${tones[tone]}`}>
        <Icon size={17} strokeWidth={1.9} />
      </div>
      <div className={`mt-3 text-2xl font-semibold tracking-tight ${valueTone[tone]}`}>{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
      {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
    </div>
  );
}

/** Небольшая карточка-факт: дата договора, день оплаты и т.д. */
function FactCard({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
  icon: LucideIcon;
}) {
  const hintTone = {
    default: "text-muted",
    good: "text-emerald-600",
    warn: "text-amber-600",
    bad: "text-red-600",
  };
  return (
    <div className="rounded-2xl border border-zinc-200 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
        <Icon size={12} /> {label}
      </div>
      <div className="mt-1.5 text-sm font-semibold">{value}</div>
      {hint && <div className={`mt-0.5 text-[11px] ${hintTone[tone]}`}>{hint}</div>}
    </div>
  );
}

export type ClientOverviewData = {
  avgCheck: number;
  paidTotal: number;
  ownerNet: number;
  profitPercent: number | null;
  openTasks: number;
  totalTasks: number;
  contractStart: Date | null;
  firstPaymentAt: Date | null;
  paymentDay: number | null;
  nextPaymentAt: Date | null;
};

/**
 * Шапка карточки клиента: сколько принёс, сколько заработали, когда платит.
 * Показывается и в модалке, и на отдельной странице клиента.
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

  const nextHint =
    nextIn === null
      ? undefined
      : nextIn < 0
        ? `просрочено ${-nextIn} дн.`
        : nextIn === 0
          ? "сегодня!"
          : nextIn === 1
            ? "завтра!"
            : `через ${nextIn} дн.`;
  const nextTone = nextIn === null ? "default" : nextIn < 0 ? "bad" : nextIn <= 1 ? "warn" : "default";

  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {showMoney && (
          <BigStat label="Всего принёс" value={som(data.paidTotal)} icon={Wallet} tone="default" />
        )}
        {showProfit && (
          <BigStat
            label="Чистая прибыль"
            value={som(data.ownerNet)}
            icon={TrendingUp}
            tone={data.ownerNet > 0 ? "good" : "default"}
          />
        )}
        {data.profitPercent !== null && (
          <BigStat
            label="Наш % от прибыли"
            value={`${data.profitPercent}%`}
            icon={Percent}
            corner="доп. к абонплате"
          />
        )}
        <BigStat
          label="Активных задач"
          value={String(data.openTasks)}
          corner={`${data.openTasks}/${data.totalTasks}`}
          icon={CheckCircle2}
          tone={data.openTasks ? "default" : "good"}
        />
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <FactCard
          label="Подписан"
          icon={FileSignature}
          value={data.contractStart ? dateRu(data.contractStart) : "— нет"}
          hint={
            data.contractStart
              ? `${Math.abs(daysUntil(data.contractStart) ?? 0)} дней назад`
              : "договор не заведён"
          }
        />
        <FactCard
          label="Первая оплата"
          icon={CreditCard}
          value={data.firstPaymentAt ? dateRu(data.firstPaymentAt) : "— нет"}
          hint={data.firstPaymentAt ? undefined : "ожидается"}
          tone={data.firstPaymentAt ? "default" : "warn"}
        />
        <FactCard
          label="Ежемесячный платёж"
          icon={Wallet}
          value={som(data.avgCheck)}
          hint={data.profitPercent ? `+ ${data.profitPercent}% от прибыли` : undefined}
        />
        <FactCard
          label="День оплаты"
          icon={CalendarDays}
          value={data.paymentDay ? `${data.paymentDay} числа` : "не задан"}
          hint={payIn?.label}
          tone={payIn?.tone ?? "default"}
        />
        <FactCard
          label="След. платёж"
          icon={CalendarClock}
          value={data.nextPaymentAt ? dateRu(data.nextPaymentAt) : "—"}
          hint={nextHint}
          tone={nextTone}
        />
      </div>
    </div>
  );
}
