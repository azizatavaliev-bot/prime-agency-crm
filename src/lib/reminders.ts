import "server-only";
import { prisma } from "./prisma";
import { notifyUser, sendTg, escapeHtml } from "./telegram";
import { reportMetrics, getNotify } from "./finance";
import { generateDuePayments } from "./actions";
import { daysToContractEnd } from "./payday";
import { som, dateRu } from "./format";
import { deadlineBadge, isOverdue } from "./tasks";
import { RENEWAL_MODE } from "./constants";

/**
 * Прогон напоминаний «по заходу»: внешнего крона может не быть, поэтому
 * запускаем при обращении к системе, но не чаще раза в час — иначе каждый
 * переход по страницам дёргал бы всю базу.
 */
export async function runRemindersIfDue(): Promise<boolean> {
  const KEY = "lastRemindersRun";
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  const last = row ? Number(row.value) : 0;
  const hour = 60 * 60 * 1000;
  if (Date.now() - last < hour) return false;

  // Отметку ставим до прогона: два одновременных захода не должны
  // запустить рассылку дважды.
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: String(Date.now()) },
    update: { value: String(Date.now()) },
  });

  await runReminders();

  // Утренний дайджест — раз в день, не раньше 8 утра по Бишкеку.
  const hourBishkek = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bishkek",
      hour12: false,
      hour: "numeric",
    }).format(new Date())
  );
  if (hourBishkek >= 8) await runTaskDigest();
  return true;
}

/** Уже отправляли такое уведомление? Защита от дублей по техническому ключу. */
const alreadySent = async (dedupeKey: string) =>
  Boolean(await prisma.notification.findFirst({ where: { dedupeKey } }));

/**
 * Полный прогон напоминаний. Дёргается кроном (GET /api/cron/reminders?key=…)
 * и при заходе владельца на дашборд. Дубли гасятся по dedupeKey (техническое
 * поле, не показывается пользователю — в отличие от заголовка уведомления).
 */
