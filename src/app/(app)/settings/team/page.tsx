import Link from "next/link";
import { UserPlus, ExternalLink, ShieldCheck, Info } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getShares } from "@/lib/finance";
import { ROLES } from "@/lib/constants";
import { som } from "@/lib/format";
import { Section, MiniTable, Badge } from "@/components/ui";
import FormModal from "@/components/FormModal";
import UserForm from "@/components/UserForm";

export const dynamic = "force-dynamic";

const ACCESS: [string, string][] = [
  ["OWNER", "Видит всё: клиентов, финансы, расходы, счета, цели, команду и настройки"],
  ["TARGETOLOG", "Только свои проекты: отчёты, задачи, кабинет. Финансы агентства скрыты"],
  ["ACCOUNT", "Свои клиенты и статусы оплат. Прибыль владельца и расходы скрыты"],
  ["CONTRACTOR", "Только доски «Разработка» и «Монтаж» со своими задачами"],
];

export default async function SettingsTeamPage() {
  const s = await getShares();
  const users = await prisma.user.findMany({
    include: { clientsAsTargetolog: true, clientsAsAccount: true, tasks: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <Section
        title="Сотрудники"
        icon={UserPlus}
        right={
          <div className="flex gap-2">
            <Link href="/team" className="btn-ghost">
              <ExternalLink size={15} /> Загрузка и выплаты
            </Link>
            <FormModal
              label="Добавить сотрудника"
              title="Новый сотрудник"
              icon={<UserPlus size={16} />}
              hint="Роль определяет, что человек видит в системе. Ставка — доля по умолчанию: её можно переопределить на конкретном проекте в карточке клиента."
            >
              <UserForm defaultLimit={s.projectLimit} />
            </FormModal>
          </div>
        }
      >
        <div className="card p-4">
          <MiniTable head={["Сотрудник", "Роль", "Ставка", "Проекты", "Задачи", "Статус", ""]}>
            {users.map((u) => {
              const projects =
                u.role === "ACCOUNT" ? u.clientsAsAccount.length : u.clientsAsTargetolog.length;
              return (
                <tr key={u.id} className={u.active ? "" : "opacity-50"}>
                  <td className="px-3 py-2 text-sm">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted">{u.email}</div>
                  </td>
                  <td className="px-3 py-2 text-sm">{ROLES[u.role as keyof typeof ROLES]}</td>
                  <td className="px-3 py-2 text-sm whitespace-nowrap">
                    {u.rate ? (u.rateType === "PERCENT" ? `${u.rate}%` : som(u.rate)) : "—"}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {projects} / {u.projectLimit}
                  </td>
                  <td className="px-3 py-2 text-sm">{u.tasks.filter((t) => !t.done).length}</td>
                  <td className="px-3 py-2 text-sm">
                    {u.active ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">активен</Badge>
                    ) : (
                      <Badge>отключён</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <FormModal label="Изменить" title={`Сотрудник — ${u.name}`} variant="ghost">
                      <UserForm member={u} defaultLimit={s.projectLimit} />
                    </FormModal>
                  </td>
                </tr>
              );
            })}
          </MiniTable>
          <div className="mt-3 flex gap-2 rounded-2xl bg-subtle p-3 text-xs text-muted">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              Чтобы закрыть доступ, снимите галочку «Активен» — история и данные сохранятся, войти человек не сможет.
              Пароль меняется в той же форме: заполните поле «Пароль», пустое — оставит прежний.
            </span>
          </div>
        </div>
      </Section>

      <Section title="Что видит каждая роль" icon={ShieldCheck}>
        <div className="card p-4">
          <MiniTable head={["Роль", "Доступ"]}>
            {ACCESS.map(([role, desc]) => (
              <tr key={role}>
                <td className="px-3 py-2 text-sm font-medium whitespace-nowrap">
                  {ROLES[role as keyof typeof ROLES]}
                </td>
                <td className="px-3 py-2 text-sm text-muted">{desc}</td>
              </tr>
            ))}
          </MiniTable>
          <p className="mt-3 text-xs text-muted">
            Права зашиты в коде (<code>src/lib/access.ts</code>) и проверяются на сервере: чужие данные не отдаются,
            даже если открыть ссылку напрямую.
          </p>
        </div>
      </Section>
    </div>
  );
}
