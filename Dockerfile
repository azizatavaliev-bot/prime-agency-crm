# Образ собирается на GitHub Actions и публикуется в ghcr.io:
# Railway разворачивает готовый образ, потому что сборка из исходников
# на текущем тарифе не запускается.

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# DATABASE_URL нужен только для генерации клиента, к базе на этом шаге не ходим
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
# public может быть пустой — копируем через каталог целиком
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 5210
# Миграции накатываются при старте — так прод всегда на актуальной схеме
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -p ${PORT:-5210}"]
