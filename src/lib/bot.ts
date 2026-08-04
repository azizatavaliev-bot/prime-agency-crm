import "server-only";
import { prisma } from "./prisma";
import { sendTg, editTg, escapeHtml, type TgButton } from "./telegram";
import { som, dateRu, monthKey, monthLabel, num } from "./format";
import { accountBalances, cashflow } from "./accounts";
import { getShares, split } from "./finance";
import { dict, labelOf } from "./dict";
import { daysToPayment } from "./payday";
import { deadlineBadge, closeOrReopenTask } from "./tasks";
import type { User } from "@prisma/client";

/* ------------------------------------------------------------------ */
/*  Права внутри бота                                                  */
/* ------------------------------------------------------------------ */

const isOwner = (u: User) => u.role === "OWNER";
/** Кто может вносить деньги: владелец и бухгалтер. */
const canMoney = (u: User) => u.role === "OWNER" || u.role === "ACCOUNTANT";
/** Кто видит прибыль владельца и доли команды. */
const canProfit = (u: User) => u.role === "OWNER";

/* ------------------------------------------------------------------ */
/*  Главное меню                                                       */
/* ------------------------------------------------------------------ */

export function mainMenu(user: User): TgButton[][] {
  const rows: TgButton[][] = [];
  if (canMoney(user)) {
    rows.push([
      { text: "💰 Отметить оплату", data: "pay:list:0" },
      { text: "🔴 Долги", data: "debts" },
    ]);
    rows.push([
      { text: "➖ Расход", data: "flow:EXPENSE" },
      { text: "➕ Приход", data: "flow:INCOME" },
    ]);
    rows.push([
      { text: "🏦 Остатки", data: "balance" },
      { text: "📊 Отчёт за месяц", data: "report" },
    ]);
    rows.push([{ text: "📅 Кто когда платит", data: "schedule" }]);
  }
  rows.push([
    { text: "🗂 Мои задачи", data: "tasks" },
    { text: "👤 Кто я", data: "me" },
  ]);
  return rows;
}

export function greeting(user: User) {
  const role = { OWNER: "владелец", ACCOUNTANT: "бухгалтер", TARGETOLOG: "таргетолог", ACCOUNT: "аккаунт-менеджер", CONTRACTOR: "подрядчик" }[user.role] ?? user.role;
  return `👋 <b>${escapeHtml(user.name)}</b> · ${role}\n\nВыберите действие:`;
}

/* ------------------------------------------------------------------ */
/*  Экраны                                                             */
/* ------------------------------------------------------------------ */

/** Финансовый отчёт за месяц. Бухгалтеру — без прибыли владельца. */
export async function reportScreen(user: User) {
  const month = monthKey();
  const flow = await cashflow(month);
  const payments = await prisma.payment.findMany({ where: { periodMonth: month } });
  const paid = payments.filter((p) => p.status === "PAID");
  const debt = payments.filter((p) => p.status !== "PAID");
  const expenses = await prisma.expense.findMany({ where: { periodMonth: month, status: "PAID" } });
  const spent = expenses.reduce((s, e) => s + e.amount, 0);

  const lines = [
    `📊 <b>Отчёт за ${monthLabel(month)}</b>`,
    ``,
    `📥 Приход: <b>${som(flow.income)}</b>`,
    `📤 Расход: <b>${som(flow.expense)}</b>`,
    `💵 Денежный поток: <b>${som(flow.profit)}</b>`,
    ``,
    `✅ Оплачено клиентами: ${som(paid.reduce((s, p) => s + p.amount, 0))} (${paid.length})`,
    `🔴 Ждём оплаты: ${som(debt.reduce((s, p) => s + p.amount, 0))} (${debt.length})`,
  ];

  if (canProfit(user)) {
    const ownerGross = paid.reduce((s, p) => s + p.ownerNet, 0);
    const team = paid.reduce((s, p) => s + p.execShare, 0);
    const reserve = paid.reduce((s, p) => s + p.reserve, 0);
    lines.push(
      ``,
      `👥 Доля команды: ${som(team)}`,
      `🏦 Резерв: ${som(reserve)}`,
      `💼 Ваша доля: ${som(ownerGross)}`,
      `🎯 <b>Чистая прибыль: ${som(ownerGross - spent)}</b> (после расходов)`
    );
  }

  return { text: lines.join("\n"), buttons: backMenu() };
}

