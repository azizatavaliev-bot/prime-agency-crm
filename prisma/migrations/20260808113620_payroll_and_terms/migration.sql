-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "priceReviewAt" TIMESTAMP(3),
ADD COLUMN     "renewalMode" TEXT,
ADD COLUMN     "termsNote" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "baseSalary" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MemberRate" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "rateType" TEXT NOT NULL DEFAULT 'PERCENT',
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fromMonth" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bonus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bonus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonusRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "role" TEXT,
    "amountType" TEXT NOT NULL DEFAULT 'FIXED',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "threshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "perClient" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "hint" TEXT,
    "order" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BonusRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "base" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "projectShare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT,
    "expenseId" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberRate_clientId_userId_fromMonth_idx" ON "MemberRate"("clientId", "userId", "fromMonth");

-- CreateIndex
CREATE UNIQUE INDEX "MemberRate_clientId_userId_role_fromMonth_key" ON "MemberRate"("clientId", "userId", "role", "fromMonth");

-- CreateIndex
CREATE INDEX "Bonus_userId_month_idx" ON "Bonus"("userId", "month");

-- CreateIndex
CREATE INDEX "Payout_month_idx" ON "Payout"("month");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_userId_month_key" ON "Payout"("userId", "month");

-- AddForeignKey
ALTER TABLE "MemberRate" ADD CONSTRAINT "MemberRate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRate" ADD CONSTRAINT "MemberRate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bonus" ADD CONSTRAINT "Bonus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bonus" ADD CONSTRAINT "Bonus_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
