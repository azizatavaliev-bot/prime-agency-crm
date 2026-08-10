-- Логины сотрудников: короткое имя вместо полного email (login = локальная часть до "@"),
-- пароль сбрасывается на <login>1234 — для лёгкого запоминания во внутренней команде.
-- Дедуп на случай совпадения имени до "@" у разных людей (bakt, bakt2, bakt3...).
WITH base AS (
  SELECT
    id,
    lower(split_part(login, '@', 1)) AS candidate,
    row_number() OVER (PARTITION BY lower(split_part(login, '@', 1)) ORDER BY "createdAt", id) AS rn
  FROM "User"
),
computed AS (
  SELECT id, candidate || CASE WHEN rn > 1 THEN rn::text ELSE '' END AS new_login
  FROM base
)
UPDATE "User" u
SET
  "login" = c.new_login,
  "passwordHash" = crypt(c.new_login || '1234', gen_salt('bf', 10)),
  "passwordChangedAt" = now()
FROM computed c
WHERE u.id = c.id;
