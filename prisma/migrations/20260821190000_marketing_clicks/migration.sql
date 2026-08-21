-- AlterTable
-- IF NOT EXISTS: колонка на dev-базе уже была добавлена напрямую (db push)
-- параллельной сессией, миграция должна безопасно применяться и там, и на
-- чистой базе (прод, тестовые окружения).
ALTER TABLE "MarketingReport" ADD COLUMN IF NOT EXISTS "clicks" INTEGER NOT NULL DEFAULT 0;
