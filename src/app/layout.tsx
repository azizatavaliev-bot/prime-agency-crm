import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import TelegramApp from "@/components/TelegramApp";

/**
 * Шрифты системы. Inter — текст и цифры: у него честная кириллица и
 * табличные цифры, поэтому суммы в столбцах не «пляшут». Manrope — заголовки
 * и крупные числа: геометричнее и современнее системного шрифта.
 */
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prime Agency — система учёта агентства",
  description: "Внутренняя CRM и система учёта маркетингового агентства Prime Agency",
};

/** Запрет масштабирования: внутри Telegram двойной тап иначе «прыгает» по вёрстке. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#6d5efc",
};

const themeScript = `
try {
  var t = localStorage.getItem('prime-theme');
  if (t === 'dark') document.documentElement.classList.add('dark');
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning className={`${inter.variable} ${manrope.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {/* Скрипт Telegram нужен до отрисовки: из него берём данные для входа */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <TelegramApp />
        {children}
      </body>
    </html>
  );
}