/** Остатки по счетам. */
export async function balanceScreen() {
  const accounts = (await accountBalances()).filter((a) => a.active);
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const lines = [`🏦 <b>Остатки по счетам</b>`, ``];
  for (const a of accounts) {
    lines.push(`${a.low ? "⚠️" : "•"} ${escapeHtml(a.name)}: <b>${som(a.balance)}</b>`);
  }
  lines.push(``, `Всего: <b>${som(total)}</b>`);
  if (!accounts.length) lines.push("Счета ещё не заведены.");
  return { text: lines.join("\n"), buttons: backMenu() };
}

/** Список долгов и просроченных оплат. */
export async function debtsScreen() {
  const now = new Date();
  const list = await prisma.payment.findMany({
    where: { status: { in: ["PENDING", "DEBT"] } },
    include: { client: true },
    orderBy: { dueAt: "asc" },
    take: 15,
  });
  if (!list.length) return { text: "✅ Долгов нет — все счета закрыты.", buttons: backMenu() };

  const lines = [`🔴 <b>Долги и ожидаемые оплаты</b>`, ``];
  let total = 0;
  for (const p of list) {
    total += p.amount;
    const overdue = p.dueAt < now;
    const mark = overdue ? "❗️" : "•";
    const when = overdue
      ? `просрочено с ${dateRu(p.dueAt)}`
      : `до ${dateRu(p.dueAt)}`;
    lines.push(`${mark} ${escapeHtml(p.client.name)} — <b>${som(p.amount)}</b>, ${when}`);
  }
  lines.push(``, `Итого: <b>${som(total)}</b>`);
  return {
    text: lines.join("\n"),
    buttons: [[{ text: "💰 Отметить оплату", data: "pay:list:0" }], ...backMenu()],
  };
}

/** Календарь оплат: у кого какой день и сколько осталось. */
export async function scheduleScreen() {
  const clients = await prisma.client.findMany({
    where: { status: { in: ["TEST", "ACTIVE", "RISK"] }, paymentDay: { not: null } },
  });
  const sorted = clients
    .map((c) => ({ c, days: daysToPayment(c.paymentDay) }))
    .sort((a, b) => a.days - b.days);

  const lines = [`📅 <b>Календарь оплат</b>`, ``];
  for (const { c, days } of sorted) {
    const when = days === 0 ? "сегодня" : days === 1 ? "завтра" : `через ${days} дн.`;
    const mark = days <= 3 ? "🔴" : days <= 7 ? "🟡" : "🟢";
    lines.push(`${mark} ${escapeHtml(c.name)} — ${c.paymentDay} числа (${when}), ${som(c.avgCheck)}`);
  }
  if (!sorted.length) lines.push("Ни у кого не задан день оплаты.");
  return { text: lines.join("\n"), buttons: backMenu() };
}

/** Список неоплаченных счетов кнопками — для отметки оплаты. */
export async function payListScreen(page = 0) {
  const perPage = 6;
  const list = await prisma.payment.findMany({
    where: { status: { in: ["PENDING", "DEBT"] } },
    include: { client: true },
    orderBy: { dueAt: "asc" },
    skip: page * perPage,
    take: perPage + 1,
  });
  if (!list.length && page === 0)
    return { text: "✅ Все счета закрыты — отмечать нечего.", buttons: backMenu() };

  const hasMore = list.length > perPage;
  const rows: TgButton[][] = list.slice(0, perPage).map((p) => [
    {
      text: `${p.client.name} — ${Math.round(p.amount).toLocaleString("ru-RU")} сом`,
      data: `pay:pick:${p.id}`,
    },
  ]);
  const nav: TgButton[] = [];
  if (page > 0) nav.push({ text: "‹ Назад", data: `pay:list:${page - 1}` });
  if (hasMore) nav.push({ text: "Дальше ›", data: `pay:list:${page + 1}` });
  if (nav.length) rows.push(nav);

  return { text: "💰 <b>Выберите счёт, который оплатили:</b>", buttons: [...rows, ...backMenu()] };
}

