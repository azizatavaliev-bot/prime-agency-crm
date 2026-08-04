import { Plug, Send, Clock, Info, CheckCircle2, XCircle } from "lucide-react";
import { telegramEnabled } from "@/lib/telegram";
import { Section, MiniTable } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SettingsIntegrationsPage() {
  const enabled = telegramEnabled();
  const botName = process.env.TELEGRAM_BOT_USERNAME;
  const appUrl = process.env.APP_URL || "http://localhost:5210";
  const cronSet = Boolean(process.env.CRON_KEY);
  const hookSet = Boolean(process.env.TELEGRAM_WEBHOOK_SECRET);

  const env: [string, boolean, string][] = [
    ["TELEGRAM_BOT_TOKEN", enabled, "токен бота от @BotFather"],
    ["TELEGRAM_BOT_USERNAME", Boolean(botName), "имя бота без @ — для подсказок сотрудникам"],
    ["TELEGRAM_WEBHOOK_SECRET", hookSet, "секрет вебхука, защищает /api/telegram"],
    ["CRON_KEY", cronSet, "ключ для запуска напоминаний по расписанию"],
    ["APP_URL", Boolean(process.env.APP_URL), "адрес системы для кнопок в сообщениях бота"],
  ];

  return (
    <div>
      <Section title="Telegram-бот" icon={Send}>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm">
            {enabled ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-600" />
                Подключён{botName ? `: @${botName}` : ""}
              </>
            ) : (
              <>
                <XCircle size={16} className="text-amber-600" />
                Не подключён — добавьте переменные окружения ниже
              </>
            )}
          </div>

          <div className="mt-4 space-y-2 text-sm text-muted">
            <div>1. Создать бота у @BotFather и получить токен.</div>
            <div>2. Добавить переменные окружения и перезапустить систему.</div>
            <div>
              3. Прописать вебхук:
              <div className="mt-1 overflow-x-auto rounded-xl bg-subtle p-2 text-xs">
                <code>
                  https://api.telegram.org/bot&lt;TOKEN&gt;/setWebhook?url={appUrl}/api/telegram&amp;secret_token=&lt;SECRET&gt;
                </code>
              </div>
            </div>
            <div>4. Сотрудники подключаются сами: «Профиль» → «Получить код» → отправить код боту.</div>
          </div>
        </div>
      </Section>

      <Section title="Переменные окружения" icon={Plug}>
        <div className="card p-4">
          <MiniTable head={["Переменная", "Назначение", "Статус"]}>
            {env.map(([key, ok, desc]) => (
              <tr key={key}>
                <td className="px-3 py-2 text-sm font-medium whitespace-nowrap">
                  <code>{key}</code>
                </td>
                <td className="px-3 py-2 text-sm text-muted">{desc}</td>
                <td className="px-3 py-2 text-sm">
                  {ok ? (
                    <span className="text-emerald-600">задана</span>
                  ) : (
                    <span className="text-amber-600">не задана</span>
                  )}
                </td>
              </tr>
            ))}
          </MiniTable>
          <div className="mt-3 flex gap-2 rounded-2xl bg-subtle p-3 text-xs text-muted">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              Значения переменных система не показывает — только факт, задана она или нет. Меняются в файле
              <code> .env</code> локально и в переменных проекта на Railway.
            </span>
          </div>
        </div>
      </Section>

      <Section title="Напоминания по расписанию" icon={Clock}>
        <div className="card p-4 text-sm text-muted">
          <div>
            Адрес запуска:{" "}
            <code className="rounded bg-subtle px-1.5 py-0.5">{appUrl}/api/cron/reminders?key=CRON_KEY</code>
          </div>
          <div className="mt-2">
            Повесьте его на крон раз в день (Railway Cron, cron-job.org или любой планировщик) — система разошлёт
            напоминания об отчётах, задачах, оплатах и плановых расходах. Дубли не приходят: каждое напоминание
            отправляется один раз.
          </div>
        </div>
      </Section>
    </div>
  );
}
