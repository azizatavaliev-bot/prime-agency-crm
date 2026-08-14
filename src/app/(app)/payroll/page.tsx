import Link from "next/link";
import { redirect } from "next/navigation";
import {
  HandCoins,
  Plus,
  Trash2,
  Undo2,
  CheckCircle2,
  Info,
  Percent,
  Wallet,
  Gift,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { payrollFor } from "@/lib/payroll";
import { payPayroll, cancelPayout, deleteBonus } from "@/lib/actions";
import { ROLES, PROJECT_ROLE } from "@/lib/constants";
import { som, monthKey, monthLabel, dateRu } from "@/lib/format";
import { PageHeader, Stat, Badge, Avatar, Empty } from "@/components/ui";
import FormModal from "@/components/FormModal";
import BonusForm from "@/components/BonusForm";
import PayoutForm from "@/components/PayoutForm";

export const dynamic = "force-dynamic";

const ERROR_TEXT: Record<string, string> = {
  paid: "Месяц уже выплачен — сначала отмените выплату",
  zero: "Нечего выплачивать: сумма ноль",
  nobody: "Сотрудник не найден в ведомости",
};

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; error?: string }>;
}) {
  const user = await requireUser();
  // Ведомость — это чужие зарплаты, поэтому только владелец.
  if (user.role !== "OWNER") redirect("/no-access");

  const sp = await searchParams;
  const month = sp.month || monthKey();

  const [lines, clients, accounts, users, payouts] = await Promise.all([
    payrollFor(month),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.account.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { active: true, role: { not: "OWNER" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.payout.findMany({ where: { month } }),
  ]);

  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(monthKey(d));
  }

  const payoutIdByUser = new Map(payouts.map((p) => [p.userId, p.id]));

  const totalDue = lines.filter((l) => !l.paid).reduce((s, l) => s + l.total, 0);
  const totalPaid = lines.filter((l) => l.paid).reduce((s, l) => s + l.total, 0);
  const totalBonus = lines.reduce((s, l) => s + l.bonusTotal, 0);
  const totalBase = lines.reduce((s, l) => s + l.base, 0);

  return (
    <div>
      <PageHeader
        title="Зарплаты"
        subtitle="Оклад + доли со всех проектов + премии. Ставки берутся те, что действовали в этом месяце"
        right={
          <Link href="/settings/rules" className="btn-ghost">
            <Sparkles size={15} /> Правила премий
          </Link>
        }
      />

      {sp.error && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {ERROR_TEXT[sp.error] ?? "Не получилось выполнить действие"}
        </div>
      )}

      <form className="mb-4 flex flex-wrap gap-2">
        <select className="input max-w-[200px]" name="month" defaultValue={month}>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        <button className="btn-ghost">Показать</button>
      </form>

      <div className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="К выплате" value={som(totalDue)} icon={HandCoins} tone={totalDue > 0 ? "warn" : "good"} />
        <Stat label="Уже выплачено" value={som(totalPaid)} icon={CheckCircle2} tone="good" />
        <Stat label="Окладов" value={som(totalBase)} icon={Wallet} />
        <Stat label="Премий" value={som(totalBonus)} icon={Gift} />
      </div>

      <div className="mb-4 flex gap-2 rounded-2xl bg-subtle p-3 text-xs text-muted">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>
          Процент считается с оплаченных счетов клиента за этот месяц: пока клиент не заплатил, доли
          нет. Кнопка «Выплатить» создаёт расход категории «Выплаты команде» и закрывает месяц —
          после этого суммы уже не пересчитываются, даже если поменять ставки.
        </span>
      </div>

      {lines.length === 0 && <Empty text="Сотрудников нет — добавьте команду в разделе «Команда»" />}

      <div className="space-y-3">
        {lines.map((l) => (
          <div key={l.userId} className={`card p-4 ${l.paid ? "opacity-80" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={l.name} size={40} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{l.name}</span>
                    {l.paid ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                        выплачено {dateRu(l.paid.at)}
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                        к выплате
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted">{ROLES[l.role as keyof typeof ROLES]}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="text-right">
                  <div className="text-[11px] text-muted">итого</div>
                  <div className="text-lg font-semibold tracking-tight">{som(l.total)}</div>
                </div>
                {l.paid ? (
                  <form action={cancelPayout}>
                    <input type="hidden" name="id" value={payoutIdByUser.get(l.userId) ?? ""} />
                    <button
                      className="btn-ghost !px-3 !py-1.5 !text-xs"
                      title="Удалить выплату и созданный расход"
                    >
                      <Undo2 size={13} /> Отменить
                    </button>
                  </form>
                ) : (
                  <FormModal
                    label="Выплатить"
                    title={`Выплата ${l.name} за ${monthLabel(month)}`}
                    icon={<HandCoins size={15} />}
                    hint="Сумма пересчитывается на сервере по ведомости. Создастся расход категории «Выплаты команде»."
                  >
                    <PayoutForm
                      userId={l.userId}
                      month={month}
                      total={l.total}
                      base={l.base}
                      projectShare={l.projectShare}
                      bonus={l.bonusTotal}
                      accounts={accounts}
                    />
                  </FormModal>
                )}
              </div>
            </div>

            {/* Разбор суммы: из чего она сложилась */}
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-subtle px-3 py-2">
                <div className="text-[11px] text-muted">Оклад</div>
                <div className="text-sm font-medium">{som(l.base)}</div>
              </div>
              <div className="rounded-xl bg-subtle px-3 py-2">
                <div className="text-[11px] text-muted">Доли с проектов</div>
                <div className="text-sm font-medium">{som(l.projectShare)}</div>
              </div>
              <div className="rounded-xl bg-subtle px-3 py-2">
                <div className="text-[11px] text-muted">Премии</div>
                <div className="text-sm font-medium">{som(l.bonusTotal)}</div>
              </div>
            </div>

            {l.projects.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                      <th className="py-1 font-medium">Проект</th>
                      <th className="py-1 font-medium">Роль</th>
                      <th className="py-1 font-medium">Ставка</th>
                      <th className="py-1 font-medium">Оплачено клиентом</th>
                      <th className="py-1 text-right font-medium">Начислено</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {l.projects.map((p) => (
                      <tr key={`${p.clientId}-${p.role}`}>
                        <td className="py-1.5">
                          <Link href={`/clients/${p.clientId}`} className="hover:underline">
                            {p.clientName}
                          </Link>
                        </td>
                        <td className="py-1.5 text-muted">
                          {PROJECT_ROLE[p.role as keyof typeof PROJECT_ROLE] ?? p.role}
                        </td>
                        <td className="py-1.5">
                          <span className="inline-flex items-center gap-1">
                            {p.rateType === "PERCENT" ? <Percent size={11} /> : <Wallet size={11} />}
                            {p.rateType === "PERCENT" ? `${p.rate}%` : som(p.rate)}
                          </span>
                          {p.rateSource === "defaults" && (
                            <span className="ml-1 text-[10px] text-muted">общая</span>
                          )}
                        </td>
                        <td className="py-1.5 text-muted">{som(p.paidBase)}</td>
                        <td className="py-1.5 text-right font-medium">{som(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
              <div className="flex min-w-0 flex-wrap gap-1.5">
                {l.bonuses.length === 0 && <span className="text-xs text-muted">Премий нет</span>}
                {l.bonuses.map((b, i) => (
                  <span
                    key={b.id ?? `auto-${i}`}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] ${
                      b.auto
                        ? "border-sky-200 bg-sky-50 text-sky-700"
                        : "border-zinc-200 bg-white text-zinc-700"
                    }`}
                    title={b.auto ? "Начислено правилом" : "Начислено вручную"}
                  >
                    {b.auto ? <Sparkles size={10} /> : <Gift size={10} />}
                    {som(b.amount)} · {b.reason}
                    {!b.auto && !l.paid && (
                      <form action={deleteBonus} className="contents">
                        <input type="hidden" name="id" value={b.id ?? ""} />
                        <button className="text-zinc-400 hover:text-red-600" title="Удалить премию">
                          <Trash2 size={10} />
                        </button>
                      </form>
                    )}
                  </span>
                ))}
              </div>
              {!l.paid && (
                <FormModal
                  label="Премия"
                  title={`Премия ${l.name}`}
                  variant="ghost"
                  icon={<Plus size={14} />}
                  hint="Разовое начисление за месяц. Попадёт в итог ведомости и в выплату."
                >
                  <BonusForm userId={l.userId} month={month} clients={clients} users={users} />
                </FormModal>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-xs text-muted">
        <Link href="/finance?tab=expenses&category=SALARY" className="inline-flex items-center gap-1 hover:underline">
          <ExternalLink size={12} /> Все выплаты команде в «Финансах»
        </Link>
      </div>
    </div>
  );
}