/** Подтверждение конкретной оплаты. */
export async function payConfirmScreen(paymentId: string) {
  const p = await prisma.payment.findUnique({ where: { id: paymentId }, include: { client: true } });
  if (!p) return { text: "Счёт не найден.", buttons: backMenu() };
  const text = [
    `💰 <b>${escapeHtml(p.client.name)}</b>`,
    ``,
    `Сумма: <b>${som(p.amount)}</b>`,
    `Срок: ${dateRu(p.dueAt)}`,
    ``,
    `Отметить как оплаченный?`,
  ].join("\n");
  return {
    text,
    buttons: [
      [
        { text: "✅ Да, оплачен", data: `pay:do:${p.id}` },
        { text: "‹ Отмена", data: "pay:list:0" },
      ],
    ],
  };
}

/** Проведение оплаты. */
export async function payDo(paymentId: string, user: User) {
  const p = await prisma.payment.findUnique({ where: { id: paymentId }, include: { client: true } });
  if (!p) return { text: "Счёт не найден.", buttons: backMenu() };
  const now = new Date();
  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "PAID", paidAt: now, periodMonth: monthKey(now) },
  });
  // фиксируем, кто провёл оплату — чтобы в CRM было видно
  await prisma.notification.create({
    data: {
      userId: user.id,
      kind: "PAYMENT_DUE",
      title: `Оплата проведена: ${p.client.name}`,
      body: `${som(p.amount)} · через Telegram`,
      link: `/clients/${p.clientId}`,
      read: true,
    },
  });
  return {
    text: `✅ Оплата проведена\n\n<b>${escapeHtml(p.client.name)}</b> — ${som(p.amount)}`,
    buttons: [[{ text: "💰 Отметить ещё", data: "pay:list:0" }], ...backMenu()],
  };
}

/** Мои открытые задачи. */
/**
 * Список задач исполнителя. Каждая строка — с кнопкой «готово»,
 * чтобы задача закрывалась прямо из чата, не открывая CRM.
 */
export async function tasksScreen(user: User, filter: "active" | "today" | "overdue" = "active") {
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const where = {
    assigneeId: user.id,
    done: false,
    archivedAt: null,
    ...(filter === "today" ? { dueAt: { lte: endOfToday } } : {}),
    ...(filter === "overdue" ? { dueAt: { lt: new Date(now.toDateString()) } } : {}),
  };

  const tasks = await prisma.task.findMany({
    where,
    include: { client: true, checklist: true },
    orderBy: [{ dueAt: "asc" }],
    take: 8,
  });

  const tabs: TgButton[] = [
    { text: filter === "active" ? "• Все" : "Все", data: "tasks" },
    { text: filter === "today" ? "• Сегодня" : "Сегодня", data: "tasks:today" },
    { text: filter === "overdue" ? "• Просрочено" : "Просрочено", data: "tasks:overdue" },
  ];

  if (!tasks.length)
    return {
      text:
        filter === "overdue"
          ? "✅ Просроченных задач нет."
          : filter === "today"
            ? "✅ На сегодня всё закрыто."
            : "🎉 Открытых задач нет.",
      buttons: [tabs, ...backMenu()],
    };

  const lines = [`🗂 <b>Ваши задачи</b>`, ``];
  const buttons: TgButton[][] = [tabs];

  for (const t of tasks) {
    const b = deadlineBadge(t.dueAt, t.done);
    const check = t.checklist.length
      ? ` · ${t.checklist.filter((i) => i.done).length}/${t.checklist.length}`
      : "";
    lines.push(
      `${PRIORITY_EMOJI[t.priority] ?? "➖"} <b>${escapeHtml(t.title)}</b>${
        t.client ? `\n   👤 ${escapeHtml(t.client.name)}` : ""
      }\n   ${b.emoji} ${b.text}${check}`
    );
    buttons.push([
      { text: `✅ ${t.title.slice(0, 22)}`, data: `t_done_${t.id}` },
      { text: "🔄", data: `t_prog_${t.id}` },
    ]);
  }

  return { text: lines.join("\n\n"), buttons: [...buttons, ...backMenu()] };
}

const PRIORITY_EMOJI: Record<string, string> = {
  URGENT: "🔥",
  HIGH: "⬆️",
  MEDIUM: "➖",
  LOW: "⬇️",
};

function backMenu(): TgButton[][] {
  return [[{ text: "‹ Меню", data: "menu" }]];
}

/* ------------------------------------------------------------------ */
/*  Пошаговый ввод: расход и приход                                    */
/* ------------------------------------------------------------------ */

