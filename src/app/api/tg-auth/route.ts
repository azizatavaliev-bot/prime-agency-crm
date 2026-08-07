import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyInitData } from "@/lib/telegram-auth";
import { issueSession } from "@/lib/auth";

/**
 * Вход в мини-приложение: Telegram присылает подписанные данные о пользователе,
 * мы сверяем подпись и находим сотрудника по привязанному чату.
 */
export async function POST(req: Request) {
  const { initData } = (await req.json().catch(() => ({}))) as { initData?: string };

  const check = verifyInitData(initData ?? "");
  if (!check.ok) return NextResponse.json({ ok: false, error: check.reason }, { status: 401 });

  const chatId = String(check.user.id);
  const user = await prisma.user.findFirst({ where: { tgChatId: chatId, active: true } });

  if (!user) {
    // Аккаунт есть в Telegram, но не привязан к сотруднику — подсказываем, что делать.
    return NextResponse.json(
      {
        ok: false,
        error: "not-linked",
        message:
          "Ваш Telegram не привязан к сотруднику. Войдите на сайте по email и привяжите аккаунт в разделе «Профиль».",
      },
      { status: 403 }
    );
  }

  const session = await issueSession(user.id);
  if (!session) return NextResponse.json({ ok: false, error: "Вход недоступен" }, { status: 403 });

  return NextResponse.json({ ok: true, name: session.name, role: session.role });
}