export async function runReminders() {
  const log: string[] = [];
  const today = new Date();

  const cfg = await getNotify();
  const owners = await prisma.user.findMany({ where: { role: "OWNER", active: true } });
  const ownerIds = cfg.notifyOwner ? owners.map((o) => o.id) : [];

  /* 0. Сначала заводим ожидаемые платежи по дню оплаты клиента */
  const generated = await generateDuePayments();
  if (generated) log.push(`создано плановых оплат: ${generated}`);

  /* 1. Оплаты: за N дней до срока и просрочка */
  const soon = new Date(Date.now() + cfg.paymentDays * 86400000);
  const duePayments = await prisma.payment.findMany({
    where: { status: { in: ["PENDING", "DEBT"] }, dueAt: { lte: soon } },
    include: { client: true },
  });
  for (const p of duePayments) {
    const overdue = p.dueAt < today;
    const dedupeKey = `pay-${p.id}-${overdue ? "late" : "soon"}`;
    if (await alreadySent(dedupeKey)) continue;
    const targets = [...ownerIds, cfg.notifyTeam ? p.client.accountId : null].filter(
      Boolean
    ) as string[];
    for (const uid of targets)
      await notifyUser(uid, {
        kind: "PAYMENT_DUE",
        title: `${overdue ? "Просрочена оплата" : "Скоро оплата"}: ${p.client.name}`,
        body: `${som(p.amount)} · срок ${dateRu(p.dueAt)}`,
        link: `/clients/${p.clientId}`,
        dedupeKey,
      });
    log.push(`оплата ${p.client.name}`);
  }

  /* 2. Отчёты по таргету: если по активному проекту нет отчёта больше 7 дней */
  const activeClients = await prisma.client.findMany({
    where: { status: { in: ["TEST", "ACTIVE", "RISK"] }, services: { contains: "TARGET" } },
    include: { reports: { orderBy: { periodTo: "desc" }, take: 1 } },
  });
  for (const c of activeClients) {
    const last = c.reports[0];
    const days = last ? Math.floor((today.getTime() - last.periodTo.getTime()) / 86400000) : 999;
    if (days < cfg.reportDays) continue;
    const dedupeKey = `rep-${c.id}-${today.toISOString().slice(0, 10)}`;
    if (await alreadySent(dedupeKey)) continue;
    const targets = [cfg.notifyTeam ? c.targetologId : null, ...ownerIds].filter(Boolean) as string[];
    for (const uid of targets)
      await notifyUser(uid, {
        kind: "REPORT_DUE",
        title: `Нужен отчёт по проекту ${c.name}`,
        body: last ? `Последний отчёт ${dateRu(last.periodTo)} — ${days} дн. назад` : "Отчётов ещё не было",
        link: `/clients/${c.id}`,
        dedupeKey,
      });
    log.push(`отчёт ${c.name}`);
  }

  /* 3. Задачи: дедлайн сегодня/завтра или просрочен */
  const tasks = await prisma.task.findMany({
    where: {
      done: false,
      dueAt: { lte: new Date(Date.now() + cfg.taskDays * 86400000) },
      assigneeId: { not: null },
    },
    include: { client: true },
  });
  for (const t of cfg.notifyTeam ? tasks : []) {
    const overdue = t.dueAt! < today;
    const dedupeKey = `task-${t.id}-${today.toISOString().slice(0, 10)}`;
    if (await alreadySent(dedupeKey)) continue;
    await notifyUser(t.assigneeId!, {
      kind: "TASK_DUE",
      title: `${overdue ? "Просрочена задача" : "Дедлайн задачи"}: ${t.title}`,
      body: `${t.client?.name ?? "без клиента"} · срок ${dateRu(t.dueAt)}`,
      link: `/tasks?board=${t.board}`,
      dedupeKey,
    });
    log.push(`задача ${t.title}`);
  }

  /* 4. Плановые расходы: срок сегодня/завтра или просрочен */
  const dueExpenses = await prisma.expense.findMany({
    where: { status: "PLANNED", spentAt: { lte: new Date(Date.now() + cfg.expenseDays * 86400000) } },
  });
  for (const e of dueExpenses) {
    const overdue = e.spentAt < today;
    const dedupeKey = `exp-${e.id}-${today.toISOString().slice(0, 10)}`;
    if (await alreadySent(dedupeKey)) continue;
    for (const uid of ownerIds)
      await notifyUser(uid, {
        kind: "PAYMENT_DUE",
        title: `${overdue ? "Просрочен расход" : "Скоро расход"}: ${e.title}`,
        body: `${som(e.amount)} · срок ${dateRu(e.spentAt)}`,
        link: "/expenses",
        dedupeKey,
      });
    log.push(`расход ${e.title}`);
  }

  /* 4.5 Договор заканчивается через 30 дней или уже истёк */
  const contractClients = await prisma.client.findMany({
    where: { status: { in: ["TEST", "ACTIVE", "RISK"] }, contractEnd: { not: null } },
  });
  for (const c of contractClients) {
    const left = daysToContractEnd(c.contractEnd);
    if (left === null || left > 30) continue;
    const dedupeKey = `contract-${c.id}-${today.toISOString().slice(0, 7)}`;
    if (await alreadySent(dedupeKey)) continue;
    const targets = [...ownerIds, cfg.notifyTeam ? c.accountId : null].filter(Boolean) as string[];
    for (const uid of targets)
      await notifyUser(uid, {
        kind: "PAYMENT_DUE",
        title: `${left < 0 ? "Договор истёк" : "Договор заканчивается"}: ${c.name}`,
        // Что делать дальше — из условий проекта, чтобы не лезть в карточку.
        body: `${dateRu(c.contractEnd)}${left >= 0 ? ` · осталось ${left} дн.` : ""} — ${
          c.renewalMode
            ? RENEWAL_MODE[c.renewalMode as keyof typeof RENEWAL_MODE].toLowerCase()
            : "решите, продлеваем ли"
        }`,
        link: `/clients/${c.id}`,
        dedupeKey,
      });
    log.push(`договор ${c.name}`);
  }

  /* 4.6 Пора пересматривать цену по проекту */
  const priceReviewClients = await prisma.client.findMany({
    where: {
      status: { in: ["TEST", "ACTIVE", "RISK"] },
      priceReviewAt: { not: null, lte: new Date(Date.now() + 7 * 86400000) },
    },
  });
  for (const c of priceReviewClients) {
    const dedupeKey = `price-${c.id}-${c.priceReviewAt!.toISOString().slice(0, 10)}`;
    if (await alreadySent(dedupeKey)) continue;
    for (const uid of ownerIds)
      await notifyUser(uid, {
        kind: "PAYMENT_DUE",
        title: `Пересмотр цены: ${c.name}`,
        body: `Договаривались вернуться к цене ${dateRu(c.priceReviewAt)} · сейчас ${som(c.avgCheck)} в месяц`,
        link: `/clients/${c.id}`,
        dedupeKey,
      });
    log.push(`пересмотр цены ${c.name}`);
  }

  /* 5. CPL: последний отчёт вне цели */
  const recentReports = await prisma.adReport.findMany({
    where: { periodTo: { gte: new Date(Date.now() - 7 * 86400000) } },
    include: { client: true },
  });
  for (const r of cfg.cplAlert ? recentReports : []) {
    const m = reportMetrics(r);
    if (m.inTarget !== false) continue;
    const dedupeKey = `cpl-${r.id}`;
    if (await alreadySent(dedupeKey)) continue;
    const targets = [cfg.notifyTeam ? r.client.targetologId : null, ...ownerIds].filter(
      Boolean
    ) as string[];
    for (const uid of targets)
      await notifyUser(uid, {
        kind: "CPL_ALERT",
        title: `Превышен порог CPL: ${r.client.name}`,
        body: `CPL ${som(m.cpl ?? 0)} при цели ${som(r.targetCpl)}`,
        link: `/clients/${r.clientId}`,
        dedupeKey,
      });
    log.push(`CPL ${r.client.name}`);
  }

  return log;
}

