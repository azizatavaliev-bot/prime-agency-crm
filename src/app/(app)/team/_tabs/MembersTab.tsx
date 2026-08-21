import Link from "next/link";
import { HandCoins, Users, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { impersonateUser } from "@/lib/actions";
import { ROLES } from "@/lib/constants";
import { can } from "@/lib/access";
import { som, monthKey } from "@/lib/format";
import { Table, Badge } from "@/components/ui";
import { TeamModal } from "@/components/details";
import UserForm from "@/components/UserForm";
import ShareAccess from "@/components/ShareAccess";
import type { SessionUser } from "@/lib/auth";

export default async function MembersTab({
  me,
  projectLimit,
}: {
  me: SessionUser;
  projectLimit: number;
}) {
  const mk = monthKey();

  const [users, payouts, paidOut] = await Promise.all([
    prisma.user.findMany({
      include: {
        clientsAsTargetolog: true,
        clientsAsAccount: true,
        tasks: { include: { client: true } },
        employeeNotes: { include: { author: true }, orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.payment.groupBy({
      by: ["execUserId"],
      where: { periodMonth: mk, status: "PAID" },
      _sum: { execShare: true },
    }),
    prisma.expense.groupBy({
      by: ["userId"],
      where: { periodMonth: mk, category: "SALARY" },
      _sum: { amount: true },
    }),
  ]);
  const payoutMap = Object.fromEntries(payouts.map((p) => [p.execUserId, p._sum.execShare ?? 0]));
  const paidOutMap = Object.fromEntries(paidOut.map((p) => [p.userId, p._sum.amount ?? 0]));
  const activeStatuses = ["TEST", "ACTIVE", "RISK"];
  const appUrl = process.env.APP_URL || "http://localhost:5210";

  return (
    <div>
      <div className="mb-3 text-sm text-muted">
        Лимит {projectLimit} проектов на таргетолога · «Начислено» — доля с оплат клиентов, «Выплачено» —
        записанные расходы
      </div>
      <Table
        head={["Сотрудник", "Роль", "Ставка", "Оклад", "Загрузка", "Задачи", "Начислено", "Выплачено", "Доступ", ""]}
      >
        {users.map((u) => {
          const projects = u.role === "TEAM_LEAD" ? u.clientsAsAccount : u.clientsAsTargetolog;
          const load = projects.filter((c) => activeStatuses.includes(c.status)).length;
          const limit = u.projectLimit || projectLimit;
          const pct = Math.round((load / limit) * 100);
          const openTasks = u.tasks.filter((t) => !t.done).length;
          const showLoad = u.role === "TARGETOLOG" || u.role === "TEAM_LEAD";
          return (
            <TeamModal
              key={u.id}
              member={u}
              projects={projects}
              tasks={u.tasks}
              payout={payoutMap[u.id] ?? 0}
              limit={limit}
              notes={u.employeeNotes}
              canManageNotes={can.manageTeam(me)}
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
                  <td className={`td ${u.baseSalary > 0 ? "" : "text-muted"}`}>
                    {u.baseSalary > 0 ? som(u.baseSalary) : "—"}
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
                    <div className="flex items-center gap-2">
                      <ShareAccess
                        userId={u.id}
                        name={u.name}
                        email={u.email}
                        roleLabel={ROLES[u.role as keyof typeof ROLES]}
                        appUrl={appUrl}
                      />
                      {u.id !== me.id && u.active && (
                        <form action={impersonateUser}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button
                            className="btn-ghost !px-3 !py-1 !text-xs"
                            title="Смотреть интерфейс от лица этого сотрудника"
                          >
                            <Eye size={13} /> Войти как
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                  <td className="td">
                    {/* Выплата — только через ведомость: там оклад, доли и премии в одной сумме. */}
                    {me.role === "SUPER_ADMIN" && (
                      <Link
                        href={`/team?tab=payroll&month=${mk}`}
                        className="btn-ghost !px-3 !py-1 !text-xs"
                        title="Открыть ведомость зарплат за месяц"
                      >
                        <HandCoins size={13} /> Ведомость
                      </Link>
                    )}
                  </td>
                </>
              }
            >
              <UserForm member={u} defaultLimit={projectLimit} />
            </TeamModal>
          );
        })}
        {users.length === 0 && (
          <tr>
            <td className="td text-zinc-500" colSpan={10}>
              <Users size={14} className="inline" /> Сотрудников нет
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
