/**
 * Очистка системы под боевой запуск.
 *
 * Убирает все демо-данные (клиентов, деньги, отчёты, задачи, сотрудников),
 * но сохраняет то, что настраивалось руками и пригодится дальше:
 * справочники, шаблоны задач, регламенты и настройки долей.
 *
 * Запуск: npx tsx prisma/reset-to-clean.ts "Имя Владельца" email@example.com
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Пароль без похожих символов: 0/O и 1/l/I путают при передаче голосом. */
function generatePassword(len = 12) {
  const abc = "abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += abc[Math.floor(Math.random() * abc.length)];
  return out;
}

async function main() {
  const [name, email] = process.argv.slice(2);
  if (!name || !email) {
    console.error('Укажите имя и email: npx tsx prisma/reset-to-clean.ts "Имя" mail@example.com');
    process.exit(1);
  }

  console.log("Очищаю демо-данные…\n");

  // Порядок важен: сначала то, что ссылается на клиентов и сотрудников.
  const steps: [string, () => Promise<{ count: number }>][] = [
    ["Замеры «Точка А/Б»", () => prisma.clientSnapshot.deleteMany()],
    ["Ссылки клиентов", () => prisma.clientLink.deleteMany()],
    ["Пункты чеклистов", () => prisma.taskChecklistItem.deleteMany()],
    ["Комментарии задач", () => prisma.taskComment.deleteMany()],
    ["Задачи", () => prisma.task.deleteMany()],
    ["Отчёты по таргету", () => prisma.adReport.deleteMany()],
    ["Отчёты маркетинга", () => prisma.marketingReport.deleteMany()],
    ["Оплаты", () => prisma.payment.deleteMany()],
    ["Расходы", () => prisma.expense.deleteMany()],
    ["Приходы", () => prisma.income.deleteMany()],
    ["Переводы", () => prisma.transfer.deleteMany()],
    ["Участники проектов", () => prisma.clientMember.deleteMany()],
    ["Цели", () => prisma.goal.deleteMany()],
    ["Клиенты", () => prisma.client.deleteMany()],
    ["Счета", () => prisma.account.deleteMany()],
    ["Уведомления", () => prisma.notification.deleteMany()],
    ["Сессии бота", () => prisma.botSession.deleteMany()],
    ["Регламенты", () => prisma.regulation.deleteMany()],
  ];

  for (const [label, fn] of steps) {
    const r = await fn();
    if (r.count > 0) console.log(`  удалено ${label.toLowerCase()}: ${r.count}`);
  }

  // Сотрудников удаляем всех — вместо них будет один настоящий владелец.
  const users = await prisma.user.deleteMany();
  if (users.count) console.log(`  удалено сотрудников: ${users.count}`);

  const password = generatePassword();
  const owner = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      role: "OWNER",
      active: true,
      projectLimit: 999,
    },
  });

  // Один счёт нужен сразу: без него некуда заводить оплаты.
  await prisma.account.create({
    data: { name: "Основной счёт", kind: "BANK", opening: 0, note: "создан при запуске системы" },
  });

  const kept = {
    "справочников": await prisma.dictItem.count(),
    "шаблонов задач": await prisma.taskTemplate.count(),
    "настроек": await prisma.setting.count(),
  };

  console.log("\nСохранено:");
  for (const [k, v] of Object.entries(kept)) console.log(`  ${k}: ${v}`);

  console.log("\n" + "=".repeat(52));
  console.log("  ВХОД ВЛАДЕЛЬЦА");
  console.log("=".repeat(52));
  console.log(`  Email:  ${owner.email}`);
  console.log(`  Пароль: ${password}`);
  console.log("=".repeat(52));
  console.log("  Сохраните пароль — больше он не показывается.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
