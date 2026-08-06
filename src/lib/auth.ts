import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Role } from "./constants";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");
const COOKIE = "prime_session";

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
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !user.active) return null;
  if (!(await bcrypt.compare(password, user.passwordHash))) return null;

  const token = await new SignJWT({ uid: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

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
    const { payload } = await jwtVerify(token, secret);
    const user = await prisma.user.findUnique({ where: { id: String(payload.uid) } });
    if (!user || !user.active) return null;
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
