"use client";

import { useEffect, useState } from "react";

type TgWebApp = {
  initData: string;
  colorScheme?: "light" | "dark";
  themeParams?: Record<string, string>;
  ready: () => void;
  expand: () => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (c: string) => void;
  setBackgroundColor?: (c: string) => void;
  HapticFeedback?: { impactOccurred: (s: string) => void };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

/**
 * Мост между Telegram и приложением.
 *
 * Внутри Telegram: разворачивает окно, подхватывает тему и один раз меняет
 * подписанные данные на сессию, чтобы сотрудник не вводил пароль.
 * В обычном браузере не делает ничего.
 */
export default function TelegramApp() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();
    // Свайп вниз внутри Telegram закрывает окно — мешает прокрутке списков.
    tg.disableVerticalSwipes?.();

    document.documentElement.classList.add("tg-app");
    if (tg.colorScheme === "dark") document.documentElement.classList.add("dark");

    // Уже вошли — второй раз не дёргаем.
    if (document.cookie.includes("prime_session")) return;
    if (!tg.initData) return;

    fetch("/api/tg-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (r.ok) {
          window.location.reload();
          return;
        }
        setError(data.message || data.error || "Не удалось войти через Telegram");
      })
      .catch(() => setError("Нет связи с сервером"));
  }, []);

  if (!error) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] m-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700 shadow-lg">
      {error}
    </div>
  );
}
