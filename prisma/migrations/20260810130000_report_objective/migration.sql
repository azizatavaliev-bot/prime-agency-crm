-- Цель кампании (LEADS/ENGAGEMENT/TRAFFIC/PROFILE_VISITS) и метрики под неё.
-- Все колонки со значением по умолчанию — существующие строки не ломаются.
ALTER TABLE "AdReport" ADD COLUMN "objective" TEXT NOT NULL DEFAULT 'LEADS';
ALTER TABLE "AdReport" ADD COLUMN "engagement" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AdReport" ADD COLUMN "traffic" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AdReport" ADD COLUMN "profileVisits" INTEGER NOT NULL DEFAULT 0;
