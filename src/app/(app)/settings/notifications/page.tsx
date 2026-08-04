import { Bell, Info, Send } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getNotify } from "@/lib/finance";
import { saveNotifySettings } from "@/lib/actions";
import { telegramEnabled } from "@/lib/telegram";
import { Section, MiniTable, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SettingsNotificationsPage() {
  const cfg = await getNotify();
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true, tgChatId: true },
    orderBy: { createdAt: "asc" },
  });
  const enabled = telegramEnabled();

  return (
    <div>
      <Section title="Когда напоминать" icon={Bell}>
        <form action={saveNotifySettings} className="card grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Оплата клиента — за сколько дней</label>
            <input className="input" name="paymentDays" type="number" min="0" defaultValue={cfg.paymentDays} />
          </div>
          <div>
            <label className="label">Нет отчёта — через сколько дней</label>
            <input className="input" name="reportDays" type="number" min="1" defaultValue={cfg.reportDays} />
          </div>
          <div>
            <label className="label">Дедлайн задачи — за сколько дней</label>
            <input className="input" name="taskDays" type="number" min="0" defaultValue={cfg.taskDays} />
          </div>
          <div>
            <label className="label">Плановый расход — за сколько дней</label>
            <input className="input" name="expenseDays" type="number" min="0" defaultValue={cfg.expenseDays} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 grid gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="cplAlert" defaultChecked={cfg.cplAlert} />
              Присылать алерт при превышении целевого CPL
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="notifyOwner" defaultChecked={cfg.notifyOwner} />
              Уведомлять владельца
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="notifyTeam" defaultChecked={cfg.notifyTeam} />
              Уведомлять команду (таргетологов, аккаунт-менеджеров, исполнителей задач)
            </label>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button className="btn-primary">Сохранить</button>
          </div>
        </form>

        <div className="mt-3 flex gap-2 rounded-2xl bg-subtle p-3 text-xs text-muted">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            Напоминания приходят в раздел «Уведомления» и дублируются в Telegram тем, кто подключил бота. Проверка
            запускается при заходе владельца на дашборд и по адресу <code>/api/cron/reminders?key=…</code> — его можно
            повесить на крон раз в день.
          </span>
        </div>
      </Section>

      <Section title="Кто получает в Telegram" icon={Send}>
        <div className="card p-4">
          {!enabled && (
            <div className="mb-3 rounded-2xl bg-subtle p-3 text-xs text-muted">
              Бот пока не подключён — напоминания приходят только внутри системы.
            </div>
          )}
          <MiniTable head={["Сотрудник", "Telegram"]}>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2 text-sm">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted">{u.email}</div>
                </td>
                <td className="px-3 py-2 text-sm">
                  {u.tgChatId ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">подключён</Badge>
                  ) : (
                    <span className="text-muted">не подключён</span>
                  )}
                </td>
              </tr>
            ))}
          </MiniTable>
          <p className="mt-3 text-xs text-muted">
            Сотрудник подключает бота сам: «Профиль» → «Получить код» → отправить код боту.
          </p>
        </div>
      </Section>
    </div>
  );
}
