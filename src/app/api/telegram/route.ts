import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTg, editTg, answerCallback } from "@/lib/telegram";
import {
  greeting,
  mainMenu,
  handleCallback,
  handleFlowText,
  clearSession,
  reportScreen,
  balanceScreen,
  debtsScreen,
  scheduleScreen,
  payListScreen,
  tasksScreen,
  startFlow,
  canMoney,
  type BotScreen,
} from "@/lib/bot";

/**
 * Вебхук бота: привязка аккаунта, текстовые команды и кнопки.
 * Владелец и бухгалтер могут вносить оплаты, расходы и приходы прямо из чата.
 */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret)
    return new NextResponse("forbidden", { status: 403 });

  const update = await req.json().catch(() => null);

  /* ---------- нажатие на кнопку ---------- */
  if (update?.callback_query) {
    const cq = update.callback_query;
    const chatId = String(cq.message?.chat?.id ?? "");
    const messageId = cq.message?.message_id as number | undefined;
    const user = await prisma.user.findFirst({ where: { tgChatId: chatId } });

    await answerCallback(cq.id);
    if (!user) {
      await sendTg(chatId, "Аккаунт не привязан. Отправьте код из CRM → «Профиль».");
      return NextResponse.json({ ok: true });
    }
    if (!user.active) {
      await sendTg(chatId, "Ваш доступ отключён. Обратитесь к владельцу.");
      return NextResponse.json({ ok: true });
    }

    const screen = await handleCallback(user, chatId, String(cq.data ?? ""));
    if (messageId) await editTg(chatId, messageId, screen.text, undefined, screen.buttons);
    else await sendTg(chatId, screen.text, undefined, screen.buttons);
    return NextResponse.json({ ok: true });
  }

  /* ---------- обычное сообщение ---------- */
  const msg = update?.message;
  if (!msg?.chat?.id) return NextResponse.json({ ok: true });

  const chatId = String(msg.chat.id);
  const text = String(msg.text ?? "").trim();

  if (/^\/start/i.test(text)) {
    const code = text.split(/\s+/)[1];
    if (code) return NextResponse.json(await link(chatId, code));
    const existing = await prisma.user.findFirst({ where: { tgChatId: chatId } });
    if (existing) {
      await sendTg(chatId, greeting(existing), undefined, mainMenu(existing));
    } else {
      await sendTg(
        chatId,
        "👋 Это бот <b>Prime Agency</b>.\n\nЧерез него можно отмечать оплаты, вносить расходы и смотреть отчёты.\n\nЧтобы привязать аккаунт: CRM → «Профиль» → «Подключить Telegram», затем отправьте сюда код."
      );
    }
    return NextResponse.json({ ok: true });
  }

  const user = await prisma.user.findFirst({ where: { tgChatId: chatId } });

  // код привязки — до проверки авторизации
  if (!user && /^[A-Z0-9]{6}$/i.test(text))
    return NextResponse.json(await link(chatId, text.toUpperCase()));

  if (!user) {
    await sendTg(chatId, "Аккаунт не привязан. Отправьте код из CRM → «Профиль».");
    return NextResponse.json({ ok: true });
  }
  if (!user.active) {
    await sendTg(chatId, "Ваш доступ отключён. Обратитесь к владельцу.");
    return NextResponse.json({ ok: true });
  }

  /* ---------- команды ---------- */
  if (/^\/help/i.test(text)) {
    // Раньше /help открывал то же меню — про сами команды узнать было неоткуда.
    const money = user.role === "SUPER_ADMIN" || user.role === "ADMIN" || user.role === "ACCOUNTANT";
    const lines = [
      "<b>Что умеет бот</b>",
      "",
      "/menu — главное меню кнопками",
      "/tasks — мои задачи, закрываются прямо в чате",
      "/me — кто я в системе",
    ];
    if (money)
      lines.push(
        "/report — отчёт за месяц",
        "/balance — остатки на счетах",
        "/debts — кто не оплатил",
        "/schedule — кто когда платит",
        "/pay — отметить оплату",
        "/expense — записать расход",
        "/income — записать приход"
      );
    lines.push("", "/stop — отвязать этот чат от аккаунта");
    await sendTg(chatId, lines.join("\n"), undefined, mainMenu(user));
    return NextResponse.json({ ok: true });
  }
  if (/^\/menu/i.test(text)) {
    await sendTg(chatId, greeting(user), undefined, mainMenu(user));
    return NextResponse.json({ ok: true });
  }
  if (/^\/me/i.test(text)) {
    await sendTg(chatId, `👤 <b>${user.name}</b>\n${user.email}\nРоль: ${user.role}`);
    return NextResponse.json({ ok: true });
  }
  if (/^\/stop/i.test(text)) {
    await clearSession(chatId);
    await prisma.user.update({ where: { id: user.id }, data: { tgChatId: null } });
    await sendTg(chatId, "Аккаунт отвязан. Напоминания приходить не будут.");
    return NextResponse.json({ ok: true });
  }
  if (/^\/tasks/i.test(text)) {
    const s = await tasksScreen(user);
    await sendTg(chatId, s.text, undefined, s.buttons);
    return NextResponse.json({ ok: true });
  }

  const money = canMoney(user);
  const moneyOnly = async (fn: () => Promise<BotScreen>) => {
    if (!money) {
      await sendTg(chatId, "Раздел доступен владельцу и бухгалтеру.");
      return;
    }
    const s = await fn();
    await sendTg(chatId, s.text, undefined, s.buttons);
  };

  if (/^\/report/i.test(text)) {
    await moneyOnly(() => reportScreen(user));
    return NextResponse.json({ ok: true });
  }
  if (/^\/balance/i.test(text)) {
    await moneyOnly(() => balanceScreen());
    return NextResponse.json({ ok: true });
  }
  if (/^\/debts/i.test(text)) {
    await moneyOnly(() => debtsScreen());
    return NextResponse.json({ ok: true });
  }
  if (/^\/schedule/i.test(text)) {
    await moneyOnly(() => scheduleScreen());
    return NextResponse.json({ ok: true });
  }
  if (/^\/pay/i.test(text)) {
    await moneyOnly(() => payListScreen(0));
    return NextResponse.json({ ok: true });
  }
  if (/^\/expense/i.test(text)) {
    await moneyOnly(() => startFlow(chatId, "EXPENSE"));
    return NextResponse.json({ ok: true });
  }
  if (/^\/income/i.test(text)) {
    await moneyOnly(() => startFlow(chatId, "INCOME"));
    return NextResponse.json({ ok: true });
  }

  /* ---------- текст внутри активного диалога ---------- */
  const flowReply = await handleFlowText(chatId, text);
  if (flowReply) {
    await sendTg(chatId, flowReply.text, undefined, flowReply.buttons);
    return NextResponse.json({ ok: true });
  }

  await sendTg(chatId, greeting(user), undefined, mainMenu(user));
  return NextResponse.json({ ok: true });
}

async function link(chatId: string, code: string) {
  const user = await prisma.user.findFirst({ where: { tgLinkCode: code.toUpperCase() } });
  if (!user) {
    await sendTg(chatId, "Код не найден или уже использован. Сгенерируйте новый в CRM → «Профиль».");
    return { ok: true };
  }
  await prisma.user.update({ where: { id: user.id }, data: { tgChatId: chatId, tgLinkCode: null } });
  await sendTg(chatId, `✅ Готово, <b>${user.name}</b>!`, undefined, mainMenu(user));
  return { ok: true };
}
