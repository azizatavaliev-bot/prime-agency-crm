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
function sessionSecret() {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16) return s;
  // Во время сборки переменных окружения ещё нет, а страницы уже собираются.
  // Настоящая проверка нужна в рантайме, когда кто-то реально входит.
  if (process.env.NEXT_PHASE === "phase-production-build") return "build-time-placeholder";
  if (process.env.NODE_ENV === "production")
    throw new Error("JWT_SECRET не задан или короче 16 символов — вход отключён");
  return "dev-secret-local-only";
}

/** Ключ считаем при первом обращении: на уровне модуля он ломал сборку. */
let cachedSecret: Uint8Array | null = null;
function secretKey(): Uint8Array {
  if (!cachedSecret) cachedSecret = new TextEncoder().encode(sessionSecret());
  return cachedSecret;
}
const COOKIE = "prime_session";

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
  email: string;
  name: string;
  role: Role;
  projectLimit: number;
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

export async function login(email: string, password: string): Promise<SessionUser | null> {
  const key = email.trim().toLowerCase();
  if (tooManyAttempts(key)) return null;

  const user = await prisma.user.findUnique({ where: { email: key } });
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
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const user = await prisma.user.findUnique({ where: { id: String(payload.uid) } });
    if (!user || !user.active) return null;

    // Пароль сменили — все выданные до этого сессии больше не действуют.
    if (user.passwordChangedAt && payload.iat) {
      if (payload.iat * 1000 < user.passwordChangedAt.getTime()) return null;
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      projectLimit: user.projectLimit,
    };
  } catch {
    return null;
  }
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
  return requireRole("OWNER");
}
