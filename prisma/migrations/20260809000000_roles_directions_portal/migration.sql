-- Роли и портал клиента: направления, скриншоты, ставки процент+фикс, транзакции кабинета,
-- уведомления клиенту в портале, логин для входа (задел на будущее).
--
-- Все новые колонки добавлены NULL-able (или с DEFAULT), поэтому существующие строки не ломаются.
-- Значения ролей (OWNER/TARGETOLOG/ACCOUNT/CONTRACTOR) в этой миграции НЕ переименовываются —
-- это отдельная задача вместе с переносом ссылок в коде приложения.

-- AlterTable: User — новый необязательный login, пока не используется в auth.ts
ALTER TABLE "User" ADD COLUMN     "login" TEXT;

-- Бэкфилл: копируем email в login, чтобы значение было заполнено и уникальность не ломалась
-- (email уже был уникален, поэтому login тоже останется уникальным).
UPDATE "User" SET "login" = "email" WHERE "login" IS NULL;

-- AlterTable: Client — поля портала клиента
ALTER TABLE "Client" ADD COLUMN     "cardHolder" TEXT,
ADD COLUMN     "cardLast4" TEXT,
ADD COLUMN     "portalLogin" TEXT,
ADD COLUMN     "portalPasswordHash" TEXT,
ADD COLUMN     "tgChatId" TEXT,
ADD COLUMN     "tgLinkCode" TEXT;

-- AlterTable: ClientMember — новые поля ставки (процент/фикс раздельно) и карта проекта.
-- Старые rate/rateType сознательно НЕ удаляются в этой миграции (оставлены для обратной
-- совместимости с текущим кодом приложения — перенос на ratePercent/rateFixed в коде
-- выполняется отдельной задачей).
ALTER TABLE "ClientMember" ADD COLUMN     "cardHolder" TEXT,
ADD COLUMN     "cardLast4" TEXT,
ADD COLUMN     "rateFixed" DOUBLE PRECISION,
ADD COLUMN     "ratePercent" DOUBLE PRECISION;

-- Переносим уже имеющиеся ставки в новые поля, чтобы данные не терялись
UPDATE "ClientMember"
SET "ratePercent" = CASE WHEN "rateType" = 'PERCENT' THEN "rate" ELSE NULL END,
    "rateFixed"   = CASE WHEN "rateType" = 'FIXED' THEN "rate" ELSE NULL END
WHERE "ratePercent" IS NULL AND "rateFixed" IS NULL;

-- AlterTable: Payment — скриншот подтверждения оплаты
ALTER TABLE "Payment" ADD COLUMN     "screenshot" BYTEA,
ADD COLUMN     "screenshotMime" TEXT;

-- AlterTable: AdReport — направление, скриншот кабинета, обратная связь клиента, просмотры
ALTER TABLE "AdReport" ADD COLUMN     "clientConversion" DOUBLE PRECISION,
ADD COLUMN     "clientLeadQuality" INTEGER,
ADD COLUMN     "clientSales" INTEGER,
ADD COLUMN     "directionId" TEXT,
ADD COLUMN     "receivedToCard" TEXT,
ADD COLUMN     "screenshot" BYTEA,
ADD COLUMN     "screenshotMime" TEXT,
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Notification — необязательный userId + альтернативный clientId (портал клиента)
ALTER TABLE "Notification" ADD COLUMN     "clientId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable: Direction — направления внутри проекта клиента
CREATE TABLE "Direction" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Direction_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AdTransaction — разовые приходы/списания по рекламному кабинету
CREATE TABLE "AdTransaction" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "screenshot" BYTEA,
    "screenshotMime" TEXT,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE UNIQUE INDEX "Client_portalLogin_key" ON "Client"("portalLogin");

-- CreateIndex
CREATE UNIQUE INDEX "Client_tgLinkCode_key" ON "Client"("tgLinkCode");

-- AddForeignKey
ALTER TABLE "Direction" ADD CONSTRAINT "Direction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Direction" ADD CONSTRAINT "Direction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdReport" ADD CONSTRAINT "AdReport_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "Direction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdTransaction" ADD CONSTRAINT "AdTransaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdTransaction" ADD CONSTRAINT "AdTransaction_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
