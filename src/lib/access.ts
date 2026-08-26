import type { Prisma } from "@prisma/client";
import type { SessionUser } from "./auth";

/** Какие клиенты видит пользователь. */
export function clientScope(user: SessionUser): Prisma.ClientWhereInput {
  switch (user.role) {
    case "SUPER_ADMIN":
    case "ADMIN":
    case "ACCOUNTANT": // бухгалтер ведёт деньги по всем клиентам
      return {};
    case "TARGETOLOG":
      return { targetologId: user.id };
    case "TEAM_LEAD":
      return { accountId: user.id };
    case "DEVELOPER":
    case "EDITOR":
      return { tasks: { some: { assigneeId: user.id } } };
    default:
      // Неизвестная роль не должна открывать доступ ко всему: Prisma
      // трактует where: undefined как «без фильтра».
      return { id: "__no_access__" };
  }
}

/**
 * Какие маркетинговые отчёты видит пользователь.
 * Таргетолог видит только свои записи и отчёты по своим проектам —
 * рекламный бюджет всего агентства ему знать не нужно.
 */
export function marketingScope(user: SessionUser): Prisma.MarketingReportWhereInput {
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") return {};
  return { OR: [{ authorId: user.id }, { client: clientScope(user) }] };
}

/** Какие задачи видит пользователь. */
export function taskScope(user: SessionUser): Prisma.TaskWhereInput {
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN" || user.role === "ACCOUNTANT") return {};
  if (user.role === "DEVELOPER" || user.role === "EDITOR")
    return { OR: [{ assigneeId: user.id }, { authorId: user.id }], board: { in: ["DEV", "VIDEO"] } };
  // authorId обязателен: задача без клиента и без ответственного иначе
  // пропадала у того, кто её только что завёл — выглядело как «не сохраняется».
  return { OR: [{ assigneeId: user.id }, { authorId: user.id }, { client: clientScope(user) }] };
}

export const can = {
  /** Прибыль владельца и распределение долей — только супер-админ. */
  seeAgencyFinance: (u: SessionUser) => u.role === "SUPER_ADMIN",
  /** Статусы оплат: супер-админ, админ, бухгалтер и тимлид по своим клиентам. */
  seePayments: (u: SessionUser) =>
    u.role === "SUPER_ADMIN" || u.role === "ADMIN" || u.role === "ACCOUNTANT" || u.role === "TEAM_LEAD",
  /** Расходы, приходы, счета и переводы. */
  manageMoney: (u: SessionUser) => u.role === "SUPER_ADMIN" || u.role === "ADMIN" || u.role === "ACCOUNTANT",
  manageClients: (u: SessionUser) => u.role === "SUPER_ADMIN" || u.role === "ADMIN" || u.role === "TEAM_LEAD",
  /**
   * Создание нового клиента/проекта — шире, чем `manageClients`: таргетолог
   * тоже может завести себе проект (и станет его таргетологом автоматически,
   * см. `saveClient`). Редактирование/удаление чужих клиентов это не даёт.
   */
  createClients: (u: SessionUser) => can.manageClients(u) || u.role === "TARGETOLOG",
  /**
   * Правка карточки конкретного клиента: менеджмент — по всем, таргетолог —
   * только по своим (назначенным) проектам.
   */
  editClient: (u: SessionUser, client: { targetologId: string | null; accountId: string | null }) =>
    can.manageClients(u) || (u.role === "TARGETOLOG" && client.targetologId === u.id),
  manageTeam: (u: SessionUser) => u.role === "SUPER_ADMIN" || u.role === "ADMIN",
  /** ИИ-инбокс: вставка транскриптов/чата и подтверждение кандидатов в задачи. */
  manageTaskInbox: (u: SessionUser) => u.role === "SUPER_ADMIN" || u.role === "ADMIN" || u.role === "TEAM_LEAD",
  writeReports: (u: SessionUser) => u.role === "SUPER_ADMIN" || u.role === "ADMIN" || u.role === "TARGETOLOG",
  seeAllBoards: (u: SessionUser) => u.role === "SUPER_ADMIN" || u.role === "ADMIN" || u.role === "ACCOUNTANT",
  /**
   * Карта клиента (последние 4 цифры) — менеджмент, бухгалтер и сотрудники,
   * у которых этот клиент в скоупе (таргетолог/тимлид проекта). Не для списков —
   * только на карточке конкретного клиента, куда доступ уже проверен.
   */
  seeCard: (u: SessionUser, client: { targetologId: string | null; accountId: string | null }) =>
    u.role === "SUPER_ADMIN" ||
    u.role === "ADMIN" ||
    u.role === "ACCOUNTANT" ||
    (u.role === "TARGETOLOG" && client.targetologId === u.id) ||
    (u.role === "TEAM_LEAD" && client.accountId === u.id),
};

/** Проверка, что клиент доступен пользователю (иначе null). */
export async function assertClientAccess(
  prisma: { client: { findFirst: (args: unknown) => Promise<unknown> } },
  user: SessionUser,
  clientId: string
) {
  return prisma.client.findFirst({ where: { AND: [{ id: clientId }, clientScope(user)] } });
}
