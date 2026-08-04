import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prime Agency — система учёта агентства",
  description: "Внутренняя CRM и система учёта маркетингового агентства Prime Agency",
};

const themeScript = `
try {
  var t = localStorage.getItem('prime-theme');
  if (t === 'dark') document.documentElement.classList.add('dark');
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
