/**
 * Настройка Telegram под боевой адрес: вебхук и кнопка запуска мини-приложения.
 *
 * Telegram принимает только HTTPS, поэтому локально это не запустить —
 * скрипт нужен один раз после деплоя.
 *
 * Запуск: npx tsx scripts/setup-telegram.ts https://ваш-адрес.up.railway.app
 */
const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.argv[2] || process.env.APP_URL;

async function call(method: string, body: unknown) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = (await r.json()) as { ok: boolean; description?: string };
  console.log(`  ${method}: ${j.ok ? "готово" : "ошибка — " + j.description}`);
  return j.ok;
}

async function main() {
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN не задан");
    process.exit(1);
  }
  if (!appUrl?.startsWith("https://")) {
    console.error("Укажите боевой адрес по https, например:");
    console.error("  npx tsx scripts/setup-telegram.ts https://prime.up.railway.app");
    process.exit(1);
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  console.log(`Настраиваю бота на ${appUrl}\n`);

  // Кнопка рядом с полем ввода — открывает систему прямо в Telegram.
  await call("setChatMenuButton", {
    menu_button: { type: "web_app", text: "Открыть систему", web_app: { url: appUrl } },
  });

  // Команды в меню Telegram: без них о них никак не узнать.
  await call("setMyCommands", {
    commands: [
      { command: "start", description: "Открыть систему" },
      { command: "menu", description: "Главное меню" },
      { command: "tasks", description: "Мои задачи" },
      { command: "report", description: "Отчёт за месяц" },
      { command: "balance", description: "Остатки на счетах" },
      { command: "debts", description: "Кто не оплатил" },
      { command: "schedule", description: "Кто когда платит" },
      { command: "help", description: "Что умеет бот" },
    ],
  });

  await call("setWebhook", {
    url: `${appUrl}/api/telegram`,
    ...(secret ? { secret_token: secret } : {}),
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });

  const info = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then((r) =>
    r.json()
  );
  console.log("\nВебхук:", info.result?.url || "(не задан)");
  console.log("Ошибка доставки:", info.result?.last_error_message || "нет");
}

main();