/**
 * Утренний дайджест по задачам — каждому исполнителю в Telegram.
 * Отдельно от runReminders: тот шлёт точечные напоминания по каждой задаче,
 * а дайджест — одна сводка за день, чтобы не заваливать чат.
 */
export async function runTaskDigest() {
  const log: string[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(today.getTime() + 86400000 - 1);
  const stamp = today.toISOString().slice(0, 10);

  const users = await prisma.user.findMany({
    where: { active: true, NOT: { tgChatId: null } },
  });

  for (const u of users) {
    const dedupeKey = `digest-${u.id}-${stamp}`;
    if (await alreadySent(dedupeKey)) continue;

    const tasks = await prisma.task.findMany({
      where: { assigneeId: u.id, done: false, archivedAt: null },
      include: { client: true },
      orderBy: { dueAt: "asc" },
    });
    if (!tasks.length) continue;

    const overdue = tasks.filter((t) => isOverdue(t.dueAt, t.done));
    const dueToday = tasks.filter((t) => t.dueAt && t.dueAt >= today && t.dueAt <= endOfToday);

    const lines = [`☀️ <b>Доброе утро, ${escapeHtml(u.name)}!</b>`, ``];
    lines.push(`Активных задач: <b>${tasks.length}</b>`);
    if (overdue.length) lines.push(`⚠️ Просрочено: <b>${overdue.length}</b>`);
    if (dueToday.length) lines.push(`🔥 Срок сегодня: <b>${dueToday.length}</b>`);

    const focus = [...overdue, ...dueToday].slice(0, 5);
    if (focus.length) {
      lines.push(``, `<b>На что смотреть:</b>`);
      for (const t of focus) {
        const b = deadlineBadge(t.dueAt, false);
        lines.push(
          `${b.emoji} ${escapeHtml(t.title)}${t.client ? ` — ${escapeHtml(t.client.name)}` : ""}`
        );
      }
    }

    await sendTg(u.tgChatId!, lines.join("\n"), undefined, [
      [{ text: "📋 Мои задачи", data: "tasks" }],
      [{ text: "⚠️ Просроченные", data: "tasks:overdue" }],
    ]);
    await prisma.notification.create({
      data: {
        userId: u.id,
        kind: "TASK_DUE",
        title: `Задач на сегодня: ${tasks.length}`,
        body: overdue.length ? `Просрочено: ${overdue.length}` : undefined,
        link: "/tasks",
        dedupeKey,
      },
    });
    log.push(`дайджест ${u.name}`);
  }

  return log;
}
