"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "./auth";
import { unityLogin, setUnityTokens, clearUnitySession } from "./unity";

export type ConnectUnityState = { ok: boolean; error?: string };

/** Ручное подключение/переподключение Unity — если пароли не совпадают с Prime или связь протухла. */
export async function connectUnity(_prev: ConnectUnityState, fd: FormData): Promise<ConnectUnityState> {
  await requireUser();
  const username = String(fd.get("username") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!username || !password) return { ok: false, error: "Введите логин и пароль" };

  const tokens = await unityLogin(username, password);
  if (!tokens) return { ok: false, error: "Unity не приняла логин/пароль" };

  await setUnityTokens(tokens);
  revalidatePath("/unity");
  return { ok: true };
}

export async function disconnectUnity() {
  await requireUser();
  await clearUnitySession();
  revalidatePath("/unity");
}