type SessionData = {
  amount?: number;
  title?: string;
  category?: string;
  accountId?: string;
};

async function getSession(chatId: string) {
  return prisma.botSession.findUnique({ where: { chatId } });
}

async function setSession(chatId: string, flow: string, step: string, data: SessionData) {
  return prisma.botSession.upsert({
    where: { chatId },
    create: { chatId, flow, step, data: JSON.stringify(data) },
    update: { flow, step, data: JSON.stringify(data) },
  });
}

export async function clearSession(chatId: string) {
  await prisma.botSession.deleteMany({ where: { chatId } });
}

/** Старт ввода операции: спрашиваем сумму. */
export async function startFlow(chatId: string, flow: "EXPENSE" | "INCOME") {
  await setSession(chatId, flow, "amount", {});
  const what = flow === "EXPENSE" ? "расхода" : "прихода";
  return {
    text: `Введите сумму ${what} в сомах.\n\nНапример: <code>4500</code>`,
    buttons: [[{ text: "✕ Отмена", data: "cancel" }]],
  };
}

/** Обработка текста внутри активного диалога. Возвращает null, если диалога нет. */
export async function handleFlowText(chatId: string, text: string) {
  const session = await getSession(chatId);
  if (!session) return null;
  const data: SessionData = JSON.parse(session.data);
  const flow = session.flow as "EXPENSE" | "INCOME";

  if (session.step === "amount") {
    const amount = Number(text.replace(/\s/g, "").replace(",", "."));
    if (!amount || amount <= 0)
      return { text: "Нужна сумма числом. Например: <code>4500</code>", buttons: [[{ text: "✕ Отмена", data: "cancel" }]] };
    data.amount = amount;
    await setSession(chatId, flow, "title", data);
    return {
      text: `Сумма: <b>${som(amount)}</b>\n\nТеперь напишите, за что это.\nНапример: <code>Аренда офиса</code>`,
      buttons: [[{ text: "✕ Отмена", data: "cancel" }]],
    };
  }

  if (session.step === "title") {
    data.title = text.trim().slice(0, 120);
    await setSession(chatId, flow, "category", data);
    const cats = await dict(flow === "EXPENSE" ? "EXPENSE_CATEGORY" : "INCOME_CATEGORY");
    const rows: TgButton[][] = cats.map((c) => [{ text: c.name, data: `cat:${c.key}` }]);
    return {
      text: `«${escapeHtml(data.title)}» — ${som(data.amount ?? 0)}\n\nВыберите категорию:`,
      buttons: [...rows, [{ text: "✕ Отмена", data: "cancel" }]],
    };
  }

  return { text: "Не понял. Выберите вариант кнопкой ниже.", buttons: [[{ text: "✕ Отмена", data: "cancel" }]] };
}

/** Категория выбрана — предлагаем счёт. */
export async function handleCategoryPick(chatId: string, categoryKey: string) {
  const session = await getSession(chatId);
  if (!session) return { text: "Диалог устарел, начните заново.", buttons: backMenu() };
  const data: SessionData = JSON.parse(session.data);
  data.category = categoryKey;
  await setSession(chatId, session.flow, "account", data);

  const accounts = await prisma.account.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const rows: TgButton[][] = accounts.map((a) => [{ text: a.name, data: `acc:${a.id}` }]);
  rows.push([{ text: "— без счёта —", data: "acc:none" }]);
  return {
    text: `Категория выбрана.\n\nС какого счёта${session.flow === "INCOME" ? " пришли деньги" : " платим"}?`,
    buttons: [...rows, [{ text: "✕ Отмена", data: "cancel" }]],
  };
}

