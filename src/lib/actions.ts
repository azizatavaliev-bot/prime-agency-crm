"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import {
  requireUser,
  requireClient,
  hashPassword,
  verifyPassword,
  issueSession,
  impersonate as impersonateSession,
  stopImpersonating as stopImpersonatingSession,
} from "./auth";
import { can, clientScope, taskScope } from "./access";
import { getShares, split, reportMetrics, getUsdRate } from "./finance";
import { monthKey, som, dateRu } from "./format";
import { nextPaymentDate } from "./payday";
import { ROLES, DEFAULTS, REPORT_OBJECTIVE, BONUS_METRIC, RENEWAL_MODE } from "./constants";
import { notifyAssignee, closeOrReopenTask } from "./tasks";
import { notifyClient, notifyUser } from "./telegram";
import { ensureDictSeeded } from "./dict";
import { payrollFor } from "./payroll";


function str(fd: FormData, k: string) {
  const v = fd.get(k);
  return v === null || v === "" ? null : String(v);
}
function req(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}
/** Число из формы. Запятая — тоже десятичный разделитель: не все печатают через точку. */
function n(fd: FormData, k: string) {
  return Number(String(fd.get(k) ?? "0").replace(/\s/g, "").replace(",", ".")) || 0;
}
function date(fd: FormData, k: string) {
  const v = str(fd, k);
  return v ? new Date(v) : null;
}

/** Файл-скрин из формы → байты для БД, либо null, если ничего не приложили. */
async function screenshotFrom(fd: FormData, k: string): Promise<{ screenshot: Uint8Array<ArrayBuffer>; screenshotMime: string } | null> {
  const file = fd.get(k);
  if (!(file instanceof File) || file.size === 0) return null;
  const bytes = Uint8Array.from(new Uint8Array(await file.arrayBuffer()));
  return { screenshot: bytes, screenshotMime: file.type || "image/jpeg" };
}

export async function notify(userIds: (string | null | undefined)[], data: { kind: string; title: string; body?: string; link?: string }) {
  const ids = [...new Set(userIds.filter(Boolean) as string[])];
  if (!ids.length) return;
  await prisma.notification.createMany({
    data: ids.map((userId) => ({ userId, ...data })),
  });
}

export async function owners() {
  const list = await prisma.user.findMany({ where: { role: "SUPER_ADMIN", active: true } });
  return list.map((u) => u.id);
}

/**
 * Уведомление о создании/выполнении задачи: супер-админам, тимлиду проекта
 * (client.accountId) и клиенту в портал (Notification.clientId), если задача
 * привязана к клиенту. Один путь для saveTask и toggleTask.
 */
export async function notifyTaskStakeholders(
  t: { id: string; clientId: string | null; board: string },
  client: { targetologId: string | null; accountId: string | null } | null | undefined,
  kind: string,
  title: string
) {
  const link = `/tasks?board=${t.board}`;
  const userIds = [...new Set([...(await owners()), client?.accountId].filter(Boolean) as string[])];
  // Дублируем в Telegram, а не только в колокольчик внутри CRM — иначе тимлид/владелец
  // узнают о задаче только зайдя в приложение.
  for (const uid of userIds) {
    await notifyUser(uid, { kind, title, link });
  }
  if (t.clientId) {
    await notifyClient(t.clientId, { kind, title, link });
  }
}

/* ---------------- Клиенты ---------------- */

export async function saveClient(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  // Создание — шире (доступно и таргетологу), правка существующего клиента —
  // менеджменту по всем + таргетологу только по своим (проверяется ниже через
  // clientScope при апдейте).
  if (id) {
    if (!can.manageClients(user) && user.role !== "TARGETOLOG") redirect("/no-access");
  } else if (!can.createClients(user)) {
    redirect("/no-access");
  }

  const services = fd.getAll("services").map(String).join(",");
  const portalLogin = str(fd, "portalLogin");
  const portalPassword = str(fd, "portalPassword");
  const data = {
    name: req(fd, "name"),
    niche: str(fd, "niche"),
    contact: str(fd, "contact"),
    source: str(fd, "source"),
    status: req(fd, "status") || "TEST",
    avgCheck: n(fd, "avgCheck"),
    startedAt: date(fd, "startedAt") ?? new Date(),
    services,
    adAccount: str(fd, "adAccount"),
    nextPaymentAt: date(fd, "nextPaymentAt"),
    notes: str(fd, "notes"),
    paymentDay: Math.round(n(fd, "paymentDay")) || null,
    contractStart: date(fd, "contractStart"),
    contractEnd: date(fd, "contractEnd"),
    profitPercent: n(fd, "profitPercent") || null,
    goal: str(fd, "goal"),
    agreement: str(fd, "agreement"),
    targetCpl: n(fd, "targetCpl") || null,
    sitePrice: n(fd, "sitePrice") || null,
    botPrice: n(fd, "botPrice") || null,
    videoPrice: n(fd, "videoPrice") || null,
    // Таргетолог не может назначить проект кому-то другому — только себе.
    targetologId: user.role === "TARGETOLOG" ? user.id : str(fd, "targetologId"),
    accountId: user.role === "TEAM_LEAD" ? user.id : str(fd, "accountId"),
    churnedAt: req(fd, "status") === "CHURNED" ? new Date() : null,
    portalLogin: portalLogin ? portalLogin.toLowerCase() : null,
    cardLast4: str(fd, "cardLast4"),
    cardHolder: str(fd, "cardHolder"),
    ...(portalPassword ? { portalPasswordHash: await hashPassword(portalPassword) } : {}),
  };

  if (id) {
    const allowed = await prisma.client.findFirst({ where: { AND: [{ id }, clientScope(user)] } });
    if (!allowed) redirect("/no-access");
    await prisma.client.update({ where: { id }, data });
    revalidatePath(`/clients/${id}`);
  } else {
    const created = await prisma.client.create({ data });
    await notify([data.targetologId], {
      kind: "NEW_LEAD",
      title: `Новый клиент: ${data.name}`,
      body: "Вы назначены таргетологом проекта",
      link: `/clients/${created.id}`,
    });
  }
  revalidatePath("/clients");
  revalidatePath("/dashboard");
}

export async function deleteClient(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  await prisma.client.delete({ where: { id: req(fd, "id") } });
  revalidatePath("/clients");
  redirect("/clients");
}

/* ---------------- Оплаты ---------------- */

export async function savePayment(fd: FormData) {
  const user = await requireUser();
  if (!can.seePayments(user)) redirect("/no-access");

  const clientId = req(fd, "clientId");
  const client = await prisma.client.findFirst({
    where: { AND: [{ id: clientId }, clientScope(user)] },
  });
  if (!client) redirect("/no-access");

  const shares = await getShares();
  const amount = n(fd, "amount");
  const kind = req(fd, "kind") || "SUBSCRIPTION";
  const status = req(fd, "status") || "PENDING";
  const dueAt = date(fd, "dueAt") ?? new Date();
  const paidAt = status === "PAID" ? date(fd, "paidAt") ?? new Date() : null;

  // Исполнитель по этому платежу: для абонплаты — таргетолог проекта,
  // для разовых услуг — тот, кого выбрали в форме.
  const execUserId = kind === "SUBSCRIPTION" ? client.targetologId : str(fd, "execUserId");
  // Индивидуальная ставка на проекте важнее общих настроек агентства.
  const member = execUserId
    ? await prisma.clientMember.findFirst({
        where: { clientId, userId: execUserId },
        select: { rateType: true, rate: true },
      })
    : null;
  const s = split(kind, amount, shares, member);

  const id = str(fd, "id");
  const data = {
    clientId,
    kind,
    amount,
    status,
    method: req(fd, "method") || "TRANSFER",
    dueAt,
    paidAt,
    periodMonth: monthKey(paidAt ?? dueAt),
    comment: str(fd, "comment"),
    execUserId,
    accountId: str(fd, "accountId"),
    ...s,
  };

  if (id) {
    // Сам платёж тоже должен быть доступен: иначе чужой правится подстановкой id.
    const existing = await prisma.payment.findFirst({
      where: { AND: [{ id }, { client: clientScope(user) }] },
    });
    if (!existing) redirect("/no-access");
    await prisma.payment.update({ where: { id }, data });
  } else {
    await prisma.payment.create({ data });
  }

  if (str(fd, "nextPaymentAt"))
    await prisma.client.update({
      where: { id: clientId },
      data: { nextPaymentAt: date(fd, "nextPaymentAt") },
    });

  revalidatePath("/payments");
  revalidatePath("/finance");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
}

