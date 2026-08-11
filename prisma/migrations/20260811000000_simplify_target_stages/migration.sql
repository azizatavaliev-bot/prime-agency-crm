-- Упрощение этапов доски "Таргет": вместо узкоспециализированных этапов
-- маркетингового конвейера — универсальные статусы выполнения (TODO / IN_PROGRESS / DONE),
-- подходящие для любого типа задачи.

-- 1) Существующие задачи доски TARGET: переносим старые этапы на новые.
UPDATE "Task" SET stage = 'TODO'
  WHERE board = 'TARGET' AND stage IN ('BRIEF', 'HYPOTHESES');
UPDATE "Task" SET stage = 'IN_PROGRESS'
  WHERE board = 'TARGET' AND stage IN ('SHOOTING', 'LAUNCH', 'FILTER');
UPDATE "Task" SET stage = 'DONE'
  WHERE board = 'TARGET' AND stage IN ('SCALE', 'UPDATE');
-- Любое другое незнакомое значение на доске TARGET — в TODO, а не в мусор.
UPDATE "Task" SET stage = 'TODO'
  WHERE board = 'TARGET' AND stage NOT IN ('TODO', 'IN_PROGRESS', 'DONE');

-- 2) Шаблоны задач доски TARGET — та же миграция ключей этапов.
UPDATE "TaskTemplateItem" ti SET stage = 'TODO'
  FROM "TaskTemplate" t WHERE ti."templateId" = t.id AND t.board = 'TARGET' AND ti.stage IN ('BRIEF', 'HYPOTHESES');
UPDATE "TaskTemplateItem" ti SET stage = 'IN_PROGRESS'
  FROM "TaskTemplate" t WHERE ti."templateId" = t.id AND t.board = 'TARGET' AND ti.stage IN ('SHOOTING', 'LAUNCH', 'FILTER');
UPDATE "TaskTemplateItem" ti SET stage = 'DONE'
  FROM "TaskTemplate" t WHERE ti."templateId" = t.id AND t.board = 'TARGET' AND ti.stage IN ('SCALE', 'UPDATE');

-- 3) Справочник DictItem STAGE_TARGET хранит старые колонки в базе и перекрывает
-- встроенные константы (dict() берёт БД, если там есть строки) — удаляем старые,
-- чтобы код подхватил новые универсальные этапы из constants.ts. Админ сможет
-- пересоздать/переименовать их в Настройках при желании.
DELETE FROM "DictItem" WHERE type = 'STAGE_TARGET';