/** Счёт выбран — сохраняем операцию в базу. */
export async function handleAccountPick(chatId: string, accountId: string, user: User) {
  const session = await getSession(chatId);
  if (!session) return { text: "Диалог устарел, начните заново.", buttons: backMenu() };
  const data: SessionData = JSON.parse(session.data);
  const now = new Date();
  const account = accountId === "none" ? null : accountId;

  if (session.flow === "EXPENSE") {
    await prisma.expense.create({
      data: {
        title: data.title ?? "Расход",
        category: data.category ?? "OTHER",
        amount: data.amount ?? 0,
        status: "PAID",
        method: "TRANSFER",
        spentAt: now,
        periodMonth: monthKey(now),
        accountId: account,
        comment: `внесено через бота (${user.name})`,
      },
    });
  } else {
    await prisma.income.create({
      data: {
        title: data.title ?? "Приход",
        category: data.category ?? "OTHER",
        amount: data.amount ?? 0,
        receivedAt: now,
        periodMonth: monthKey(now),
        accountId: account,
        comment: `внесено через бота (${user.name})`,
      },
    });
  }

  await clearSession(chatId);
  const cats = await dict(session.flow === "EXPENSE" ? "EXPENSE_CATEGORY" : "INCOME_CATEGORY");
  const icon = session.flow === "EXPENSE" ? "➖" : "➕";
  return {
    text: [
      `${icon} <b>Записано</b>`,
      ``,
      `${escapeHtml(data.title ?? "")}`,
      `Сумма: <b>${som(data.amount ?? 0)}</b>`,
      `Категория: ${escapeHtml(labelOf(cats, data.category ?? ""))}`,
    ].join("\n"),
    buttons: [
      [
        { text: "➖ Ещё расход", data: "flow:EXPENSE" },
        { text: "➕ Ещё приход", data: "flow:INCOME" },
      ],
      ...backMenu(),
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  Роутер обновлений                                                  */
/* ------------------------------------------------------------------ */

export type BotScreen = { text: string; buttons?: TgButton[][] };

/** Обработка нажатия на кнопку. */
export async function handleCallback(
  user: User,
  chatId: string,
  data: string
): Promise<BotScreen> {
  const money = canMoney(user);

  if (data === "menu") {
    await clearSession(chatId);
    return { text: greeting(user), buttons: mainMenu(user) };
  }
  if (data === "cancel") {
    await clearSession(chatId);
    return { text: "Отменил. Выберите действие:", buttons: mainMenu(user) };
  }
  if (data === "me")
    return {
      text: `👤 <b>${escapeHtml(user.name)}</b>\n${escapeHtml(user.email)}\nРоль: ${user.role}`,
      buttons: backMenu(),
    };
  if (data === "tasks") return tasksScreen(user);
  if (data === "tasks:today") return tasksScreen(user, "today");
  if (data === "tasks:overdue") return tasksScreen(user, "overdue");
  if (data === "t_mine") return tasksScreen(user);

  // Управление задачей прямо из чата — как в Unity и FADAMOS.
  if (data.startsWith("t_done_") || data.startsWith("t_undone_") || data.startsWith("t_prog_")) {
    const id = data.replace(/^t_(done|undone|prog)_/, "");
    const t = await prisma.task.findUnique({ where: { id } });
    if (!t) return { text: "Задача не найдена.", buttons: backMenu() };
    // Трогать можно только свои задачи, владелец — любые.
    if (user.role !== "OWNER" && t.assigneeId !== user.id)
      return { text: "Это не ваша задача.", buttons: backMenu() };

    if (data.startsWith("t_prog_")) {
      await prisma.task.update({ where: { id }, data: { startedAt: new Date() } });
      return tasksScreen(user);
    }
    await closeOrReopenTask(t, !data.startsWith("t_undone_"));
    return tasksScreen(user);
  }

  // всё, что ниже — только для владельца и бухгалтера
  if (!money) return { text: "Этот раздел доступен владельцу и бухгалтеру.", buttons: backMenu() };

  if (data === "report") return reportScreen(user);
  if (data === "balance") return balanceScreen();
  if (data === "debts") return debtsScreen();
  if (data === "schedule") return scheduleScreen();

  if (data.startsWith("pay:list:")) return payListScreen(Number(data.split(":")[2]) || 0);
  if (data.startsWith("pay:pick:")) return payConfirmScreen(data.split(":")[2]);
  if (data.startsWith("pay:do:")) return payDo(data.split(":")[2], user);

  if (data.startsWith("flow:")) {
    const flow = data.split(":")[1] as "EXPENSE" | "INCOME";
    return startFlow(chatId, flow);
  }
  if (data.startsWith("cat:")) return handleCategoryPick(chatId, data.slice(4));
  if (data.startsWith("acc:")) return handleAccountPick(chatId, data.slice(4), user);

  return { text: greeting(user), buttons: mainMenu(user) };
}

export { canMoney, canProfit, isOwner, getShares, split, num };
