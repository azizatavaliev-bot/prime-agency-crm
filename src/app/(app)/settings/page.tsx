import Link from "next/link";
import { SlidersHorizontal, Landmark, ExternalLink, Info, Send, CheckCircle2, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getShares } from "@/lib/finance";
import { saveSettings } from "@/lib/actions";
import { telegramEnabled } from "@/lib/telegram";
import { dict, labelOf } from "@/lib/dict";
import { som } from "@/lib/format";
import { Section, MiniTable } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SettingsGeneralPage() {
  const s = await getShares();
  const [accounts, accountKinds] = await Promise.all([
    prisma.account.findMany({ orderBy: { name: "asc" } }),
    dict("ACCOUNT_KIND"),
  ]);
  const enabled = telegramEnabled();

  return (
    <div>
      <Section title="Деньги и лимиты" icon={SlidersHorizontal}>
        <form action={saveSettings} className="card grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Доля таргетолога, % от чека</label>
            <input
              className="input"
              name="targetologShare"
              type="number"
              step="1"
              defaultValue={Math.round(s.targetologShare * 100)}
            />
          </div>
          <div>
            <label className="label">Доля программиста/монтажёра, %</label>
            <input className="input" name="devShare" type="number" step="1" defaultValue={Math.round(s.devShare * 100)} />
          </div>
          <div>
            <label className="label">Резерв на развитие, %</label>
            <input
              className="input"
              name="reserveShare"
              type="number"
              step="1"
              defaultValue={Math.round(s.reserveShare * 100)}
            />
          </div>
          <div>
            <label className="label">Лимит проектов на таргетолога</label>
            <input className="input" name="projectLimit" type="number" defaultValue={s.projectLimit} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button className="btn-primary">Сохранить</button>
          </div>
        </form>

        <div className="mt-3 flex gap-2 rounded-2xl bg-subtle p-3 text-xs text-muted">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            Это ставки по умолчанию. Индивидуальная ставка сотрудника на конкретном проекте задаётся в карточке
            клиента → «Команда проекта» и имеет приоритет. С каждого платежа сначала уходит доля исполнителя и
            резерв, остаток — ваша доля; из неё вычитаются расходы месяца. Новые проценты применяются к платежам,
            добавленным после сохранения.
          </span>
        </div>
      </Section>

      <Section
        title="Счета"
        icon={Landmark}
        right={
          <Link href="/finance" className="btn-ghost">
            <ExternalLink size={15} /> Управлять в «Финансах»
          </Link>
        }
      >
        <div className="card p-4">
          <MiniTable head={["Счёт", "Тип", "Начальный остаток", "Минимум", "Статус"]}>
            {accounts.map((a) => (
              <tr key={a.id} className={a.active ? "" : "opacity-50"}>
                <td className="px-3 py-2 text-sm font-medium">{a.name}</td>
                <td className="px-3 py-2 text-sm text-muted">{labelOf(accountKinds, a.kind)}</td>
                <td className="px-3 py-2 text-sm whitespace-nowrap">{som(a.opening)}</td>
                <td className="px-3 py-2 text-sm whitespace-nowrap">
                  {a.minBalance !== null ? som(a.minBalance) : "—"}
                </td>
                <td className="px-3 py-2 text-sm">
                  {a.active ? <span className="text-emerald-600">активен</span> : "отключён"}
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-sm text-muted" colSpan={5}>
                  Счетов нет — добавьте в разделе «Финансы и счета»
                </td>
              </tr>
            )}
          </MiniTable>
        </div>
      </Section>

      <Section
        title="Состояние системы"
        icon={Send}
        right={
          <Link href="/settings/integrations" className="btn-ghost">
            <ExternalLink size={15} /> Интеграции
          </Link>
        }
      >
        <div className="card p-4 text-sm">
          <div className="flex items-center gap-2">
            {enabled ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-600" /> Telegram-бот подключён
              </>
            ) : (
              <>
                <XCircle size={16} className="text-amber-600" /> Telegram-бот не подключён — нужен токен
              </>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