export async function markPaid(fd: FormData) {
  const user = await requireUser();
  if (!can.seePayments(user)) redirect("/no-access");
  const id = req(fd, "id");
  const p = await prisma.payment.findFirst({
    where: { AND: [{ id }, { client: clientScope(user) }] },
  });
  if (!p) redirect("/no-access");
  const now = new Date();
  await prisma.payment.update({
    where: { id },
    data: { status: "PAID", paidAt: now, periodMonth: monthKey(now) },
  });
  revalidatePath("/payments");
  revalidatePath(`/clients/${p.clientId}`);
  revalidatePath("/dashboard");
}

export async function deletePayment(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  await prisma.payment.delete({ where: { id: req(fd, "id") } });
  revalidatePath("/payments");
  revalidatePath("/dashboard");
}

/* ---------------- Отчёты по таргету ---------------- */

export async function saveReport(fd: FormData) {
  const user = await requireUser();
  if (!can.writeReports(user)) redirect("/no-access");

  const clientId = req(fd, "clientId");
  const client = await prisma.client.findFirst({
    where: { AND: [{ id: clientId }, clientScope(user)] },
  });
  if (!client) redirect("/no-access");

  const objective = req(fd, "objective") || "ENGAGEMENT";
  const data = {
    clientId,
    authorId: user.id,
    periodFrom: date(fd, "periodFrom") ?? new Date(),
    periodTo: date(fd, "periodTo") ?? new Date(),
    objective: Object.keys(REPORT_OBJECTIVE).includes(objective) ? objective : "ENGAGEMENT",
    budget: n(fd, "budget"),
    spent: n(fd, "spent"),
    leads: Math.round(n(fd, "leads")),
    actions: Math.round(n(fd, "actions")),
    engagement: Math.round(n(fd, "engagement")),
    traffic: Math.round(n(fd, "traffic")),
    profileVisits: Math.round(n(fd, "profileVisits")),
    views: Math.round(n(fd, "views")),
    targetCpl: n(fd, "targetCpl"),
    targetCpa: n(fd, "targetCpa") || null,
    bundles: str(fd, "bundles"),
    comment: str(fd, "comment"),
  };
  const shot = await screenshotFrom(fd, "screenshot");
  const removeScreenshot = str(fd, "removeScreenshot") === "1";

  const id = str(fd, "id");
  let reportId = id;
  if (id) {
    const existing = await prisma.adReport.findFirst({
      where: { AND: [{ id }, { client: clientScope(user) }] },
    });
    if (!existing) redirect("/no-access");
    const shotPatch = shot ?? (removeScreenshot ? { screenshot: null, screenshotMime: null } : {});
    await prisma.adReport.update({ where: { id }, data: { ...data, ...shotPatch } });
  } else {
    const created = await prisma.adReport.create({ data: shot ? { ...data, ...shot } : data });
    reportId = created.id;
  }

  const m = reportMetrics(data);
  if (m.inTarget === false) {
    await notify([...(await owners()), client.targetologId, client.accountId], {
      kind: "CPL_ALERT",
      title: `Превышен порог CPL — ${client.name}`,
      body: `CPL ${Math.round(m.cpl ?? 0)} сом при цели ${Math.round(data.targetCpl)} сом`,
      link: `/clients/${clientId}`,
    });
  }

  // Свежий отчёт — сразу в Telegram: клиенту (если привязан бот в портале)
  // и команде проекта, со скрином кабинета, если его приложили.
  const metricLabel: Record<string, string> = {
    LEADS: "заявок",
    ENGAGEMENT: "вовлечённость",
    TRAFFIC: "переходов",
    PROFILE_VISITS: "посещений профиля",
  };
  const metricValue = { LEADS: data.leads, ENGAGEMENT: data.engagement, TRAFFIC: data.traffic, PROFILE_VISITS: data.profileVisits }[
    data.objective
  ];
  const summary = `Период ${dateRu(data.periodFrom)} — ${dateRu(data.periodTo)}\nПотрачено: ${som(data.spent)}\n${
    metricLabel[data.objective] ?? "результат"
  }: ${metricValue}`;
  const photo = shot ? { buffer: Buffer.from(shot.screenshot), mime: shot.screenshotMime } : null;

  await notifyClient(clientId, {
    kind: "REPORT_READY",
    title: `Новый отчёт по рекламе — ${client.name}`,
    body: summary,
    link: `/portal/reports/${reportId}`,
    photo,
  });
  for (const uid of [...new Set([...(await owners()), client.targetologId, client.accountId].filter(Boolean) as string[])]) {
    await notifyUser(uid, {
      kind: "REPORT_READY",
      title: `Отчёт заполнен — ${client.name}`,
      body: summary,
      link: `/clients/${clientId}`,
      photo,
    });
  }

  revalidatePath("/reports");
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteReport(fd: FormData) {
  const user = await requireUser();
  if (!can.writeReports(user)) redirect("/no-access");
  const id = req(fd, "id");
  const r = await prisma.adReport.findFirst({ where: { AND: [{ id }, { client: clientScope(user) }] } });
  if (!r) redirect("/no-access");
  await prisma.adReport.delete({ where: { id } });
  revalidatePath("/reports");
  revalidatePath(`/clients/${r.clientId}`);
}

/* ---------------- Задачи ---------------- */

export async function saveTask(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, "id");
  const data = {
    title: req(fd, "title"),
    board: req(fd, "board") || "TARGET",
    stage: req(fd, "stage") || (req(fd, "board") === "TARGET" || !req(fd, "board") ? "TODO" : "BRIEF"),
    clientId: str(fd, "clientId"),
    assigneeId: str(fd, "assigneeId"),
    dueAt: date(fd, "dueAt"),
    comment: str(fd, "comment"),
    priority: req(fd, "priority") || "MEDIUM",
    tags: fd.getAll("tags").map(String).filter(Boolean).join(","),
    recurrence: str(fd, "recurrence"),
  };
  if (id) {
    const t = await prisma.task.findFirst({ where: { AND: [{ id }, taskScope(user)] } });
    if (!t) redirect("/no-access");
    await prisma.task.update({ where: { id }, data });
    // Переназначили — новый исполнитель должен узнать.
    if (data.assigneeId && data.assigneeId !== t.assigneeId && data.assigneeId !== user.id)
      await notifyAssignee(data.assigneeId, { ...t, ...data, id }, "Задача назначена на вас");
  } else {
    if (user.role === "DEVELOPER") redirect("/no-access");
    const created = await prisma.task.create({ data });
    const raw = str(fd, "checklist");
    if (raw) {
      const items = raw
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      if (items.length)
        await prisma.taskChecklistItem.createMany({
          data: items.map((text, i) => ({ taskId: created.id, text, order: i })),
        });
    }
    if (data.assigneeId && data.assigneeId !== user.id)
      await notifyAssignee(data.assigneeId, created, "Новая задача");

    const client = data.clientId
      ? await prisma.client.findUnique({ where: { id: data.clientId }, select: { targetologId: true, accountId: true } })
      : null;
    await notifyTaskStakeholders(created, client, "TASK_DUE", `${ROLES[user.role]} поставил задачу: ${created.title}`);
  }
  revalidatePath("/tasks");
}

/* ---------------- Чеклист и комментарии задачи ---------------- */

/** Доступ к задаче по её scope — используется всеми под-действиями. */
async function taskOr404(user: Awaited<ReturnType<typeof requireUser>>, id: string) {
  const t = await prisma.task.findFirst({ where: { AND: [{ id }, taskScope(user)] } });
  if (!t) redirect("/no-access");
  return t;
}

