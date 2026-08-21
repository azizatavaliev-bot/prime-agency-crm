import { Send, Link2, Unlink, Info, HandCoins, KeyRound, Palette } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTgLinkCode, unlinkTelegram } from "@/lib/actions";
import { telegramEnabled } from "@/lib/telegram";
import { payrollFor } from "@/lib/payroll";
import { ROLES } from "@/lib/constants";
import { som, dateRu, monthKey, monthLabel } from "@/lib/format";
import { PageHeader, Field, Section } from "@/components/ui";
import ChangePassword from "@/components/ChangePassword";
import ThemeToggle from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; changed?: string }>;
}) {
  const sp = await searchParams;
  const session = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return null;
  const botName = process.env.TELEGRAM_BOT_USERNAME;
  const enabled = telegramEnabled();

  // Владелец видит всю ведомость в «Зарплатах», здесь — только своя строка.
  const mk = monthKey();
  const my =
    user.role === "SUPER_ADMIN" ? null : (await payrollFor(mk)).find((l) => l.userId === user.id) ?? null;

  async function genCode() {
    "use server";
    await createTgLinkCode();
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Профиль" subtitle="Ваши данные, пароль и подключение Telegram" />

      <div className="card p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Имя" value={user.name} />
          <Field label="Email" value={user.email} />
          <Field label="Роль" value={ROLES[user.role as keyof typeof ROLES]} />
          <Field
            label="Ставка"
            value={user.rate ? (user.rateType === "PERCENT" ? `${user.rate}%` : `${user.rate} сом`) : "—"}
          />
        </div>
      </div>

      {/* Свою зарплату человек должен видеть сам, не спрашивая владельца */}
      {my && (
        <Section title={`Моя зарплата за ${monthLabel(mk)}`} icon={HandCoins}>
          <div className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-muted">{my.paid ? "выплачено" : "начислено"}</div>
                <div className="text-2xl font-semibold tracking-tight">{som(my.total)}</div>
              </div>
              {my.paid && (
                <span className="badge bg-emerald-100 text-emerald-700 border-emerald-200">
                  выплачено {dateRu(my.paid.at)}
                </span>
              )}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-subtle px-3 py-2">
                <div className="text-[11px] text-muted">Оклад</div>
                <div className="text-sm font-medium">{som(my.base)}</div>
              </div>
              <div className="rounded-xl bg-subtle px-3 py-2">
                <div className="text-[11px] text-muted">Доли с проектов</div>
                <div className="text-sm font-medium">{som(my.projectShare)}</div>
              </div>
              <div className="rounded-xl bg-subtle px-3 py-2">
                <div className="text-[11px] text-muted">Премии</div>
                <div className="text-sm font-medium">{som(my.bonusTotal)}</div>
              </div>
            </div>

            {my.projects.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-zinc-100 pt-3 text-sm">
                {my.projects.map((p) => (
                  <div key={`${p.clientId}-${p.role}`} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-muted">
                      {p.clientName} · {p.rateType === "PERCENT" ? `${p.rate}%` : "фикс"}
                    </span>
                    <span className="font-medium">{som(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {my.bonuses.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-zinc-100 pt-3">
                {my.bonuses.map((b, i) => (
                  <span
                    key={b.id ?? `auto-${i}`}
                    className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px]"
                  >
                    {som(b.amount)} · {b.reason}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 text-xs text-muted">
              Процент считается с оплаченных счетов клиента за месяц: пока клиент не заплатил, доли
              нет.
            </div>
          </div>
        </Section>
      )}

      <Section title="Оформление" icon={Palette}>
        <div className="card p-4">
          <ThemeToggle />
        </div>
      </Section>

      <Section title="Пароль" icon={KeyRound}>
        <ChangePassword error={sp.error} changed={sp.changed === "1"} />
      </Section>

      <Section title="Telegram-напоминания" icon={Send}>
        <div className="card p-4">
          {!enabled && (
            <div className="mb-4 flex gap-2 rounded-2xl bg-subtle p-3 text-xs text-muted">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>
                Бот пока не подключён: нужен <code>TELEGRAM_BOT_TOKEN</code> в переменных окружения. Код привязки
                можно сгенерировать заранее.
              </span>
            </div>
          )}

          {user.tgChatId ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-medium text-emerald-600">Telegram подключён</div>
                <div className="text-muted">Напоминания об отчётах, задачах и оплатах приходят в бота</div>
              </div>
              <form action={unlinkTelegram}>
                <button className="btn-ghost text-red-600">
                  <Unlink size={15} /> Отключить
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <ol className="space-y-2 text-sm text-muted">
                <li>1. Нажмите «Получить код» — появится 6 символов.</li>
                <li>
                  2. Откройте бота {botName ? <b>@{botName}</b> : "агентства"} в Telegram и отправьте команду{" "}
                  <code>/start</code>.
                </li>
                <li>3. Отправьте боту код — аккаунт привяжется.</li>
              </ol>
              {user.tgLinkCode && (
                <div className="rounded-2xl bg-subtle p-4 text-center">
                  <div className="text-xs text-muted">Ваш код привязки</div>
                  <div className="mt-1 text-2xl font-semibold tracking-[0.3em]">{user.tgLinkCode}</div>
                </div>
              )}
              <form action={genCode}>
                <button className="btn-primary">
                  <Link2 size={16} /> {user.tgLinkCode ? "Получить новый код" : "Получить код"}
                </button>
              </form>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
