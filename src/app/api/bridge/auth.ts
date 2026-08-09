import "server-only";

/**
 * Мост Unity Tasks → Prime. Отдельный ключ, не сессия пользователя:
 * запрос приходит от сервера Unity Tasks, а не из браузера.
 */
export function bridgeAuthorized(req: Request): boolean {
  const key = process.env.BRIDGE_KEY;
  if (!key || key.length < 16) return false;
  const given = req.headers.get("x-bridge-key");
  return given === key;
}

export const UNAUTHORIZED = { error: "bridge: доступ запрещён" };