export async function addChecklistItem(fd: FormData) {
  const user = await requireUser();
  const taskId = req(fd, "taskId");
  await taskOr404(user, taskId);
  const text = req(fd, "text");
  if (!text) return;
  const last = await prisma.taskChecklistItem.findFirst({
    where: { taskId },
    orderBy: { order: "desc" },
  });
  await prisma.taskChecklistItem.create({
    data: { taskId, text, order: (last?.order ?? -1) + 1 },
  });
  revalidatePath("/tasks");
}

export async function toggleChecklistItem(fd: FormData) {
  const user = await requireUser();
  const id = req(fd, "id");
  const item = await prisma.taskChecklistItem.findUnique({ where: { id } });
  if (!item) redirect("/no-access");
  await taskOr404(user, item.taskId);
  await prisma.taskChecklistItem.update({ where: { id }, data: { done: !item.done } });
  revalidatePath("/tasks");
}

export async function deleteChecklistItem(fd: FormData) {
  const user = await requireUser();
  const id = req(fd, "id");
  const item = await prisma.taskChecklistItem.findUnique({ where: { id } });
  if (!item) redirect("/no-access");
  await taskOr404(user, item.taskId);
  await prisma.taskChecklistItem.delete({ where: { id } });
  revalidatePath("/tasks");
}

export async function addTaskComment(fd: FormData) {
  const user = await requireUser();
  const taskId = req(fd, "taskId");
  const task = await taskOr404(user, taskId);
  const text = req(fd, "text");
  if (!text) return;
  await prisma.taskComment.create({ data: { taskId, userId: user.id, text } });

  // Автора и исполнителя держим в курсе обсуждения.
  const targets = [task.assigneeId].filter((x) => x && x !== user.id) as string[];
  if (targets.length)
    await notify(targets, {
      kind: "NEW_LEAD",
      title: `Комментарий к задаче: ${task.title}`,
      body: text.slice(0, 120),
      link: `/tasks?board=${task.board}`,
    });
  revalidatePath("/tasks");
}

export async function deleteTaskComment(fd: FormData) {
  const user = await requireUser();
  const id = req(fd, "id");
  const c = await prisma.taskComment.findUnique({ where: { id } });
  if (!c) redirect("/no-access");
  if (user.role !== "SUPER_ADMIN" && c.userId !== user.id) redirect("/no-access");
  await prisma.taskComment.delete({ where: { id } });
  revalidatePath("/tasks");
}

/* ---------------- Заметки по проекту клиента ---------------- */

export async function addClientNote(fd: FormData) {
  const user = await requireUser();
  const clientId = req(fd, "clientId");
  const client = await prisma.client.findFirst({ where: { AND: [{ id: clientId }, clientScope(user)] } });
  if (!client) redirect("/no-access");
  const text = req(fd, "text");
  if (!text) return;
  await prisma.clientNote.create({ data: { clientId, authorId: user.id, text } });
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteClientNote(fd: FormData) {
  const user = await requireUser();
  const id = req(fd, "id");
  const note = await prisma.clientNote.findUnique({ where: { id } });
  if (!note) redirect("/no-access");
  const client = await prisma.client.findFirst({ where: { AND: [{ id: note.clientId }, clientScope(user)] } });
  if (!client) redirect("/no-access");
  if (user.role !== "SUPER_ADMIN" && note.authorId !== user.id) redirect("/no-access");
  await prisma.clientNote.delete({ where: { id } });
  revalidatePath(`/clients/${note.clientId}`);
}

export async function setTaskPriority(fd: FormData) {
  const user = await requireUser();
  const id = req(fd, "id");
  await taskOr404(user, id);
  await prisma.task.update({ where: { id }, data: { priority: req(fd, "priority") || "MEDIUM" } });
  revalidatePath("/tasks");
}

export async function archiveTask(fd: FormData) {
  const user = await requireUser();
  const id = req(fd, "id");
  const t = await taskOr404(user, id);
  await prisma.task.update({
    where: { id },
    data: { archivedAt: t.archivedAt ? null : new Date() },
  });
  revalidatePath("/tasks");
}

export async function moveTask(fd: FormData) {
  const user = await requireUser();
  const id = req(fd, "id");
  const t = await prisma.task.findFirst({ where: { AND: [{ id }, taskScope(user)] } });
  if (!t) redirect("/no-access");
  const stage = req(fd, "stage");
  // Карточка встаёт в конец новой колонки, а не прыгает на случайное место
  // после перезагрузки: раньше поле order вообще не заполнялось.
  const last = await prisma.task.findFirst({
    where: { board: t.board, stage, archivedAt: null },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  await prisma.task.update({
    where: { id },
    data: { stage, order: (last?.order ?? 0) + 1 },
  });
  revalidatePath("/tasks");
}

export async function toggleTask(fd: FormData) {
  const user = await requireUser();
  const id = req(fd, "id");
  const t = await prisma.task.findFirst({
    where: { AND: [{ id }, taskScope(user)] },
    include: { client: { select: { name: true, targetologId: true, accountId: true } } },
  });
  if (!t) redirect("/no-access");
  const willBeDone = !t.done;
  await closeOrReopenTask(t, willBeDone);
  if (willBeDone) await notifyTaskStakeholders(t, t.client, "TASK_DUE", `Задача выполнена: ${t.title}`);
  revalidatePath("/tasks");
}

/** «Взять на себя»: назначить текущего пользователя исполнителем задачи. */
export async function assignToSelf(fd: FormData) {
  const user = await requireUser();
  const id = req(fd, "id");
  const t = await taskOr404(user, id);
  if (t.assigneeId === user.id) return;
  await prisma.task.update({ where: { id }, data: { assigneeId: user.id } });
  revalidatePath("/tasks");
}


export async function deleteTask(fd: FormData) {
  const user = await requireUser();
  const id = req(fd, "id");
  const t = await prisma.task.findFirst({ where: { AND: [{ id }, taskScope(user)] } });
  if (!t || user.role === "DEVELOPER") redirect("/no-access");
  await prisma.task.delete({ where: { id } });
  revalidatePath("/tasks");
}

/* ---------------- Команда ---------------- */

export async function saveUser(fd: FormData) {
  const user = await requireUser();
  if (!can.manageTeam(user)) redirect("/no-access");
  const id = str(fd, "id");
  const password = str(fd, "password");
  // Короткий пароль подбирается за минуты — не пускаем такие в систему.
  if (password && password.length < 8) redirect("/team?error=short-password");
  // Роль только из известного списка: неизвестная снимает фильтры доступа.
  const role = req(fd, "role");
  if (!Object.keys(ROLES).includes(role)) redirect("/no-access");
  const base = {
    login: req(fd, "login").trim().toLowerCase(),
    email: req(fd, "email").toLowerCase(),
    name: req(fd, "name"),
    phone: str(fd, "phone"),
    role,
    rate: n(fd, "rate") || null,
    rateType: req(fd, "rateType") || "PERCENT",
    baseSalary: n(fd, "baseSalary"),
    projectLimit: Math.round(n(fd, "projectLimit")) || 5,
    active: fd.get("active") !== null,
  };
  if (id) {
    await prisma.user.update({
      where: { id },
      data: password
        ? {
            ...base,
            passwordHash: await hashPassword(password),
            // Отметка времени гасит сессии, выданные со старым паролем.
            passwordChangedAt: new Date(),
          }
        : base,
    });
  } else {
    await prisma.user.create({
      data: { ...base, passwordHash: await hashPassword(password || "prime2026") },
    });
  }
  revalidatePath("/team");
}

/* ---------------- Заметки о сотруднике ---------------- */

export async function addEmployeeNote(fd: FormData) {
  const user = await requireUser();
  if (!can.manageTeam(user)) redirect("/no-access");
  const userId = req(fd, "userId");
  const text = req(fd, "text");
  if (!text) return;
  await prisma.employeeNote.create({ data: { userId, authorId: user.id, text } });
  revalidatePath("/team");
}

export async function deleteEmployeeNote(fd: FormData) {
  const user = await requireUser();
  if (!can.manageTeam(user)) redirect("/no-access");
  const id = req(fd, "id");
  await prisma.employeeNote.delete({ where: { id } });
  revalidatePath("/team");
}

/**
 * «Войти как» — админ/супер-админ смотрит интерфейс глазами сотрудника.
 * Право проверяется дважды: здесь (can.manageTeam) и внутри impersonate()
 * (роль + запрет цепочки подмен), чтобы обойти проверку можно было только
 * подделав сам JWT.
 */
export async function impersonateUser(fd: FormData) {
  const user = await requireUser();
  if (!can.manageTeam(user)) redirect("/no-access");
  const targetUserId = req(fd, "userId");
  const session = await impersonateSession(targetUserId);
  if (!session) redirect("/team?error=impersonate-failed");
  redirect("/dashboard");
}

/** Вернуться из режима просмотра «от лица сотрудника» к своей сессии админа. */
export async function stopImpersonatingAction() {
  const session = await stopImpersonatingSession();
  if (!session) redirect("/login");
  redirect("/team");
}

/**
 * Смена собственного пароля.
 *
 * Раньше сменить пароль мог только владелец и только чужой — сотруднику
 * оставалось жить с выданным в переписке. Старый пароль спрашиваем, чтобы
 * оставленная без присмотра сессия не давала сменить его насовсем.
 */
export async function changeOwnPassword(fd: FormData) {
  const session = await requireUser();
  const current = req(fd, "current");
  const next = req(fd, "password");
  const repeat = req(fd, "repeat");

  if (next.length < 8) redirect("/profile?error=short");
  if (next !== repeat) redirect("/profile?error=mismatch");

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) redirect("/login");
  if (!(await verifyPassword(current, user.passwordHash))) redirect("/profile?error=wrong");
  if (await verifyPassword(next, user.passwordHash)) redirect("/profile?error=same");

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), passwordChangedAt: new Date() },
  });
  // Старые сессии погашены отметкой времени — себе сразу выдаём новую,
  // иначе человек выкидывался бы на вход сразу после смены пароля.
  await issueSession(user.id);

  revalidatePath("/profile");
  redirect("/profile?changed=1");

}

