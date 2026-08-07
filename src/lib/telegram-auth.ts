import "server-only";
import crypto from "crypto";

export type TgUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

/**
 * Проверка данных, которые Telegram передаёт мини-приложению.
 *
 * Telegram подписывает initData ключом, выведенным из токена бота. Без этой
 * проверки любой мог бы подставить чужой telegram id и войти под ним, поэтому
 * доверяем строке только после сверки подписи.
 *
 * Алгоритм из документации: secret = HMAC_SHA256("WebAppData", botToken),
 * затем hash = HMAC_SHA256(secret, отсортированные пары ключ=значение).
 */
export function verifyInitData(
  initData: string,
  maxAgeSeconds = 86400
): { ok: true; user: TgUser } | { ok: false; reason: string } {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, reason: "TELEGRAM_BOT_TOKEN не задан" };
  if (!initData) return { ok: false, reason: "пустые данные Telegram" };

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "нет подписи" };

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const secret = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  const computed = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");

  // Сравниваем за постоянное время: обычное === подсказывает длину совпадения.
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
    return { ok: false, reason: "подпись не совпала" };

  // Старую строку принимать нельзя: перехваченную ссылку можно было бы
  // использовать сколько угодно долго.
  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate) return { ok: false, reason: "нет времени авторизации" };
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age > maxAgeSeconds) return { ok: false, reason: "данные устарели, откройте заново" };

  try {
    const user = JSON.parse(params.get("user") ?? "null") as TgUser | null;
    if (!user?.id) return { ok: false, reason: "нет данных пользователя" };
    return { ok: true, user };
  } catch {
    return { ok: false, reason: "не удалось прочитать пользователя" };
  }
}
