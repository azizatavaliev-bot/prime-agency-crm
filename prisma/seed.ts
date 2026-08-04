import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PW = "prime2026";
const mk = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const ago = (days: number) => new Date(Date.now() - days * 86400000);
const ahead = (days: number) => new Date(Date.now() + days * 86400000);

async function main() {
  await prisma.transfer.deleteMany();
  await prisma.account.deleteMany();
  await prisma.income.deleteMany();
  await prisma.dictItem.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.clientMember.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.task.deleteMany();
  await prisma.adReport.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();

  const hash = await bcrypt.hash(PW, 10);
  const mkUser = (email: string, name: string, role: string, rate?: number) =>
    prisma.user.create({
      data: { email, name, role, passwordHash: hash, rate: rate ?? null, projectLimit: 5 },
    });

  const owner = await mkUser("owner@prime.kg", "Aziz (владелец)", "OWNER");
  const t1 = await mkUser("target1@prime.kg", "Айбек Осмонов", "TARGETOLOG", 34);
  const t2 = await mkUser("target2@prime.kg", "Нурзада Асанова", "TARGETOLOG", 34);
  const acc = await mkUser("account@prime.kg", "Жанара Керимова", "ACCOUNT", 10);
  const dev = await mkUser("dev@prime.kg", "Тимур (разработка/монтаж)", "CONTRACTOR", 40);
  await mkUser("buh@prime.kg", "Айгуль Бакирова", "ACCOUNTANT");

  for (const [key, value] of [
    ["targetologShare", "0.34"],
    ["devShare", "0.4"],
    ["reserveShare", "0.12"],
    ["projectLimit", "5"],
  ])
    await prisma.setting.create({ data: { key, value } });

  // счета
  const cash = await prisma.account.create({
    data: { name: "Касса (наличные)", kind: "CASH", opening: 120000, minBalance: 20000, note: "деньги в офисе" },
  });
  const bank = await prisma.account.create({
    data: { name: "Оптима Банк", kind: "BANK", opening: 150000, minBalance: 50000, note: "основной счёт агентства" },
  });
  const card = await prisma.account.create({
    data: { name: "Карта Мбанк", kind: "CARD", opening: 90000, minBalance: 10000, note: "подписки и реклама" },
  });

  // справочники системы (встроенные значения — их можно скрывать, переименовывать и дополнять)
  const dictDefs: [string, [string, string, string?][]][] = [
    [
      "CLIENT_STATUS",
      [
        ["TEST", "Тест", "bg-sky-100 text-sky-700 border-sky-200"],
        ["ACTIVE", "Ведётся", "bg-emerald-100 text-emerald-700 border-emerald-200"],
        ["RISK", "Риск оттока", "bg-amber-100 text-amber-700 border-amber-200"],
        ["PAUSED", "Приостановлен", "bg-zinc-100 text-zinc-700 border-zinc-200"],
        ["CHURNED", "Отток", "bg-red-100 text-red-700 border-red-200"],
      ],
    ],
    [
      "SERVICE",
      [
        ["TARGET", "Таргет"],
        ["SITE", "Сайт"],
        ["BOT", "Чат-бот"],
        ["VIDEO", "Монтаж"],
      ],
    ],
    [
      "SOURCE",
      [
        ["REFERRAL", "Рекомендация"],
        ["INSTAGRAM", "Instagram"],
        ["COLD", "Холодный обзвон"],
        ["SITE_FORM", "Заявка с сайта"],
      ],
    ],
    [
      "NICHE",
      [
        ["MEDICAL", "Медицина"],
        ["FOOD", "Еда и кофейни"],
        ["AUTO", "Авто"],
        ["EDU", "Образование"],
        ["BEAUTY", "Бьюти"],
        ["GOODS", "Товары"],
      ],
    ],
    [
      "PAYMENT_KIND",
      [
        ["SUBSCRIPTION", "Абонплата"],
        ["SITE", "Сайт"],
        ["BOT", "Чат-бот"],
        ["VIDEO", "Монтаж"],
      ],
    ],
    [
      "PAYMENT_METHOD",
      [
        ["TRANSFER", "Перевод"],
        ["CASH", "Наличные"],
        ["INVOICE", "Счёт"],
      ],
    ],
    [
      "EXPENSE_CATEGORY",
      [
        ["ADS", "Реклама за наш счёт"],
        ["SALARY", "Выплаты команде"],
        ["SUBSCRIPTION", "Сервисы и подписки"],
        ["OFFICE", "Офис и связь"],
        ["TAX", "Налоги и комиссии"],
        ["EDU", "Обучение"],
        ["OTHER", "Прочее"],
      ],
    ],
    [
      "INCOME_CATEGORY",
      [
        ["CLIENT", "Оплата клиента"],
        ["REFUND", "Возврат средств"],
        ["PARTNER", "Партнёрские"],
        ["OWN", "Внесение своих"],
        ["OTHER", "Прочее"],
      ],
    ],
    [
      "ACCOUNT_KIND",
      [
        ["CASH", "Наличные"],
        ["BANK", "Банковский счёт"],
        ["CARD", "Карта"],
      ],
    ],
    [
      "STAGE_TARGET",
      [
        ["BRIEF", "Бриф"],
        ["HYPOTHESES", "Гипотезы / ТЗ"],
        ["SHOOTING", "Клиент снимает видео"],
        ["LAUNCH", "Запуск теста"],
        ["FILTER", "Отсев"],
        ["SCALE", "Масштаб"],
        ["UPDATE", "Обновление"],
      ],
    ],
    [
      "STAGE_DEV",
      [
        ["BRIEF", "Бриф"],
        ["DESIGN", "Прототип"],
        ["DEV", "Разработка"],
        ["REVIEW", "Правки"],
        ["DONE", "Сдано"],
      ],
    ],
    [
      "STAGE_VIDEO",
      [
        ["BRIEF", "Материалы"],
        ["EDIT", "Монтаж"],
        ["REVIEW", "Правки"],
        ["DONE", "Сдано"],
      ],
    ],
  ];
  for (const [type, values] of dictDefs) {
    for (let i = 0; i < values.length; i++) {
      const [key, name, color] = values[i];
      await prisma.dictItem.create({
        data: { type, key, name, color: color ?? null, order: (i + 1) * 10, builtin: true },
      });
    }
  }

  // прочие приходы
  await prisma.income.create({
    data: {
      title: "Партнёрская комиссия за рекомендацию",
      category: "PARTNER",
      amount: 15000,
      receivedAt: ago(1),
      periodMonth: mk(ago(1)),
      accountId: bank.id,
      comment: "привёл клиента другому агентству",
    },
  });
  await prisma.income.create({
    data: {
      title: "Возврат за неиспользованный сервис",
      category: "REFUND",
      amount: 4200,
      receivedAt: ago(14),
      periodMonth: mk(ago(14)),
      accountId: card.id,
    },
  });

  // переводы: каждый месяц пополняем кассу и карту с банка
  for (let i = 3; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    d.setDate(8);
    await prisma.transfer.create({
      data: {
        fromAccountId: bank.id,
        toAccountId: cash.id,
        amount: 35000,
        madeAt: d,
        periodMonth: mk(d),
        comment: "на текущие расходы офиса",
      },
    });
    await prisma.transfer.create({
      data: {
        fromAccountId: bank.id,
        toAccountId: card.id,
        amount: 25000,
        madeAt: d,
        periodMonth: mk(d),
        comment: "на подписки и рекламу",
      },
    });
  }


  const defs = [
    ["Стоматология «Ак Тиш»", "стоматология", "TEST", 35000, t1.id, "TARGET", 30],
    ["Кофейня Sierra Bishkek", "кофейни", "ACTIVE", 45000, t1.id, "TARGET,VIDEO", 120],
    ["Автосервис «Мотор+»", "автосервис", "ACTIVE", 40000, t1.id, "TARGET", 90],
    ["Клиника «Медикал Плюс»", "медицина", "RISK", 50000, t1.id, "TARGET,SITE", 150],
    ["Школа English Time", "образование", "ACTIVE", 38000, t2.id, "TARGET,BOT", 200],
    ["Мебель «Уют KG»", "мебель", "ACTIVE", 42000, t2.id, "TARGET", 75],
    ["Фитнес «Атлет»", "фитнес", "PAUSED", 35000, t2.id, "TARGET", 240],
    ["Салон «Жаннат Beauty»", "бьюти", "CHURNED", 30000, t2.id, "TARGET", 300],
  ] as const;

  const clients = [];
  for (const [name, niche, status, avgCheck, targetologId, services, daysAgo] of defs) {
    clients.push(
      await prisma.client.create({
        data: {
          name,
          niche,
          status,
          avgCheck,
          targetologId,
          accountId: acc.id,
          services,
          startedAt: ago(daysAgo),
          churnedAt: status === "CHURNED" ? ago(20) : null,
          contact: "WhatsApp +996 555 000 000",
          source: "рекомендация",
          adAccount: "кабинет клиента",
          nextPaymentAt: status === "CHURNED" ? null : ahead(((defs.length % 7) + 3) as number),
          paymentDay: [5, 10, 7, 15, 3, 20, 25, 1][clients.length] ?? 10,
          contractStart: ago(daysAgo),
          contractEnd: status === "CHURNED" ? ago(20) : ahead(365 - (daysAgo % 300)),
          profitPercent: name.includes("Медикал") ? 15 : null,
          goal: `${20 + (avgCheck % 10)} заявок в месяц не дороже 500 сом`,
          agreement: "Абонплата помесячно, клиент снимает видео по нашим ТЗ, отчёт раз в неделю",
          targetCpl: 500,
          sitePrice: services.includes("SITE") ? 25000 : null,
          botPrice: services.includes("BOT") ? 18000 : null,
          videoPrice: services.includes("VIDEO") ? 8000 : null,
        },
      })
    );
  }

  // участники проектов со ставками
  for (const c of clients) {
    if (c.targetologId)
      await prisma.clientMember.create({
        data: { clientId: c.id, userId: c.targetologId, role: "TARGETOLOG", rateType: "PERCENT", rate: 34 },
      });
    await prisma.clientMember.create({
      data: { clientId: c.id, userId: acc.id, role: "ACCOUNT", rateType: "FIXED", rate: 3000, note: "ведёт переписку и оплаты" },
    });
  }

  // цели месяца
  const thisMonth = mk(new Date());
  for (const [metric, target] of [
    ["REVENUE", 350000],
    ["PROFIT", 180000],
    ["LEADS", 200],
    ["CPL", 500],
  ] as const)
    await prisma.goal.create({ data: { month: thisMonth, metric, target, clientId: null } });

  const split = (kind: string, amount: number) => {
    const exec = Math.round(amount * (kind === "SUBSCRIPTION" ? 0.34 : 0.4));
    const reserve = Math.round(amount * 0.12);
    return { execShare: exec, reserve, ownerNet: amount - exec - reserve };
  };

  // абонплаты за 4 месяца
  for (const c of clients) {
    if (c.status === "CHURNED") continue;
    for (let i = 3; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      d.setDate(5);
      const isCurrent = i === 0;
      const status = isCurrent ? (c.status === "RISK" ? "DEBT" : c.name.includes("Ак Тиш") ? "PENDING" : "PAID") : "PAID";
      await prisma.payment.create({
        data: {
          clientId: c.id,
          kind: "SUBSCRIPTION",
          amount: c.avgCheck,
          status,
          method: "TRANSFER",
          dueAt: d,
          paidAt: status === "PAID" ? d : null,
          periodMonth: mk(d),
          execUserId: c.targetologId,
          accountId: bank.id,
          ...split("SUBSCRIPTION", c.avgCheck),
        },
      });
    }
  }
  // разовые услуги
  await prisma.payment.create({
    data: {
      clientId: clients[3].id,
      kind: "SITE",
      amount: 25000,
      status: "PAID",
      method: "CASH",
      dueAt: ago(12),
      paidAt: ago(12),
      periodMonth: mk(ago(12)),
      execUserId: dev.id,
      comment: "Лендинг клиники",
      ...split("SITE", 25000),
    },
  });
  await prisma.payment.create({
    data: {
      clientId: clients[4].id,
      kind: "BOT",
      amount: 18000,
      status: "PENDING",
      method: "INVOICE",
      dueAt: ahead(2),
      periodMonth: mk(new Date()),
      execUserId: dev.id,
      comment: "Чат-бот записи на пробный урок",
      ...split("BOT", 18000),
    },
  });

  // отчёты по неделям
  for (const c of clients.slice(0, 6)) {
    for (let w = 3; w >= 0; w--) {
      const spent = 12000 + w * 1500;
      const leads = w === 0 && c.status === "RISK" ? 14 : 30 - w * 3;
      await prisma.adReport.create({
        data: {
          clientId: c.id,
          authorId: c.targetologId,
          periodFrom: ago(7 * (w + 1)),
          periodTo: ago(7 * w),
          budget: 15000,
          spent,
          leads,
          actions: Math.round(leads * 0.3),
          targetCpl: 500,
          targetCpa: 1800,
          bundles: w === 0 ? "2 связки в масштабе, 3 в тесте" : "тест связок",
          comment: null,
        },
      });
    }
  }

  const stages = ["BRIEF", "HYPOTHESES", "SHOOTING", "LAUNCH", "FILTER", "SCALE", "UPDATE"];
  const titles = [
    "Собрать бриф и доступы",
    "Написать 10 гипотез + ТЗ на съёмку",
    "Клиент снимает 5 роликов",
    "Запустить тест 5 связок",
    "Отсечь связки дороже 500 сом",
    "Масштабировать рабочую связку",
    "Обновить креативы",
  ];
  for (let i = 0; i < clients.length - 1; i++) {
    const c = clients[i];
    await prisma.task.create({
      data: {
        title: titles[i % titles.length],
        board: "TARGET",
        stage: stages[i % stages.length],
        clientId: c.id,
        assigneeId: c.targetologId,
        dueAt: ahead((i % 5) + 1),
      },
    });
  }
  await prisma.task.create({
    data: {
      title: "Лендинг клиники: сборка страницы",
      board: "DEV",
      stage: "DEV",
      clientId: clients[3].id,
      assigneeId: dev.id,
      dueAt: ahead(4),
    },
  });
  await prisma.task.create({
    data: {
      title: "Чат-бот записи: подключить CRM",
      board: "DEV",
      stage: "BRIEF",
      clientId: clients[4].id,
      assigneeId: dev.id,
      dueAt: ahead(9),
    },
  });
  await prisma.task.create({
    data: {
      title: "Смонтировать 5 Reels для кофейни",
      board: "VIDEO",
      stage: "EDIT",
      clientId: clients[1].id,
      assigneeId: dev.id,
      dueAt: ahead(3),
    },
  });

  // расходы за 4 месяца
  const expenseDefs = [
    ["Аренда офиса", "OFFICE", 25000, true],
    ["Интернет и связь", "OFFICE", 3500, true],
    ["Подписка на сервис аналитики", "SUBSCRIPTION", 4200, true],
    ["Хостинг и домены", "SUBSCRIPTION", 2800, true],
    ["Налоги и комиссии банка", "TAX", 12000, true],
    ["Обучение по таргету", "EDU", 15000, false],
  ] as const;
  for (let i = 3; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    for (const [title, category, amount, recurring] of expenseDefs) {
      if (!recurring && i !== 1) continue;
      const spentAt = new Date(d.getFullYear(), d.getMonth(), 10);
      await prisma.expense.create({
        data: {
          title,
          category,
          amount,
          status: i === 0 && category === "TAX" ? "PLANNED" : "PAID",
          method: category === "OFFICE" ? "CASH" : "CARD",
          spentAt,
          periodMonth: mk(spentAt),
          recurring,
          accountId: category === "OFFICE" ? cash.id : card.id,
        },
      });
    }
  }
  // выплаты таргетологам за прошлый месяц
  const prev = new Date();
  prev.setMonth(prev.getMonth() - 1);
  for (const t of [t1, t2])
    await prisma.expense.create({
      data: {
        title: `Выплата: ${t.name}`,
        category: "SALARY",
        amount: t.id === t1.id ? 54400 : 39100,
        status: "PAID",
        method: "TRANSFER",
        spentAt: new Date(prev.getFullYear(), prev.getMonth(), 28),
        periodMonth: mk(prev),
        userId: t.id,
        accountId: bank.id,
        comment: "доля с проектов за месяц",
      },
    });
  // расход по конкретному проекту
  await prisma.expense.create({
    data: {
      title: "Реклама за наш счёт (тестовый бюджет)",
      category: "ADS",
      amount: 8000,
      status: "PAID",
      method: "CARD",
      spentAt: ago(9),
      periodMonth: mk(ago(9)),
      clientId: clients[0].id,
      comment: "первый тест перед стартом абонплаты",
    },
  });

  console.log("Демо-данные готовы. Вход: owner@prime.kg / " + PW);
  void owner;
}

main().finally(() => prisma.$disconnect());
