-- CreateTable
CREATE TABLE "TaskCandidate" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "rawText" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "comment" TEXT,
    "clientId" TEXT,
    "assigneeId" TEXT,
    "dueAt" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdTaskId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "TaskCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskCandidate_status_createdAt_idx" ON "TaskCandidate"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "TaskCandidate" ADD CONSTRAINT "TaskCandidate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCandidate" ADD CONSTRAINT "TaskCandidate_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCandidate" ADD CONSTRAINT "TaskCandidate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