/* ---------------- Настройки и уведомления ---------------- */

export async function saveSettings(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const entries: [string, number][] = [
    ["targetologShare", n(fd, "targetologShare") / 100],
    ["devShare", n(fd, "devShare") / 100],
    ["reserveShare", n(fd, "reserveShare") / 100],
    ["projectLimit", Math.round(n(fd, "projectLimit"))],
    ["usdRate", n(fd, "usdRate") || DEFAULTS.usdRate],
  ];
  for (const [key, value] of entries) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    });
  }
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function saveNotifySettings(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const entries: [string, string][] = [
    ["notifyPaymentDays", String(Math.round(n(fd, "paymentDays")) || 3)],
    ["notifyReportDays", String(Math.round(n(fd, "reportDays")) || 7)],
    ["notifyTaskDays", String(Math.round(n(fd, "taskDays")) || 1)],
    ["notifyExpenseDays", String(Math.round(n(fd, "expenseDays")) || 2)],
    ["notifyCpl", fd.get("cplAlert") !== null ? "1" : "0"],
    ["notifyOwner", fd.get("notifyOwner") !== null ? "1" : "0"],
    ["notifyTeam", fd.get("notifyTeam") !== null ? "1" : "0"],
  ];
  for (const [key, value] of entries)
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  revalidatePath("/settings/notifications");
}

export async function readAllNotifications() {
  const user = await requireUser();
  await prisma.notification.updateMany({ where: { userId: user.id }, data: { read: true } });
  revalidatePath("/notifications");
  revalidatePath("/", "layout"); // обновить счётчик непрочитанных в шапке
}

/* ---------------- Портал клиента ---------------- */

export async function readAllPortalNotifications() {
  const session = await requireClient();
  await prisma.notification.updateMany({ where: { clientId: session.clientId }, data: { read: true } });
  revalidatePath("/portal/notifications");
  revalidatePath("/portal", "layout");
}

/** Обратная связь клиента по отчёту: продажи, конверсия, оценка качества лидов. */
export async function saveClientFeedback(fd: FormData) {
  const session = await requireClient();
  const id = req(fd, "id");
  const r = await prisma.adReport.findFirst({ where: { id, clientId: session.clientId } });
  if (!r) redirect("/no-access");

  await prisma.adReport.update({
    where: { id },
    data: {
      clientSales: n(fd, "clientSales") ? Math.round(n(fd, "clientSales")) : null,
      clientConversion: n(fd, "clientConversion") || null,
      clientLeadQuality: n(fd, "clientLeadQuality") ? Math.round(n(fd, "clientLeadQuality")) : null,
    },
  });
  revalidatePath(`/portal/reports/${id}`);
}

/**
 * Клиент создаёт задачу по своему проекту из портала. Узкая версия saveTask:
 * clientId и исполнителя клиент не выбирает — берём из его проекта
 * (таргетолог, назначенный на проект), остальные поля задачи клиенту
 * недоступны.
 */
export async function createClientTask(fd: FormData) {
  const session = await requireClient();
  const title = req(fd, "title");
  if (!title) redirect("/portal/tasks");

  const client = await prisma.client.findUnique({ where: { id: session.clientId } });
  if (!client) redirect("/no-access");

  await prisma.task.create({
    data: {
      title,
      board: "TARGET",
      stage: "TODO",
      clientId: client.id,
      assigneeId: client.targetologId,
      dueAt: date(fd, "dueAt"),
    },
  });

  if (client.targetologId) {
    await notify([client.targetologId], {
      kind: "TASK_DUE",
      title: `Задача от клиента: ${client.name}`,
      body: title,
      link: `/clients/${client.id}`,
    });
  }

  revalidatePath("/portal/tasks");
}


/* ---------------- Участники проекта и ставки ---------------- */

