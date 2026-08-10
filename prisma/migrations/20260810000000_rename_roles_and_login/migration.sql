-- Переименование ролей на новую 8-ролевую модель + переключение входа с email на логин.
--
-- 1) Роли: OWNER -> SUPER_ADMIN, ACCOUNT -> TEAM_LEAD, CONTRACTOR -> DEVELOPER (User.role);
--    ACCOUNT -> TEAM_LEAD в ClientMember.role (CONTRACTOR там не трогаем).
--    ADMIN и EDITOR — новые роли, никого автоматически в них не переводим.
--
-- 2) Логин для входа: для всех существующих пользователей без логина выводим его
--    из локальной части email (до @), в нижнем регистре. При совпадении — числовой
--    суффикс (rama, rama2, rama3...), по порядку создания аккаунта.
--
-- 3) Пароль для мигрированных (уже существующих) аккаунтов сбрасывается на
--    "<login>1234" — это сознательное решение владельца для маленькой внутренней
--    команды, не публичного сервиса. Пароль хешируется через pgcrypto/bcrypt,
--    формат хеша $2a$... совместим с bcryptjs, используемым в src/lib/auth.ts —
--    доп. правки в коде проверки пароля не нужны.
--    Новые пользователи, созданные через форму в приложении, пароль по-прежнему
--    задают явно (см. src/lib/actions.ts saveUser) — их эта миграция не трогает.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Роли пользователей
UPDATE "User" SET "role" = 'SUPER_ADMIN' WHERE "role" = 'OWNER';
UPDATE "User" SET "role" = 'TEAM_LEAD' WHERE "role" = 'ACCOUNT';
UPDATE "User" SET "role" = 'DEVELOPER' WHERE "role" = 'CONTRACTOR';

-- Роли участников проекта (ClientMember) — отдельное поле, CONTRACTOR здесь не переименовываем
UPDATE "ClientMember" SET "role" = 'TEAM_LEAD' WHERE "role" = 'ACCOUNT';

-- Логин + пароль для существующих пользователей, у которых логина ещё нет
WITH base AS (
  SELECT
    id,
    lower(split_part(email, '@', 1)) AS base_login,
    row_number() OVER (
      PARTITION BY lower(split_part(email, '@', 1))
      ORDER BY "createdAt", id
    ) AS rn
  FROM "User"
  WHERE login IS NULL
),
derived AS (
  SELECT
    id,
    CASE WHEN rn = 1 THEN base_login ELSE base_login || rn::text END AS new_login
  FROM base
)
UPDATE "User" u
SET
  login = d.new_login,
  "passwordHash" = crypt(d.new_login || '1234', gen_salt('bf', 10)),
  "passwordChangedAt" = now()
FROM derived d
WHERE u.id = d.id;
