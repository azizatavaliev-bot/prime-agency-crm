import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Role } from "./constants";

/**
 * Ключ подписи сессий. На проде обязателен: с общеизвестным запасным
 * значением любой смог бы подделать токен и войти владельцем.
 */
/**
 * Настоящий ли ключ подписи. На проде обязателен: с общеизвестным запасным
 * значением любой смог бы подделать токен и войти владельцем.
 *
 * Проверяем здесь, а не при загрузке модуля: при сборке переменных окружения
 * ещё нет, и страницы просто не собирались бы.
 */
function secretConfigured(): boolean {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16) return true;
  return process.env.NODE_ENV !== "production";
}

function secretKey(): Uint8Array {
  const s = process.env.JWT_SECRET;
  const value = s && s.length >= 16 ? s : "dev-secret-local-only";
  return new TextEncoder().encode(value);
}
const COOKIE = "prime_session";
/**
 * Отдельная кука для сессии клиента в портале — не пересекается с кукой
 * сотрудника: один и тот же браузер может держать сразу обе сессии
 * (например, сотрудник открывает портал клиента для проверки), и роль
 * "CLIENT" не входит в перечень ролей сотрудника (`Role`), поэтому
 * клиентская сессия описывается отдельным типом, а не `SessionUser`.
 */
const PORTAL_COOKIE = "prime_portal_session";

/**
 * Счётчик неудачных попыток входа: 5 промахов подряд — минута паузы.
 * Хранится в памяти процесса, этого хватает для одного контейнера.
 */
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

function tooManyAttempts(key: string) {
  const a = attempts.get(key);
  return Boolean(a && a.until > Date.now());
}

function noteFailure(key: string) {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.until <= now) {
    attempts.set(key, { count: 1, until: 0 });
    return;
  }
  a.count += 1;
  if (a.count >= MAX_ATTEMPTS) a.until = now + LOCK_MS;
}

export type SessionUser = {
  id: string;
  login: string | null;
  email: string;
  name: string;
  role: Role;
  projectLimit: number;
  /** Заполнено, когда текущая сессия — «просмотр от лица сотрудника». */
  impersonating?: { realUserId: string; realUserName: string };
};

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

/**
 * Демо-вход в один клик. Включён при локальной разработке автоматически,
 * на проде — только если явно выставлен DEMO_MODE=1.
 * NODE_ENV на Railway всегда production, поэтому боевой стенд закрыт
 * даже если про переменную забыли.
 */
export function demoLoginEnabled(): boolean {
  // Включается только явно: в системе живые данные, а не демо.
  return process.env.DEMO_MODE === "1";
}

export async function login(loginValue: string, password: string): Promise<SessionUser | null> {
  if (!secretConfigured()) {
    console.error("JWT_SECRET не задан или короче 16 символов — вход отключён");
    return null;
  }
  const key = loginValue.trim().toLowerCase();
  if (tooManyAttempts(key)) return null;

  const user = await prisma.user.findUnique({ where: { login: key } });
  if (!user || !user.active) {
    noteFailure(key);
    return null;
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    noteFailure(key);
    return null;
  }
  attempts.delete(key);

  const token = await new SignJWT({ uid: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return {
    id: user.id,
    login: user.login,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    projectLimit: user.projectLimit,
  };
}

/**
 * Выдать сессию по id пользователя — без пароля.
 * Нужно для входа из Telegram: личность там подтверждает сам Telegram
 * подписью, поэтому пароль не спрашиваем.
 */
export async function issueSession(userId: string): Promise<SessionUser | null> {
  if (!secretConfigured()) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) return null;

  const token = await new SignJWT({ uid: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return {
    id: user.id,
    login: user.login,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    projectLimit: user.projectLimit,
  };
}

export async function logout() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token || !secretConfigured()) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const user = await prisma.user.findUnique({ where: { id: String(payload.uid) } });
    if (!user || !user.active) return null;

    // Пароль сменили — все выданные до этого сессии больше не действуют.
    if (user.passwordChangedAt && payload.iat) {
      if (payload.iat * 1000 < user.passwordChangedAt.getTime()) return null;
    }

    let impersonating: SessionUser["impersonating"];
    const realUid = payload.realUid ? String(payload.realUid) : null;
    if (realUid) {
      const realUser = await prisma.user.findUnique({ where: { id: realUid } });
      if (realUser && realUser.active) {
        impersonating = { realUserId: realUser.id, realUserName: realUser.name };
      }
    }

    return {
      id: user.id,
      login: user.login,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      projectLimit: user.projectLimit,
      impersonating,
    };
  } catch {
    return null;
  }
}