export async function saveMember(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const clientId = req(fd, "clientId");
  const userId = req(fd, "userId");
  const role = req(fd, "role");
  const data = {
    clientId,
    userId,
    role,
    rateType: req(fd, "rateType") || "PERCENT",
    rate: n(fd, "rate"),
    note: str(fd, "note"),
  };
  const existing = await prisma.clientMember.findFirst({ where: { clientId, userId, role } });
  if (existing) await prisma.clientMember.update({ where: { id: existing.id }, data });
  else await prisma.clientMember.create({ data });

  // Ставку фиксируем в истории: ведомости прошлых месяцев не должны меняться
  // от того, что сегодня договорились о другом проценте.
  if (!existing || existing.rate !== data.rate || existing.rateType !== data.rateType) {
    const fromMonth = req(fd, "fromMonth") || monthKey();
    await prisma.memberRate.upsert({
      where: { clientId_userId_role_fromMonth: { clientId, userId, role, fromMonth } },
      create: { clientId, userId, role, rateType: data.rateType, rate: data.rate, fromMonth },
      update: { rateType: data.rateType, rate: data.rate },
    });
  }

  // синхронизируем основного ответственного в карточке
  if (role === "TARGETOLOG") await prisma.client.update({ where: { id: clientId }, data: { targetologId: userId } });
  if (role === "TEAM_LEAD") await prisma.client.update({ where: { id: clientId }, data: { accountId: userId } });

  await notify([userId], {
    kind: "NEW_LEAD",
    title: "Вас назначили на проект",
    body: `Ставка: ${data.rateType === "PERCENT" ? data.rate + "%" : data.rate + " сом"}`,
    link: `/clients/${clientId}`,
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/team");
}

export async function deleteMember(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const id = req(fd, "id");
  const m = await prisma.clientMember.findUnique({ where: { id } });
  await prisma.clientMember.delete({ where: { id } });
  if (m) revalidatePath(`/clients/${m.clientId}`);
  revalidatePath("/clients");
  revalidatePath("/team");
}

/** Ставка участника с конкретного месяца — правка истории вручную. */
export async function saveMemberRate(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const clientId = req(fd, "clientId");
  const userId = req(fd, "userId");
  const role = req(fd, "role");
  const fromMonth = req(fd, "fromMonth") || monthKey();
  const rateType = req(fd, "rateType") || "PERCENT";
  const rate = n(fd, "rate");
  await prisma.memberRate.upsert({
    where: { clientId_userId_role_fromMonth: { clientId, userId, role, fromMonth } },
    create: { clientId, userId, role, rateType, rate, fromMonth, note: str(fd, "note") },
    update: { rateType, rate, note: str(fd, "note") },
  });
  // Текущая ставка участника должна совпадать с последней записью истории.
  const latest = await prisma.memberRate.findFirst({
    where: { clientId, userId, role },
    orderBy: { fromMonth: "desc" },
  });
  const member = await prisma.clientMember.findFirst({ where: { clientId, userId, role } });
  if (member && latest)
    await prisma.clientMember.update({
      where: { id: member.id },
      data: { rateType: latest.rateType, rate: latest.rate },
    });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/payroll");
}

export async function deleteMemberRate(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const row = await prisma.memberRate.findUnique({ where: { id: req(fd, "id") } });
  if (!row) return;
  await prisma.memberRate.delete({ where: { id: row.id } });
  revalidatePath(`/clients/${row.clientId}`);
  revalidatePath("/payroll");
}

/* ---------------- Зарплаты: премии, правила, выплаты ---------------- */

export async function saveBonus(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const month = req(fd, "month") || monthKey();
  const userId = req(fd, "userId");
  // Премия за выплаченный месяц уже не попадёт в перевод — не даём начислить втихую.
  const closed = await prisma.payout.findFirst({ where: { userId, month } });
  if (closed) redirect(`/payroll?month=${month}&error=paid`);
  const id = str(fd, "id");
  const data = {
    userId,
    month,
    amount: n(fd, "amount"),
    reason: req(fd, "reason") || "Премия",
    clientId: str(fd, "clientId"),
  };
  if (id) await prisma.bonus.update({ where: { id }, data });
  else await prisma.bonus.create({ data });
  await notify([userId], {
    kind: "NEW_LEAD",
    title: `Премия ${data.amount} сом`,
    body: data.reason,
    link: "/profile",
  });
  revalidatePath("/payroll");
}

export async function deleteBonus(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const row = await prisma.bonus.findUnique({ where: { id: req(fd, "id") } });
  if (!row) return;
  const closed = await prisma.payout.findFirst({ where: { userId: row.userId, month: row.month } });
  if (closed) redirect(`/payroll?month=${row.month}&error=paid`);
  await prisma.bonus.delete({ where: { id: row.id } });
  revalidatePath("/payroll");
}

export async function saveBonusRule(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const metric = req(fd, "metric");
  if (!Object.keys(BONUS_METRIC).includes(metric)) redirect("/settings/rules?error=metric");
  const role = str(fd, "role");
  if (role && !Object.keys(ROLES).includes(role)) redirect("/settings/rules?error=role");
  const data = {
    name: req(fd, "name") || "Премия",
    metric,
    role,
    amountType: req(fd, "amountType") || "FIXED",
    amount: n(fd, "amount"),
    threshold: n(fd, "threshold"),
    perClient: fd.get("perClient") !== null,
    active: fd.get("active") !== null,
    hint: str(fd, "hint"),
    order: Math.round(n(fd, "order")) || 100,
  };
  const id = str(fd, "id");
  if (id) await prisma.bonusRule.update({ where: { id }, data });
  else await prisma.bonusRule.create({ data });
  revalidatePath("/settings/rules");
  revalidatePath("/payroll");
}

export async function deleteBonusRule(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  await prisma.bonusRule.delete({ where: { id: req(fd, "id") } });
  revalidatePath("/settings/rules");
  revalidatePath("/payroll");
}

export async function toggleBonusRule(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const row = await prisma.bonusRule.findUnique({ where: { id: req(fd, "id") } });
  if (!row) return;
  await prisma.bonusRule.update({ where: { id: row.id }, data: { active: !row.active } });
  revalidatePath("/settings/rules");
  revalidatePath("/payroll");
}

/**
 * Выплата зарплаты за месяц: снимок ведомости + расход категории «Выплаты команде».
 *
 * Сумму пересчитываем на сервере, а не берём из формы: иначе подменой поля
 * можно выписать себе любой перевод.
 */
export async function payPayroll(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const month = req(fd, "month") || monthKey();
  const userId = req(fd, "userId");

  const existing = await prisma.payout.findFirst({ where: { userId, month } });
  if (existing) redirect(`/payroll?month=${month}&error=paid`);

  const lines = await payrollFor(month);
  const line = lines.find((l) => l.userId === userId);
  if (!line) redirect(`/payroll?month=${month}&error=nobody`);
  if (line.total <= 0) redirect(`/payroll?month=${month}&error=zero`);

  const accountId = str(fd, "accountId");
  const [y, m] = month.split("-").map(Number);
  // Ставим дату внутри месяца ведомости, иначе расход уедет в чужой период.
  const spentAt = new Date(y, m - 1, Math.min(new Date().getDate(), 28));

  const expense = await prisma.expense.create({
    data: {
      title: `Зарплата: ${line.name}`,
      category: "SALARY",
      amount: line.total,
      status: "PAID",
      method: req(fd, "method") || "TRANSFER",
      spentAt,
      periodMonth: month,
      userId,
      accountId,
      comment: `оклад ${line.base} + проекты ${line.projectShare} + премии ${line.bonusTotal}`,
    },
  });

  await prisma.payout.create({
    data: {
      userId,
      month,
      base: line.base,
      projectShare: line.projectShare,
      bonus: line.bonusTotal,
      amount: line.total,
      paidAt: new Date(),
      accountId,
      expenseId: expense.id,
      comment: str(fd, "comment"),
    },
  });

  await notify([userId], {
    kind: "PAYMENT_DUE",
    title: `Зарплата за ${month} выплачена`,
    body: `${line.total} сом`,
    link: "/profile",
  });

  revalidatePath("/payroll");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

/** Откат выплаты: снимок и расход удаляются, месяц снова открыт. */
export async function cancelPayout(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const row = await prisma.payout.findUnique({ where: { id: req(fd, "id") } });
  if (!row) return;
  if (row.expenseId)
    await prisma.expense.deleteMany({ where: { id: row.expenseId } });
  await prisma.payout.delete({ where: { id: row.id } });
  revalidatePath("/payroll");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

/** Условия сотрудничества по проекту: сколько берём, когда платят, что дальше. */
export async function saveClientTerms(fd: FormData) {
  const user = await requireUser();
  if (!can.manageClients(user)) redirect("/no-access");
  const clientId = req(fd, "clientId");
  const client = await prisma.client.findFirst({
    where: { AND: [{ id: clientId }, clientScope(user)] },
  });
  if (!client) redirect("/no-access");
  const renewalMode = str(fd, "renewalMode");
  if (renewalMode && !Object.keys(RENEWAL_MODE).includes(renewalMode)) redirect("/no-access");

  // День оплаты поменяли — пересчитываем дату следующего платежа, если она
  // осталась в прошлом. Иначе карточка говорила одновременно «через 3 дня»
  // и «просрочено 4 дня».
  const paymentDay = Math.round(n(fd, "paymentDay")) || null;
  const staleNext = !client.nextPaymentAt || client.nextPaymentAt < new Date();
  const nextPaymentAt =
    paymentDay && staleNext ? nextPaymentDate(paymentDay) : client.nextPaymentAt;

  await prisma.client.update({
    where: { id: clientId },
    data: {
      nextPaymentAt,
      avgCheck: n(fd, "avgCheck"),
      paymentDay,
      contractStart: date(fd, "contractStart"),
      contractEnd: date(fd, "contractEnd"),
      profitPercent: n(fd, "profitPercent") || null,
      paymentTerms: str(fd, "paymentTerms"),
      renewalMode,
      priceReviewAt: date(fd, "priceReviewAt"),
      termsNote: str(fd, "termsNote"),
      agreement: str(fd, "agreement"),
    },
  });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

/* ---------------- Цели ---------------- */

export async function saveGoal(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const clientId = str(fd, "clientId");
  const month = req(fd, "month") || monthKey();
  const metric = req(fd, "metric");
  const data = { clientId, month, metric, target: n(fd, "target"), comment: str(fd, "comment") };
  const id = str(fd, "id");
  // Правка существующей цели: месяц или показатель могли поменять, поэтому
  // ищем по id, а не по тройке ключей.
  const existing = id
    ? await prisma.goal.findUnique({ where: { id } })
    : await prisma.goal.findFirst({ where: { clientId, month, metric } });
  if (existing) await prisma.goal.update({ where: { id: existing.id }, data });
  else await prisma.goal.create({ data });
  revalidatePath("/settings/goals");
  revalidatePath("/analytics");
  revalidatePath("/dashboard");
  if (clientId) revalidatePath(`/clients/${clientId}`);
}

export async function deleteGoal(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  await prisma.goal.delete({ where: { id: req(fd, "id") } });
  revalidatePath("/settings/goals");
  revalidatePath("/analytics");
  revalidatePath("/dashboard");
}

/* ---------------- Telegram ---------------- */

/** Генерирует код привязки для текущего пользователя. */
export async function createTgLinkCode() {
  const user = await requireUser();
  const code = Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  await prisma.user.update({ where: { id: user.id }, data: { tgLinkCode: code } });
  revalidatePath("/profile");
  revalidatePath("/settings");
  return code;
}

export async function unlinkTelegram() {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { tgChatId: null, tgLinkCode: null } });
  revalidatePath("/profile");
  revalidatePath("/settings");
}


/* ---------------- Расходы ---------------- */

export async function saveExpense(fd: FormData) {
  const user = await requireUser();
  if (!can.manageMoney(user)) redirect("/no-access");
  const id = str(fd, "id");
  const spentAt = date(fd, "spentAt") ?? new Date();
  const data = {
    title: req(fd, "title"),
    category: req(fd, "category") || "OTHER",
    amount: n(fd, "amount"),
    status: req(fd, "status") || "PAID",
    method: req(fd, "method") || "TRANSFER",
    spentAt,
    periodMonth: monthKey(spentAt),
    recurring: fd.get("recurring") !== null,
    comment: str(fd, "comment"),
    clientId: str(fd, "clientId"),
    userId: str(fd, "userId"),
    accountId: str(fd, "accountId"),
  };
  if (id) await prisma.expense.update({ where: { id }, data });
  else await prisma.expense.create({ data });
  revalidatePath("/expenses");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}

export async function markExpensePaid(fd: FormData) {
  const user = await requireUser();
  if (!can.manageMoney(user)) redirect("/no-access");
  const id = req(fd, "id");
  // periodMonth не трогаем: июльский расход, оплаченный в августе, должен
  // остаться в июльском отчёте, иначе закрытый месяц меняется задним числом.
  await prisma.expense.update({
    where: { id },
    data: { status: "PAID", spentAt: new Date() },
  });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function deleteExpense(fd: FormData) {
  const user = await requireUser();
  if (!can.manageMoney(user)) redirect("/no-access");
  await prisma.expense.delete({ where: { id: req(fd, "id") } });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}

/** Переносит все регулярные расходы месяца в следующий месяц как запланированные. */
export async function repeatExpenses(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const from = req(fd, "month") || monthKey();
  const [y, m] = from.split("-").map(Number);
  const nextDate = new Date(y, m, 1);
  const next = monthKey(nextDate);

  const list = await prisma.expense.findMany({ where: { periodMonth: from, recurring: true } });
  let created = 0;
  for (const e of list) {
    const exists = await prisma.expense.findFirst({
      where: { periodMonth: next, title: e.title, category: e.category },
    });
    if (exists) continue;
    const spentAt = new Date(y, m, Math.min(e.spentAt.getDate(), 28));
    await prisma.expense.create({
      data: {
        title: e.title,
        category: e.category,
        amount: e.amount,
        status: "PLANNED",
        method: e.method,
        spentAt,
        periodMonth: next,
        recurring: true,
        comment: e.comment,
        clientId: e.clientId,
        userId: e.userId,
      },
    });
    created++;
  }
  revalidatePath("/expenses");
  void created;
}

/** Создаёт расход-выплату по доле исполнителя за месяц. */
export async function payoutTeam(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const month = req(fd, "month") || monthKey();
  const userId = req(fd, "userId");
  const amount = n(fd, "amount");
  const member = await prisma.user.findUnique({ where: { id: userId } });
  const [y, m] = month.split("-").map(Number);
  await prisma.expense.create({
    data: {
      title: `Выплата: ${member?.name ?? "сотрудник"}`,
      category: "SALARY",
      amount,
      status: "PAID",
      method: "TRANSFER",
      spentAt: new Date(y, m - 1, Math.min(new Date().getDate(), 28)),
      periodMonth: month,
      userId,
      comment: "доля с проектов за месяц",
    },
  });
  revalidatePath("/expenses");
  revalidatePath("/team");
  revalidatePath("/dashboard");
}

/* ---------------- Счета, приходы, переводы, категории ---------------- */

export async function saveAccount(fd: FormData) {
  const user = await requireUser();
  if (!can.manageMoney(user)) redirect("/no-access");
  const id = str(fd, "id");
  const data = {
    name: req(fd, "name"),
    kind: req(fd, "kind") || "CASH",
    opening: n(fd, "opening"),
    minBalance: str(fd, "minBalance") ? n(fd, "minBalance") : null,
    active: fd.get("active") !== null,
    note: str(fd, "note"),
  };
  if (id) await prisma.account.update({ where: { id }, data });
  else await prisma.account.create({ data });
  revalidatePath("/finance");
  revalidatePath("/expenses");
  revalidatePath("/payments");
}

export async function deleteAccount(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const id = req(fd, "id");
  const used =
    (await prisma.payment.count({ where: { accountId: id } })) +
    (await prisma.expense.count({ where: { accountId: id } })) +
    (await prisma.income.count({ where: { accountId: id } })) +
    (await prisma.transfer.count({ where: { OR: [{ fromAccountId: id }, { toAccountId: id }] } }));
  // счёт с операциями не удаляем, а деактивируем — история остаётся целой
  if (used > 0) await prisma.account.update({ where: { id }, data: { active: false } });
  else await prisma.account.delete({ where: { id } });
  revalidatePath("/finance");
}

export async function saveIncome(fd: FormData) {
  const user = await requireUser();
  if (!can.manageMoney(user)) redirect("/no-access");
  const id = str(fd, "id");
  const receivedAt = date(fd, "receivedAt") ?? new Date();
  const data = {
    title: req(fd, "title"),
    category: req(fd, "category") || "OTHER",
    amount: n(fd, "amount"),
    receivedAt,
    periodMonth: monthKey(receivedAt),
    comment: str(fd, "comment"),
    accountId: str(fd, "accountId"),
    clientId: str(fd, "clientId"),
  };
  if (id) await prisma.income.update({ where: { id }, data });
  else await prisma.income.create({ data });
  revalidatePath("/finance");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}

export async function deleteIncome(fd: FormData) {
  const user = await requireUser();
  if (!can.manageMoney(user)) redirect("/no-access");
  await prisma.income.delete({ where: { id: req(fd, "id") } });
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function saveTransfer(fd: FormData) {
  const user = await requireUser();
  if (!can.manageMoney(user)) redirect("/no-access");
  const fromAccountId = req(fd, "fromAccountId");
  const toAccountId = req(fd, "toAccountId");
  if (fromAccountId === toAccountId) return;
  const madeAt = date(fd, "madeAt") ?? new Date();
  await prisma.transfer.create({
    data: {
      fromAccountId,
      toAccountId,
      amount: n(fd, "amount"),
      madeAt,
      periodMonth: monthKey(madeAt),
      comment: str(fd, "comment"),
    },
  });
  revalidatePath("/finance");
}

export async function deleteTransfer(fd: FormData) {
  const user = await requireUser();
  if (!can.manageMoney(user)) redirect("/no-access");
  await prisma.transfer.delete({ where: { id: req(fd, "id") } });
  revalidatePath("/finance");
}

export async function saveDictItem(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const id = str(fd, "id");
  const type = req(fd, "type");
  const name = req(fd, "name");
  const data = {
    name,
    color: str(fd, "color"),
    hint: str(fd, "hint"),
    order: Math.round(n(fd, "order")) || 100,
    active: fd.get("active") !== null,
  };
  if (id) {
    await prisma.dictItem.update({ where: { id }, data });
  } else {
    await ensureDictSeeded(type as Parameters<typeof ensureDictSeeded>[0]);
    const key =
      str(fd, "key") ||
      `${name.toUpperCase().replace(/[^A-ZА-Я0-9]+/gi, "_").slice(0, 18)}_${Math.random()
        .toString(36)
        .slice(2, 5)
        .toUpperCase()}`;
    await prisma.dictItem.create({ data: { type, key, builtin: false, ...data } });
  }
  revalidateAll();
}

export async function deleteDictItem(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const id = req(fd, "id");
  const item = await prisma.dictItem.findUnique({ where: { id } });
  if (!item) return;
  // встроенные не удаляем — только выключаем, чтобы не сломать существующие записи
  if (item.builtin) await prisma.dictItem.update({ where: { id }, data: { active: false } });
  else await prisma.dictItem.delete({ where: { id } });
  revalidateAll();
}

export async function toggleDictItem(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const id = req(fd, "id");
  const item = await prisma.dictItem.findUnique({ where: { id } });
  if (!item) return;
  await prisma.dictItem.update({ where: { id }, data: { active: !item.active } });
  revalidateAll();
}

/** Сдвинуть значение справочника вверх или вниз. */
export async function moveDictItem(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const id = req(fd, "id");
  const dir = req(fd, "dir") === "up" ? -1 : 1;
  const item = await prisma.dictItem.findUnique({ where: { id } });
  if (!item) return;
  const list = await prisma.dictItem.findMany({
    where: { type: item.type },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  const idx = list.findIndex((i) => i.id === id);
  const swapWith = list[idx + dir];
  if (!swapWith) return;
  await prisma.dictItem.update({ where: { id: item.id }, data: { order: swapWith.order } });
  await prisma.dictItem.update({ where: { id: swapWith.id }, data: { order: item.order } });
  revalidateAll();
}

function revalidateAll() {
  for (const p of [
    "/settings",
    "/clients",
    "/payments",
    "/expenses",
    "/finance",
    "/tasks",
    "/reports",
    "/dashboard",
    "/analytics",
  ])
    revalidatePath(p);
}


/**
 * Создаёт ожидаемые платежи по дню оплаты клиента: если у активного клиента задан
 * день оплаты и в текущем месяце ещё нет абонплаты — заводим её со статусом «Ожидается».
 * Так работает конвейер оплат в FADAMOS: система сама помнит, кто и когда должен заплатить.
 */
export async function generateDuePayments() {
  const shares = await getShares();
  const now = new Date();
  const month = monthKey(now);
  const clients = await prisma.client.findMany({
    where: { status: { in: ["TEST", "ACTIVE", "RISK"] }, paymentDay: { not: null } },
  });

  let created = 0;
  for (const c of clients) {
    if (!c.avgCheck) continue;
    if (c.contractEnd && c.contractEnd < now) continue; // договор закончился
    const exists = await prisma.payment.findFirst({
      where: { clientId: c.id, kind: "SUBSCRIPTION", periodMonth: month },
    });
    if (exists) continue;

    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dueAt = new Date(now.getFullYear(), now.getMonth(), Math.min(c.paymentDay!, lastDay));
    const member = c.targetologId
      ? await prisma.clientMember.findFirst({
          where: { clientId: c.id, userId: c.targetologId },
          select: { rateType: true, rate: true },
        })
      : null;
    const s = split("SUBSCRIPTION", c.avgCheck, shares, member);
    await prisma.payment.create({
      data: {
        clientId: c.id,
        kind: "SUBSCRIPTION",
        amount: c.avgCheck,
        status: "PENDING",
        method: "TRANSFER",
        dueAt,
        periodMonth: month,
        execUserId: c.targetologId,
        comment: "создано автоматически по дню оплаты",
        ...s,
      },
    });
    await prisma.client.update({ where: { id: c.id }, data: { nextPaymentAt: dueAt } });
    created++;
  }
  if (created) {
    revalidatePath("/payments");
    revalidatePath("/dashboard");
    revalidatePath("/clients");
  }
  return created;
}

/* ---------------- Маркетинг (ежедневные отчёты агентства) ---------------- */

export async function saveMarketingReport(fd: FormData) {
  const user = await requireUser();
  if (!can.writeReports(user)) redirect("/no-access");

  // Клиента можно указать только своего: иначе таргетолог подставит чужой id вручную.
  const clientId = str(fd, "clientId");
  if (clientId) {
    const client = await prisma.client.findFirst({
      where: { AND: [{ id: clientId }, clientScope(user)] },
    });
    if (!client) redirect("/no-access");
  }

  // Расход храним всегда в сомах, иначе итоги и CPL сложат доллары с сомами.
  const currency = req(fd, "currency") || "KGS";
  const entered = n(fd, "spend");
  const usdRate = currency === "USD" ? n(fd, "usdRate") || (await getUsdRate()) : null;
  const spend = currency === "USD" ? entered * (usdRate as number) : entered;

  const data = {
    date: date(fd, "date") ?? new Date(),
    channel: req(fd, "channel") || "TARGET",
    source: str(fd, "source"),
    direction: str(fd, "direction"),
    spend,
    currency,
    usdRate,
    leads: Math.round(n(fd, "leads")),
    impressions: Math.round(n(fd, "impressions")),
    inquiries: Math.round(n(fd, "inquiries")),
    notes: str(fd, "notes"),
    clientId,
    authorId: user.id,
  };

  const id = str(fd, "id");
  if (id) {
    // Чужой отчёт правит только владелец.
    const existing = await prisma.marketingReport.findUnique({ where: { id } });
    if (!existing) redirect("/no-access");
    if (user.role !== "SUPER_ADMIN" && existing.authorId !== user.id) redirect("/no-access");
    await prisma.marketingReport.update({ where: { id }, data });
  } else {
    await prisma.marketingReport.create({ data });
  }

  revalidatePath("/marketing");
  revalidatePath("/marketing/report");
  revalidatePath("/marketing/calendar");
  // Уводим со страницы правки: иначе форма остаётся в режиме «правка отчёта»
  // и следующий ввод молча перезаписал бы только что сохранённый.
  if (id) redirect("/marketing?tab=daily");
}

export async function deleteMarketingReport(fd: FormData) {
  const user = await requireUser();
  if (!can.writeReports(user)) redirect("/no-access");
  const id = req(fd, "id");
  const existing = await prisma.marketingReport.findUnique({ where: { id } });
  if (!existing) redirect("/no-access");
  if (user.role !== "SUPER_ADMIN" && existing.authorId !== user.id) redirect("/no-access");
  await prisma.marketingReport.delete({ where: { id } });
  revalidatePath("/marketing");
  revalidatePath("/marketing/report");
  revalidatePath("/marketing/calendar");
}

/* ---------------- Шаблоны наборов задач ---------------- */

export async function saveTaskTemplate(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const id = str(fd, "id");
  const data = {
    name: req(fd, "name"),
    hint: str(fd, "hint"),
    board: req(fd, "board") || "TARGET",
  };
  // Пункты приходят одной textarea: «Заголовок | через сколько дней»
  const raw = str(fd, "items") ?? "";
  const items = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const [title, days] = line.split("|").map((s) => s.trim());
      return { title, dueDays: days ? Number(days) || null : null, order: i };
    })
    .filter((i) => i.title);

  if (id) {
    await prisma.taskTemplate.update({ where: { id }, data });
    await prisma.taskTemplateItem.deleteMany({ where: { templateId: id } });
    if (items.length)
      await prisma.taskTemplateItem.createMany({
        data: items.map((i) => ({ ...i, templateId: id })),
      });
  } else {
    const created = await prisma.taskTemplate.create({ data });
    if (items.length)
      await prisma.taskTemplateItem.createMany({
        data: items.map((i) => ({ ...i, templateId: created.id })),
      });
  }
  revalidatePath("/settings/templates");
  revalidatePath("/tasks");
}

export async function deleteTaskTemplate(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  await prisma.taskTemplate.delete({ where: { id: req(fd, "id") } });
  revalidatePath("/settings/templates");
}

/** Применить шаблон: создаёт весь набор задач разом, опционально к клиенту. */
export async function applyTaskTemplate(fd: FormData) {
  const user = await requireUser();
  if (user.role === "DEVELOPER") redirect("/no-access");

  const templateId = req(fd, "templateId");
  const tpl = await prisma.taskTemplate.findUnique({
    where: { id: templateId },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (!tpl) redirect("/no-access");

  const clientId = str(fd, "clientId");
  if (clientId) {
    const client = await prisma.client.findFirst({
      where: { AND: [{ id: clientId }, clientScope(user)] },
    });
    if (!client) redirect("/no-access");
  }
  const assigneeId = str(fd, "assigneeId");
  const now = new Date();

  for (const item of tpl.items) {
    const dueAt =
      item.dueDays === null ? null : new Date(now.getTime() + item.dueDays * 86400000);
    const task = await prisma.task.create({
      data: {
        title: item.title,
        board: tpl.board,
        stage: item.stage,
        priority: item.priority,
        clientId,
        assigneeId,
        dueAt,
      },
    });
    const points = item.checklist
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (points.length)
      await prisma.taskChecklistItem.createMany({
        data: points.map((text, i) => ({ taskId: task.id, text, order: i })),
      });
  }

  revalidatePath("/tasks");
}

/** Смена этапа клиента одним кликом из карточки — как в FADAMOS. */
export async function setClientStatus(fd: FormData) {
  const user = await requireUser();
  if (!can.manageClients(user)) redirect("/no-access");
  const id = req(fd, "id");
  const status = req(fd, "status");
  const client = await prisma.client.findFirst({
    where: { AND: [{ id }, clientScope(user)] },
  });
  if (!client) redirect("/no-access");

  await prisma.client.update({
    where: { id },
    data: {
      status,
      // Дата оттока проставляется автоматически, чтобы не считать её руками.
      churnedAt: status === "CHURNED" ? client.churnedAt ?? new Date() : null,
    },
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/dashboard");
}

/**
 * Единая операция: приход и расход в одном окне (как «Новая операция» в FADAMOS).
 * Раньше это были две разные формы в разных местах — при ежедневном учёте
 * приходилось помнить, куда идти.
 */
export async function saveOperation(fd: FormData) {
  const user = await requireUser();
  if (!can.manageMoney(user)) redirect("/no-access");

  const kind = req(fd, "kind") === "EXPENSE" ? "EXPENSE" : "INCOME";
  const when = date(fd, "when") ?? new Date();
  const amount = n(fd, "amount");
  const title = req(fd, "title") || (kind === "EXPENSE" ? "Расход" : "Приход");

  if (kind === "EXPENSE") {
    await prisma.expense.create({
      data: {
        title,
        category: req(fd, "category") || "OTHER",
        amount,
        status: "PAID",
        method: req(fd, "method") || "TRANSFER",
        spentAt: when,
        periodMonth: monthKey(when),
        comment: str(fd, "comment"),
        clientId: str(fd, "clientId"),
        userId: str(fd, "userId"),
        accountId: str(fd, "accountId"),
      },
    });
  } else {
    await prisma.income.create({
      data: {
        title,
        category: req(fd, "category") || "OTHER",
        amount,
        receivedAt: when,
        periodMonth: monthKey(when),
        comment: str(fd, "comment"),
        clientId: str(fd, "clientId"),
        accountId: str(fd, "accountId"),
      },
    });
  }

  revalidatePath("/finance");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

/* ---------------- Регламенты (зоны ответственности) ---------------- */

export async function saveRegulation(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  const id = str(fd, "id");

  // Пункты вводятся построчно: строка с «#» открывает новый блок регламента.
  const items = (str(fd, "items") ?? "")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  const data = {
    title: req(fd, "title"),
    description: str(fd, "description"),
    color: req(fd, "color") || "#6d5efc",
    items: JSON.stringify(items),
    notes: str(fd, "notes"),
    ownerId: str(fd, "ownerId"),
    assignees: fd.getAll("assignees").map(String).filter(Boolean).join(","),
  };

  if (id) await prisma.regulation.update({ where: { id }, data });
  else await prisma.regulation.create({ data });
  revalidatePath("/regulations");
}

export async function deleteRegulation(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");
  await prisma.regulation.delete({ where: { id: req(fd, "id") } });
  revalidatePath("/regulations");
}

/* ---------------- Замеры клиента и ссылки ---------------- */

export async function saveSnapshot(fd: FormData) {
  const user = await requireUser();
  if (!can.manageClients(user)) redirect("/no-access");
  const clientId = req(fd, "clientId");
  const client = await prisma.client.findFirst({
    where: { AND: [{ id: clientId }, clientScope(user)] },
  });
  if (!client) redirect("/no-access");

  const id = str(fd, "id");
  const data = {
    clientId,
    type: req(fd, "type") === "POINT_B" ? "POINT_B" : "POINT_A",
    takenAt: date(fd, "takenAt") ?? new Date(),
    leads: Math.round(n(fd, "leads")) || null,
    cpl: n(fd, "cpl") || null,
    adSpend: n(fd, "adSpend") || null,
    revenue: n(fd, "revenue") || null,
    conversion: n(fd, "conversion") || null,
    note: str(fd, "note"),
  };
  if (id) await prisma.clientSnapshot.update({ where: { id }, data });
  else await prisma.clientSnapshot.create({ data });
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteSnapshot(fd: FormData) {
  const user = await requireUser();
  if (!can.manageClients(user)) redirect("/no-access");
  const id = req(fd, "id");
  const snap = await prisma.clientSnapshot.findFirst({
    where: { AND: [{ id }, { client: clientScope(user) }] },
  });
  if (!snap) redirect("/no-access");
  await prisma.clientSnapshot.delete({ where: { id } });
  revalidatePath(`/clients/${snap.clientId}`);
}

export async function saveClientLink(fd: FormData) {
  const user = await requireUser();
  if (!can.manageClients(user)) redirect("/no-access");
  const clientId = req(fd, "clientId");
  const client = await prisma.client.findFirst({
    where: { AND: [{ id: clientId }, clientScope(user)] },
  });
  if (!client) redirect("/no-access");

  let url = req(fd, "url");
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  await prisma.clientLink.create({
    data: { clientId, title: req(fd, "title") || url, url, type: req(fd, "type") || "OTHER" },
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteClientLink(fd: FormData) {
  const user = await requireUser();
  if (!can.manageClients(user)) redirect("/no-access");
  const id = req(fd, "id");
  const link = await prisma.clientLink.findFirst({
    where: { AND: [{ id }, { client: clientScope(user) }] },
  });
  if (!link) redirect("/no-access");
  await prisma.clientLink.delete({ where: { id } });
  revalidatePath(`/clients/${link.clientId}`);
}

/**
 * Сгенерировать сотруднику новый пароль и вернуть его один раз.
 * В базе лежит только хеш, поэтому показать пароль повторно нельзя —
 * владелец копирует его сразу и передаёт человеку.
 */
export async function resetUserPassword(fd: FormData): Promise<string> {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/no-access");

  const id = req(fd, "id");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) redirect("/no-access");

  // Без похожих символов: 0/O и 1/l/I путают, когда пароль передают голосом.
  const abc = "abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  const password = Array.from(bytes, (b) => abc[b % abc.length]).join("");

  await prisma.user.update({
    where: { id },
    data: {
      passwordHash: await hashPassword(password),
      // Старые сессии этого сотрудника гасим: пароль сменился.
      passwordChangedAt: new Date(),
    },
  });
  revalidatePath("/team");
  return password;
}
