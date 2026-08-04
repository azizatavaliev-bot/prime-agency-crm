-- CreateTable
CREATE TABLE "MarketingReport" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'TARGET',
    "source" TEXT,
    "direction" TEXT,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'KGS',
    "usdRate" DOUBLE PRECISION,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "inquiries" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "authorId" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingReport_date_idx" ON "MarketingReport"("date");

-- AddForeignKey
ALTER TABLE "MarketingReport" ADD CONSTRAINT "MarketingReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingReport" ADD CONSTRAINT "MarketingReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

