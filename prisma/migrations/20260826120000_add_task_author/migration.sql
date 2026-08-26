-- Автор задачи. Без него задача, созданная без клиента и без ответственного,
-- пропадала из виду у того, кто её завёл: доступ считался только по этим двум полям.
ALTER TABLE "Task" ADD COLUMN "authorId" TEXT;

ALTER TABLE "Task" ADD CONSTRAINT "Task_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
