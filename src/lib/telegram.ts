import "server-only";
import { prisma } from "./prisma";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = (method: string) => `https://api.telegram.org/bot${TOKEN}/${method}`;

export const telegramEnabled = () => Boolean(TOKEN);

/** Кнопка в сообщении: либо callback_data, либо ссылка. */
export type TgButton = { text: string; data?: string; url?: string };

function keyboard(buttons?: TgButton[][], link?: string) {
  const rows = (buttons ?? []).map((row) =>
    row.map((b) => (b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: b.data ?? "noop" }))
  );
  if (link) {
    const base = process.env.APP_URL || "http://localhost:5210";
    rows.push([{ text: "Открыть в CRM", url: `${base}${link}` }]);
  }
  return rows.length ? { reply_markup: { inline_keyboard: rows } } : {};
}

async function call(method: string, body: Record<string, unknown>) {
  if (!TOKEN) return { ok: false, reason: "TELEGRAM_BOT_TOKEN не задан" };
  try {
    const r = await fetch(API(method), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    return { ok: Boolean(j.ok), reason: j.description as string | undefined, result: j.result };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

export async function sendTg(chatId: string, text: string, link?: string, buttons?: TgButton[][]) {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...keyboard(buttons, link),
  });
}

/** Перерисовать сообщение, на кнопку которого нажали — вместо новой простыни в чате. */
export async function editTg(
  chatId: string,
  messageId: number,
  text: string,
  link?: string,
  buttons?: TgButton[][]
) {
  return call("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...keyboard(buttons, link),
  });
}

/** Убрать «часики» на нажатой кнопке, по желанию — всплывающая подсказка. */
export async function answerCallback(callbackId: string, text?: string) {
  return call("answerCallbackQuery", { callback_query_id: callbackId, text, show_alert: false });
}

/** Уведомление в CRM + дубль в Telegram, если чат привязан. */
export async function notifyUser(
  userId: string,
  data: { kind: string; title: string; body?: string; link?: string; dedupeKey?: string }
) {
  await prisma.notification.create({ data: { userId, ...data } });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.tgChatId) return;
  const icons: Record<string, string> = {
    PAYMENT_DUE: "💰",
    CPL_ALERT: "🔴",
    NEW_LEAD: "🆕",
    REPORT_DUE: "📊",
    TASK_DUE: "⏰",
  };
  const text = `${icons[data.kind] ?? "🔔"} <b>${escapeHtml(data.title)}</b>${
    data.body ? `\n${escapeHtml(data.body)}` : ""
  }`;
  await sendTg(user.tgChatId, text, data.link);
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function setWebhook(url: string, secret: string) {
  if (!TOKEN) return { ok: false, reason: "нет токена" };
  const r = await fetch(API("setWebhook"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      secret_token: secret,
      allowed_updates: ["message", "callback_query"],
    }),
  });
  return r.json();
}
