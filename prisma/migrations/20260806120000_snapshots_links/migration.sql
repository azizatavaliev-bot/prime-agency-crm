-- CreateTable
CREATE TABLE "ClientSnapshot" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "leads" INTEGER,
    "cpl" DOUBLE PRECISION,
    "adSpend" DOUBLE PRECISION,
    "revenue" DOUBLE PRECISION,
    "conversion" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientLink" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientSnapshot_clientId_type_idx" ON "ClientSnapshot"("clientId", "type");

-- CreateIndex
CREATE INDEX "ClientLink_clientId_idx" ON "ClientLink"("clientId");

-- AddForeignKey
ALTER TABLE "ClientSnapshot" ADD CONSTRAINT "ClientSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientLink" ADD CONSTRAINT "ClientLink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