/**
 * Админ смотрит интерфейс глазами сотрудника: выдаём токен на личность
 * сотрудника, но с меткой realUid, указывающей на настоящего админа —
 * чтобы можно было вернуться назад и чтобы вложенный вызов impersonate()
 * не позволял «цепочку» подмен.
 */
export async function impersonate(targetUserId: string): Promise<SessionUser | null> {
  if (!secretConfigured()) return null;
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  let payload: Record<string, unknown>;
  try {
    payload = (await jwtVerify(token, secretKey())).payload;
  } catch {
    return null;
  }

  // Уже смотрим от чужого лица — новую подмену не начинаем (без цепочек).
  if (payload.realUid) return null;

  const admin = await prisma.user.findUnique({ where: { id: String(payload.uid) } });
  if (!admin || !admin.active) return null;
  if (admin.role !== "SUPER_ADMIN" && admin.role !== "ADMIN") return null;

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target || !target.active) return null;
  if (target.id === admin.id) return null;

  const newToken = await new SignJWT({ uid: target.id, realUid: admin.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());

  jar.set(COOKIE, newToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return {
    id: target.id,
    login: target.login,
    email: target.email,
    name: target.name,
    role: target.role as Role,
    projectLimit: target.projectLimit,
    impersonating: { realUserId: admin.id, realUserName: admin.name },
  };
}

/** Вернуться из режима «смотрю от лица сотрудника» к своей собственной сессии. */
export async function stopImpersonating(): Promise<SessionUser | null> {
  if (!secretConfigured()) return null;
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  let payload: Record<string, unknown>;
  try {
    payload = (await jwtVerify(token, secretKey())).payload;
  } catch {
    return null;
  }
  const realUid = payload.realUid ? String(payload.realUid) : null;
  if (!realUid) return null;

  return issueSession(realUid);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/no-access");
  return user;
}

export async function requireOwner() {
  return requireRole("SUPER_ADMIN");
}

/* ---------------- Портал клиента ---------------- */

/**
 * Сессия клиента в портале. Отдельный тип от `SessionUser`: клиент — это
 * запись `Client`, а не `User`, и у него нет роли сотрудника.
 */
export type ClientSession = {
  clientId: string;
  login: string;
  name: string;
};

/** Вход клиента в портал по логину и паролю, выданным агентством. */
export async function clientLogin(loginValue: string, password: string): Promise<ClientSession | null> {
  if (!secretConfigured()) {
    console.error("JWT_SECRET не задан или короче 16 символов — вход отключён");
    return null;
  }
  const key = `portal:${loginValue.trim().toLowerCase()}`;
  if (tooManyAttempts(key)) return null;

  const client = await prisma.client.findUnique({ where: { portalLogin: loginValue.trim().toLowerCase() } });
  if (!client || !client.portalPasswordHash) {
    noteFailure(key);
    return null;
  }
  if (!(await bcrypt.compare(password, client.portalPasswordHash))) {
    noteFailure(key);
    return null;
  }
  attempts.delete(key);

  const token = await new SignJWT({ cid: client.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());

  const jar = await cookies();
  jar.set(PORTAL_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return { clientId: client.id, login: client.portalLogin!, name: client.name };
}

export async function clientLogout() {
  const jar = await cookies();
  jar.delete(PORTAL_COOKIE);
}

export async function getClientSession(): Promise<ClientSession | null> {
  const jar = await cookies();
  const token = jar.get(PORTAL_COOKIE)?.value;
  if (!token || !secretConfigured()) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const client = await prisma.client.findUnique({ where: { id: String(payload.cid) } });
    if (!client || !client.portalLogin || !client.portalPasswordHash) return null;
    return { clientId: client.id, login: client.portalLogin, name: client.name };
  } catch {
    return null;
  }
}

export async function requireClient(): Promise<ClientSession> {
  const session = await getClientSession();
  if (!session) redirect("/portal/login");
  return session;
}
