import "server-only";
import { cookies } from "next/headers";

const UNITY_BASE = "https://adminapp-production-217b.up.railway.app";
const AT_COOKIE = "unity_at";
const RT_COOKIE = "unity_rt";
const MAX_AGE = 60 * 60 * 24 * 7; // неделя — если истечёт, просто попросим переподключиться

type UnityTokens = { accessToken: string; refreshToken: string };

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

/**
 * Логин в Unity OS тем же логином/паролем, что и в Prime — вызывается один
 * раз сразу после успешного входа в Prime (см. src/app/login/page.tsx) и
 * вручную с экрана /unity, если пароли не совпадают. Ошибки не бросает —
 * Unity опционален, Prime должен работать и без него.
 */
export async function unityLogin(username: string, password: string): Promise<UnityTokens | null> {
  try {
    const res = await fetch(`${UNITY_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.accessToken || !data?.refreshToken) return null;
    return { accessToken: data.accessToken, refreshToken: data.refreshToken };
  } catch {
    return null;
  }
}

async function unityRefresh(refreshToken: string): Promise<UnityTokens | null> {
  try {
    const res = await fetch(`${UNITY_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.accessToken || !data?.refreshToken) return null;
    return { accessToken: data.accessToken, refreshToken: data.refreshToken };
  } catch {
    return null;
  }
}

export async function setUnityTokens(tokens: UnityTokens) {
  const jar = await cookies();
  jar.set(AT_COOKIE, tokens.accessToken, cookieOpts);
  jar.set(RT_COOKIE, tokens.refreshToken, cookieOpts);
}

export async function clearUnitySession() {
  const jar = await cookies();
  jar.delete(AT_COOKIE);
  jar.delete(RT_COOKIE);
}

export async function getUnityTokens(): Promise<UnityTokens | null> {
  const jar = await cookies();
  const accessToken = jar.get(AT_COOKIE)?.value;
  const refreshToken = jar.get(RT_COOKIE)?.value;
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export type UnityResult<T> = { connected: true; data: T } | { connected: false };

/**
 * Запрос к Unity API от имени текущего пользователя. При 401 один раз
 * пробует освежить токен через refresh — если и это не помогло, просит
 * страницу показать «переподключите Unity», а не падает.
 */
export async function unityFetch<T = unknown>(path: string): Promise<UnityResult<T>> {
  const tokens = await getUnityTokens();
  if (!tokens) return { connected: false };

  const call = (accessToken: string) =>
    fetch(`${UNITY_BASE}${path}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });

  let res = await call(tokens.accessToken);
  if (res.status === 401) {
    const refreshed = await unityRefresh(tokens.refreshToken);
    if (!refreshed) {
      await clearUnitySession();
      return { connected: false };
    }
    await setUnityTokens(refreshed);
    res = await call(refreshed.accessToken);
  }

  if (!res.ok) return { connected: false };
  try {
    const data = (await res.json()) as T;
    return { connected: true, data };
  } catch {
    return { connected: false };
  }
}
