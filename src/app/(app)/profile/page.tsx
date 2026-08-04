import { Send, Link2, Unlink, Info } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTgLinkCode, unlinkTelegram } from "@/lib/actions";
import { telegramEnabled } from "@/lib/telegram";
import { ROLES } from "@/lib/constants";
import { PageHeader, Field, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return null;
  const botName = process.env.TELEGRAM_BOT_USERNAME;
  const enabled = telegramEnabled();

  async function genCode() {
    "use server";
    await createTgLinkCode();
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Профиль" subtitle="Ваши данные и подключение Telegram" />

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
