import type { NextConfig } from "next";

/**
 * distDir берём из переменной окружения: прод-сборка пишет в `.next-build`,
 * dev-сервер остаётся в `.next`. Иначе `npm run build` во время работающего
 * `npm run dev` перезаписывает манифесты, статика отдаёт 404 и страница
 * ломается (форма логина уходит без JS → `cookies` вне request scope).
 */
const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
