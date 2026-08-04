import type { Prisma } from "@prisma/client";
import type { SessionUser } from "./auth";

/** Какие клиенты видит пользователь. */
export function clientScope(user: SessionUser): Prisma.ClientWhereInput {
  switch (user.role) {
    case "OWNER":
    case "ACCOUNTANT": // бухгалтер ведёт деньги по всем клиентам
      return {};
    case "TARGETOLOG":
      return { targetologId: user.id };
    case "ACCOUNT":
      return { accountId: user.id };
    case "CONTRACTOR":
      return { tasks: { some: { assigneeId: user.id } } };
  }
}

/** Какие задачи видит пользователь. */
export function taskScope(user: SessionUser): Prisma.TaskWhereInput {
  if (user.role === "OWNER" || user.role === "ACCOUNTANT") return {};
  if (user.role === "CONTRACTOR") return { assigneeId: user.id, board: { in: ["DEV", "VIDEO"] } };
  return { OR: [{ assigneeId: user.id }, { client: clientScope(user) }] };
}

export const can = {
  /** Прибыль владельца и распределение долей — только владелец. */
  seeAgencyFinance: (u: SessionUser) => u.role === "OWNER",
  /** Статусы оплат: владелец, бухгалтер и аккаунт-менеджер по своим клиентам. */
  seePayments: (u: SessionUser) =>
    u.role === "OWNER" || u.role === "ACCOUNTANT" || u.role === "ACCOUNT",
  /** Расходы, приходы, счета и переводы. */
  manageMoney: (u: SessionUser) => u.role === "OWNER" || u.role === "ACCOUNTANT",
  manageClients: (u: SessionUser) => u.role === "OWNER" || u.role === "ACCOUNT",
  manageTeam: (u: SessionUser) => u.role === "OWNER",
  writeReports: (u: SessionUser) => u.role === "OWNER" || u.role === "TARGETOLOG",
  seeAllBoards: (u: SessionUser) => u.role === "OWNER" || u.role === "ACCOUNTANT",
};

/** Проверка, что клиент доступен пользователю (иначе null). */
export async function assertClientAccess(
  prisma: { client: { findFirst: (args: unknown) => Promise<unknown> } },
  user: SessionUser,
  clientId: string
) {
  return prisma.client.findFirst({ where: { AND: [{ id: clientId }, clientScope(user)] } });
}
