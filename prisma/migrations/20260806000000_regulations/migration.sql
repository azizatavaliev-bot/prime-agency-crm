-- CreateTable
CREATE TABLE "Regulation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6d5efc',
    "items" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "ownerId" TEXT,
    "assignees" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Regulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Regulation_ownerId_idx" ON "Regulation"("ownerId");

-- AddForeignKey
ALTER TABLE "Regulation" ADD CONSTRAINT "Regulation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

