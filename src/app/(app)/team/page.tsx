import { UserPlus, Users, HandCoins } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShares } from "@/lib/finance";
import { saveUser, payoutTeam } from "@/lib/actions";
import { ROLES } from "@/lib/constants";
import { som, monthKey } from "@/lib/format";
import { PageHeader, Table, Badge } from "@/components/ui";
import FormModal from "@/components/FormModal";
import { TeamModal } from "@/components/details";
import UserForm from "@/components/UserForm";
import ShareAccess from "@/components/ShareAccess";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  await requireOwner();
  const shares = await getShares();

  const users = await prisma.user.findMany({
    include: {
      clientsAsTargetolog: true,
      clientsAsAccount: true,
      tasks: { include: { client: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const mk = monthKey();
  const payouts = await prisma.payment.groupBy({
    by: ["execUserId"],
    where: { periodMonth: mk, status: "PAID" },
    _sum: { execShare: true },
  });
  const payoutMap = Object.fromEntries(payouts.map((p) => [p.execUserId, p._sum.execShare ?? 0]));
  const paidOut = await prisma.expense.groupBy({
    by: ["userId"],
    where: { periodMonth: mk, category: "SALARY" },
    _sum: { amount: true },
  });
  const paidOutMap = Object.fromEntries(paidOut.map((p) => [p.userId, p._sum.amount ?? 0]));
  const activeStatuses = ["TEST", "ACTIVE", "RISK"];
  // Адрес системы попадает в сообщение сотруднику
  const appUrl = process.env.APP_URL || "http://localhost:5210";

  return (
    <div>
      <PageHeader
        title="Команда"
        subtitle={`Лимит ${shares.projectLimit} проектов на таргетолога · «Начислено» — доля с оплат клиентов, «Выплачено» — записанные расходы`}
        right={
          <FormModal
            label="Добавить сотрудника"
            title="Новый сотрудник"
            icon={<UserPlus size={16} />}
            hint="Ставка по умолчанию применяется ко всем его проектам. Индивидуальную ставку под конкретного клиента задают в карточке клиента → «Команда проекта»."
          >
            <UserForm defaultLimit={shares.projectLimit} />
          </FormModal>
        }
      />

      <Table
        head={["Сотрудник", "Роль", "Ставка", "Загрузка", "Задачи", "Начислено", "Выплачено", "Доступ", ""]}
      >
        {users.map((u) => {
          const projects = u.role === "ACCOUNT" ? u.clientsAsAccount : u.clientsAsTargetolog;
          const load = projects.filter((c) => activeStatuses.includes(c.status)).length;
          const limit = u.projectLimit || shares.projectLimit;
          const pct = Math.round((load / limit) * 100);
          const openTasks = u.tasks.filter((t) => !t.done).length;
          const showLoad = u.role === "TARGETOLOG" || u.role === "ACCOUNT";
          return (
            <TeamModal
              key={u.id}
              member={u}
              projects={projects}
              tasks={u.tasks}
              payout={payoutMap[u.id] ?? 0}
              limit={limit}
              className={u.active ? "" : "opacity-50"}
              row={
                <>
                  <td className="td">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-zinc-500">{u.email}</div>
                  </td>
                  <td className="td">{ROLES[u.role as keyof typeof ROLES]}</td>
                  <td className="td">
                    {u.rate ? (u.rateType === "PERCENT" ? `${u.rate}%` : som(u.rate)) : "—"}
                  </td>
                  <td className="td">
                    {showLoad ? (
                      <span className="flex items-center gap-2">
                        <span>
                          {load} из {limit}
                        </span>
                        {u.role === "TARGETOLOG" && (
                          <Badge
                            className={
                              pct >= 100
                                ? "bg-red-100 text-red-700 border-red-200"
                                : pct >= 80
                                  ? "bg-amber-100 text-amber-700 border-amber-200"
                                  : "bg-emerald-100 text-emerald-700 border-emerald-200"
                            }
                          >
                            {pct >= 100 ? "перегрузка" : pct >= 80 ? "близко к лимиту" : "норма"}
                          </Badge>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="td">{openTasks}</td>
                  <td className="td font-medium">{som(payoutMap[u.id] ?? 0)}</td>
                  <td className={`td ${(paidOutMap[u.id] ?? 0) > 0 ? "text-emerald-600" : "text-muted"}`}>
                    {som(paidOutMap[u.id] ?? 0)}
                  </td>
                  <td className="td">
                    <ShareAccess
                      userId={u.id}
                      name={u.name}
                      email={u.email}
                      roleLabel={ROLES[u.role as keyof typeof ROLES]}
                      appUrl={appUrl}
                    />
                  </td>
                  <td className="td">
                    {(payoutMap[u.id] ?? 0) - (paidOutMap[u.id] ?? 0) > 0 && (
                      <form action={payoutTeam}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="month" value={mk} />
                        <input
                          type="hidden"
                          name="amount"
                          value={Math.round((payoutMap[u.id] ?? 0) - (paidOutMap[u.id] ?? 0))}
                        />
                        <button className="btn-ghost !px-3 !py-1 !text-xs" title="Записать выплату в расходы">
                          <HandCoins size={13} /> Выплатить
                        </button>
                      </form>
                    )}
                  </td>
                </>
              }
            >
              <UserForm member={u} defaultLimit={shares.projectLimit} />
            </TeamModal>
          );
        })}
        {users.length === 0 && (
          <tr>
            <td className="td text-zinc-500" colSpan={8}>
              <Users size={14} className="inline" /> Сотрудников нет
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
