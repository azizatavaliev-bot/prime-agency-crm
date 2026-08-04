"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { requireUser, hashPassword } from "./auth";
import { can, clientScope, taskScope } from "./access";
import { getShares, split, reportMetrics } from "./finance";
import { monthKey } from "./format";

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  return v === null || v === "" ? null : String(v);
}
function req(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}
function n(fd: FormData, k: string) {
  return Number(String(fd.get(k) ?? "0").replace(/\s/g, "")) || 0;
}
function date(fd: FormData, k: string) {
  const v = str(fd, k);
  return v ? new Date(v) : null;
}

async function notify(userIds: (string | null | undefined)[], data: { kind: string; title: string; body?: string; link?: string }) {
  const ids = [...new Set(userIds.filter(Boolean) as string[])];
  if (!ids.length) return;
  await prisma.notification.createMany({
    data: ids.map((userId) => ({ userId, ...data })),
  });
}

async function owners() {
  const list = await prisma.user.findMany({ where: { role: "OWNER", active: true } });
  return list.map((u) => u.id);
}

/* ---------------- Клиенты ---------------- */

export async function saveClient(fd: FormData) {
  const user = await requireUser();
  if (!can.manageClients(user)) redirect("/no-access");

  const id = str(fd, "id");
  const services = fd.getAll("services").map(String).join(",");
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
    targetologId: str(fd, "targetologId"),
    accountId: user.role === "ACCOUNT" ? user.id : str(fd, "accountId"),
    churnedAt: req(fd, "status") === "CHURNED" ? new Date() : null,
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
  if (user.role !== "OWNER") redirect("/no-access");
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
  const s = split(kind, amount, shares);

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
    execUserId: kind === "SUBSCRIPTION" ? client.targetologId : str(fd, "execUserId"),
    accountId: str(fd, "accountId"),
    ...s,
  };

  if (id) await prisma.payment.update({ where: { id }, data });
  else await prisma.payment.create({ data });

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
  if (user.role !== "OWNER") redirect("/no-access");
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

  const data = {
    clientId,
    authorId: user.id,
    periodFrom: date(fd, "periodFrom") ?? new Date(),
    periodTo: date(fd, "periodTo") ?? new Date(),
    budget: n(fd, "budget"),
    spent: n(fd, "spent"),
    leads: Math.round(n(fd, "leads")),
    actions: Math.round(n(fd, "actions")),
    targetCpl: n(fd, "targetCpl"),
    targetCpa: n(fd, "targetCpa") || null,
    bundles: str(fd, "bundles"),
    comment: str(fd, "comment"),
  };
  const id = str(fd, "id");
  if (id) await prisma.adReport.update({ where: { id }, data });
  else await prisma.adReport.create({ data });

  const m = reportMetrics(data);
  if (m.inTarget === false) {
    await notify([...(await owners()), client.targetologId, client.accountId], {
      kind: "CPL_ALERT",
      title: `Превышен порог CPL — ${client.name}`,
      body: `CPL ${Math.round(m.cpl ?? 0)} сом при цели ${Math.round(data.targetCpl)} сом`,
      link: `/clients/${clientId}`,
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
    stage: req(fd, "stage") || "BRIEF",
    clientId: str(fd, "clientId"),
    assigneeId: str(fd, "assigneeId"),
    dueAt: date(fd, "dueAt"),
    comment: str(fd, "comment"),
  };
  if (id) {
    const t = await prisma.task.findFirst({ where: { AND: [{ id }, taskScope(user)] } });
    if (!t) redirect("/no-access");
    await prisma.task.update({ where: { id }, data });
  } else {
    if (user.role === "CONTRACTOR") redirect("/no-access");
    const created = await prisma.task.create({ data });
    if (data.assigneeId && data.assigneeId !== user.id)
      await notify([data.assigneeId], {
        kind: "NEW_LEAD",
        title: `Новая задача: ${data.title}`,
        link: `/tasks?board=${data.board}`,
      });
    void created;
  }
  revalidatePath("/tasks");
}

export async function moveTask(fd: FormData) {
  const user = await requireUser();
  const id = req(fd, "id");
  const t = await prisma.task.findFirst({ where: { AND: [{ id }, taskScope(user)] } });
  if (!t) redirect("/no-access");
  await prisma.task.update({ where: { id }, data: { stage: req(fd, "stage") } });
  revalidatePath("/tasks");
}

export async function toggleTask(fd: FormData) {
  const user = await requireUser();
  const id = req(fd, "id");
  const t = await prisma.task.findFirst({ where: { AND: [{ id }, taskScope(user)] } });
  if (!t) redirect("/no-access");
  await prisma.task.update({ where: { id }, data: { done: !t.done } });
  revalidatePath("/tasks");
}

export async function deleteTask(fd: FormData) {
  const user = await requireUser();
  const id = req(fd, "id");
  const t = await prisma.task.findFirst({ where: { AND: [{ id }, taskScope(user)] } });
  if (!t || user.role === "CONTRACTOR") redirect("/no-access");
  await prisma.task.delete({ where: { id } });
  revalidatePath("/tasks");
}

/* ---------------- Команда ---------------- */

export async function saveUser(fd: FormData) {
  const user = await requireUser();
  if (!can.manageTeam(user)) redirect("/no-access");
  const id = str(fd, "id");
  const password = str(fd, "password");
  const base = {
    email: req(fd, "email").toLowerCase(),
    name: req(fd, "name"),
    role: req(fd, "role"),
    rate: n(fd, "rate") || null,
    rateType: req(fd, "rateType") || "PERCENT",
    projectLimit: Math.round(n(fd, "projectLimit")) || 5,
    active: fd.get("active") !== null,
  };
  if (id) {
    await prisma.user.update({
      where: { id },
      data: password ? { ...base, passwordHash: await hashPassword(password) } : base,
    });
  } else {
    await prisma.user.create({
      data: { ...base, passwordHash: await hashPassword(password || "prime2026") },
    });
  }
  revalidatePath("/team");
}

/* ---------------- Настройки и уведомления ---------------- */

export async function saveSettings(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/no-access");
  const entries: [string, number][] = [
    ["targetologShare", n(fd, "targetologShare") / 100],
    ["devShare", n(fd, "devShare") / 100],
    ["reserveShare", n(fd, "reserveShare") / 100],
    ["projectLimit", Math.round(n(fd, "projectLimit"))],
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
  if (user.role !== "OWNER") redirect("/no-access");
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


/* ---------------- Участники проекта и ставки ---------------- */

export async function saveMember(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/no-access");
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

  // синхронизируем основного ответственного в карточке
  if (role === "TARGETOLOG") await prisma.client.update({ where: { id: clientId }, data: { targetologId: userId } });
  if (role === "ACCOUNT") await prisma.client.update({ where: { id: clientId }, data: { accountId: userId } });

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
  if (user.role !== "OWNER") redirect("/no-access");
  const id = req(fd, "id");
  const m = await prisma.clientMember.findUnique({ where: { id } });
  await prisma.clientMember.delete({ where: { id } });
  if (m) revalidatePath(`/clients/${m.clientId}`);
  revalidatePath("/clients");
  revalidatePath("/team");
}

/* ---------------- Цели ---------------- */

export async function saveGoal(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/no-access");
  const clientId = str(fd, "clientId");
  const month = req(fd, "month") || monthKey();
  const metric = req(fd, "metric");
  const data = { clientId, month, metric, target: n(fd, "target"), comment: str(fd, "comment") };
  const existing = await prisma.goal.findFirst({ where: { clientId, month, metric } });
  if (existing) await prisma.goal.update({ where: { id: existing.id }, data });
  else await prisma.goal.create({ data });
  revalidatePath("/analytics");
  revalidatePath("/dashboard");
  if (clientId) revalidatePath(`/clients/${clientId}`);
}

export async function deleteGoal(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/no-access");
  await prisma.goal.delete({ where: { id: req(fd, "id") } });
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
  if (user.role !== "OWNER") redirect("/no-access");
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
  if (user.role !== "OWNER") redirect("/no-access");
  const id = req(fd, "id");
  const now = new Date();
  await prisma.expense.update({
    where: { id },
    data: { status: "PAID", spentAt: now, periodMonth: monthKey(now) },
  });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function deleteExpense(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/no-access");
  await prisma.expense.delete({ where: { id: req(fd, "id") } });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}

/** Переносит все регулярные расходы месяца в следующий месяц как запланированные. */
export async function repeatExpenses(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/no-access");
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
  if (user.role !== "OWNER") redirect("/no-access");
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
  if (user.role !== "OWNER") redirect("/no-access");
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
  if (user.role !== "OWNER") redirect("/no-access");
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
  if (user.role !== "OWNER") redirect("/no-access");
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
  if (user.role !== "OWNER") redirect("/no-access");
  await prisma.income.delete({ where: { id: req(fd, "id") } });
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function saveTransfer(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/no-access");
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
  if (user.role !== "OWNER") redirect("/no-access");
  await prisma.transfer.delete({ where: { id: req(fd, "id") } });
  revalidatePath("/finance");
}

export async function saveDictItem(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/no-access");
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
  if (user.role !== "OWNER") redirect("/no-access");
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
  if (user.role !== "OWNER") redirect("/no-access");
  const id = req(fd, "id");
  const item = await prisma.dictItem.findUnique({ where: { id } });
  if (!item) return;
  await prisma.dictItem.update({ where: { id }, data: { active: !item.active } });
  revalidateAll();
}

/** Сдвинуть значение справочника вверх или вниз. */
export async function moveDictItem(fd: FormData) {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/no-access");
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
    const s = split("SUBSCRIPTION", c.avgCheck, shares);
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
