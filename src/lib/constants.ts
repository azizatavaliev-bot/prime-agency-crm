export const ROLES = {
  SUPER_ADMIN: "Супер-админ",
  ADMIN: "Админ",
  TEAM_LEAD: "Тимлид",
  TARGETOLOG: "Таргетолог",
  ACCOUNTANT: "Бухгалтер",
  DEVELOPER: "Разработчик",
  EDITOR: "Видеомонтажёр",
} as const;
export type Role = keyof typeof ROLES;

/** Роли с полным доступом к управлению агентством. */
export const MANAGEMENT_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "TEAM_LEAD"];
/** Исполнительские роли без доступа к финансам агентства. */
export const WORKER_ROLES: Role[] = ["DEVELOPER", "EDITOR"];

export const CLIENT_STATUS = {
  TEST: "Тест",
  ACTIVE: "Ведётся",
  RISK: "Риск оттока",
  PAUSED: "Приостановлен",
  CHURNED: "Отток",
} as const;

export const CLIENT_STATUS_COLOR: Record<string, string> = {
  TEST: "bg-sky-100 text-sky-700 border-sky-200",
  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  RISK: "bg-amber-100 text-amber-700 border-amber-200",
  PAUSED: "bg-zinc-100 text-zinc-600 border-zinc-200",
  CHURNED: "bg-red-100 text-red-700 border-red-200",
};

export const SERVICES = {
  TARGET: "Таргет",
  SITE: "Сайт",
  BOT: "Чат-бот",
  VIDEO: "Монтаж",
} as const;

export const PAYMENT_KIND = {
  SUBSCRIPTION: "Абонплата",
  SITE: "Сайт",
  BOT: "Чат-бот",
  VIDEO: "Монтаж",
} as const;

export const PAYMENT_STATUS = {
  PAID: "Оплачено",
  PENDING: "Ожидается",
  DEBT: "Долг",
} as const;

export const PAYMENT_STATUS_COLOR: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  DEBT: "bg-red-100 text-red-700 border-red-200",
};

export const PAYMENT_METHOD = {
  TRANSFER: "Перевод",
  CASH: "Наличные",
  INVOICE: "Счёт",
} as const;

export const BOARDS = {
  TARGET: "Таргет",
  DEV: "Разработка",
  VIDEO: "Монтаж",
} as const;

/**
 * Универсальные этапы доски «Таргет»: раньше здесь был длинный конвейер
 * рекламного отдела (бриф → гипотезы → съёмка → запуск → отсев → масштаб →
 * обновление). Упростили по просьбе владельца до статусов, которые подходят
 * для любой задачи, а не только для рекламного конвейера.
 */
export const TARGET_STAGES = {
  TODO: "К выполнению",
  IN_PROGRESS: "В работе",
  DONE: "Выполнено",
} as const;

/** Старые ключи этапов доски «Таргет» → новые, для миграции и подстраховки в коде. */
export const LEGACY_TARGET_STAGE_MAP: Record<string, keyof typeof TARGET_STAGES> = {
  BRIEF: "TODO",
  HYPOTHESES: "TODO",
  SHOOTING: "TODO",
  LAUNCH: "IN_PROGRESS",
  FILTER: "IN_PROGRESS",
  SCALE: "IN_PROGRESS",
  UPDATE: "IN_PROGRESS",
};

/** Приводит любой (в т.ч. устаревший) ключ этапа доски «Таргет» к новой схеме. */
export function normalizeTargetStage(stage: string): string {
  if (stage in TARGET_STAGES) return stage;
  return LEGACY_TARGET_STAGE_MAP[stage] ?? "TODO";
}

export const DEV_STAGES = {
  BRIEF: "Бриф",
  DESIGN: "Прототип",
  DEV: "Разработка",
  REVIEW: "Правки",
  DONE: "Сдано",
} as const;

export const VIDEO_STAGES = {
  BRIEF: "Материалы",
  EDIT: "Монтаж",
  REVIEW: "Правки",
  DONE: "Сдано",
} as const;

/** Приоритеты задач. Один источник для доски, модалки, бота и отчётов. */
export const PRIORITY = {
  URGENT: "Срочно",
  HIGH: "Высокий",
  MEDIUM: "Обычный",
  LOW: "Низкий",
} as const;

export const PRIORITY_COLOR: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700 border-red-200",
  HIGH: "bg-amber-100 text-amber-700 border-amber-200",
  MEDIUM: "bg-zinc-100 text-zinc-700 border-zinc-200",
  LOW: "bg-sky-100 text-sky-700 border-sky-200",
};

/** Цвет полосы слева на карточке — приоритет виден, не открывая задачу. */
export const PRIORITY_BAR: Record<string, string> = {
  URGENT: "#ef4444",
  HIGH: "#f59e0b",
  MEDIUM: "#d4d4d8",
  LOW: "#0ea5e9",
};

export const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export const TASK_TAG = {
  FIX: "Правки",
  URGENT_CLIENT: "Срочно от клиента",
  WAITING: "Ждём материалы",
  IDEA: "Идея",
} as const;

export const RECURRENCE = {
  DAILY: "Каждый день",
  WEEKDAYS: "По будням",
  WEEKLY: "Каждую неделю",
  MONTHLY: "Каждый месяц",
} as const;

export function stagesFor(board: string): Record<string, string> {
  if (board === "DEV") return DEV_STAGES;
  if (board === "VIDEO") return VIDEO_STAGES;
  return TARGET_STAGES;
}

// Доли по умолчанию (настраиваются в Настройках)
export const DEFAULTS = {
  targetologShare: 0.34, // 33–35% от чека
  devShare: 0.4, // 40% с разработки
  reserveShare: 0.12, // 10–15%
  projectLimit: 5,
  usdRate: 87.42, // курс доллара для рекламных расходов в USD
};

export const EXPENSE_CATEGORY = {
  ADS: "Реклама за наш счёт",
  SALARY: "Выплаты команде",
  SUBSCRIPTION: "Сервисы и подписки",
  OFFICE: "Офис и связь",
  TAX: "Налоги и комиссии",
  EDU: "Обучение",
  OTHER: "Прочее",
} as const;

export const EXPENSE_CATEGORY_COLOR: Record<string, string> = {
  ADS: "bg-sky-100 text-sky-700 border-sky-200",
  SALARY: "bg-emerald-100 text-emerald-700 border-emerald-200",
  SUBSCRIPTION: "bg-amber-100 text-amber-700 border-amber-200",
  OFFICE: "bg-zinc-100 text-zinc-700 border-zinc-200",
  TAX: "bg-red-100 text-red-700 border-red-200",
  EDU: "bg-sky-100 text-sky-700 border-sky-200",
  OTHER: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

export const EXPENSE_STATUS = {
  PAID: "Оплачен",
  PLANNED: "Запланирован",
} as const;

export const EXPENSE_STATUS_COLOR: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PLANNED: "bg-amber-100 text-amber-700 border-amber-200",
};

export const EXPENSE_METHOD = {
  TRANSFER: "Перевод",
  CASH: "Наличные",
  CARD: "Карта",
} as const;

export const INCOME_CATEGORY = {
  CLIENT: "Оплата клиента",
  REFUND: "Возврат средств",
  PARTNER: "Партнёрские",
  OWN: "Внесение своих",
  OTHER: "Прочее",
} as const;

export const ACCOUNT_KIND = {
  CASH: "Наличные",
  BANK: "Банковский счёт",
  CARD: "Карта",
} as const;

export const MARKETING_CHANNEL = {
  TARGET: "Таргет",
  ORGANIC: "Органика",
} as const;

export const MARKETING_SOURCE = {
  FACEBOOK: "Facebook/Instagram",
  GOOGLE: "Google",
  TIKTOK: "TikTok",
  TELEGRAM: "Telegram",
  YOUTUBE: "YouTube",
  SEO: "SEO",
  REFERRAL: "Рекомендация",
  OTHER: "Другое",
} as const;

export const MARKETING_DIRECTION = {} as const;

/** Цель рекламной кампании (Meta/Instagram) — определяет, какие метрики важны в отчёте. */
export const REPORT_OBJECTIVE = {
  ENGAGEMENT: "Вовлечённость",
  TRAFFIC: "Трафик",
} as const;

/** Показатели, по которым ставим план на месяц. */
export const GOAL_METRIC = {
  REVENUE: "Выручка, сом",
  PROFIT: "Прибыль владельца, сом",
  LEADS: "Заявки, шт",
  CLIENTS: "Активные клиенты, шт",
  CPL: "Цена заявки, сом",
} as const;

export const GOAL_METRIC_HINT: Record<string, string> = {
  REVENUE: "Все оплаты клиентов плюс прочие приходы за месяц.",
  PROFIT: "Ваша доля с оплат минус расходы месяца.",
  LEADS: "Заявки из отчётов по таргету за месяц.",
  CLIENTS: "Сколько клиентов в работе на конец месяца.",
  CPL: "Цель считается взятой, когда факт НИЖЕ плана — это цена, а не результат.",
};

/** Роль на проекте — отличается от роли в системе: один человек может вести проект как аккаунт. */
export const PROJECT_ROLE = {
  TARGETOLOG: "Таргетолог",
  TEAM_LEAD: "Аккаунт-менеджер",
  CONTRACTOR: "Подрядчик",
} as const;

export const RATE_TYPE = {
  PERCENT: "Процент от чека",
  FIXED: "Фикс за месяц",
} as const;

/** За что даём премию. Порог у каждой метрики свой — см. подсказки в настройках. */
export const BONUS_METRIC = {
  CPL_TARGET: "Уложился в целевую цену заявки",
  TASKS_ONTIME: "Задачи закрыты в срок",
  REVENUE_PLAN: "Выполнен план по выручке агентства",
  CLIENT_RETAINED: "Клиент удержан за месяц",
} as const;

export const BONUS_METRIC_HINT: Record<string, string> = {
  CPL_TARGET:
    "Считаем CPL по всем отчётам клиента за месяц. Порог — допуск в % к целевой цене заявки: 0 — строго не выше цели, 10 — прощаем превышение на 10%.",
  TASKS_ONTIME:
    "Доля задач, закрытых не позже дедлайна, из всех закрытых за месяц. Порог — минимальный процент, например 90.",
  REVENUE_PLAN:
    "Сработает, если факт выручки агентства за месяц дошёл до цели REVENUE из раздела «Цели». Порог не используется.",
  CLIENT_RETAINED:
    "Начисляем за каждый проект, где человек работал в этом месяце. Порог не используется.",
};

export const BONUS_AMOUNT_TYPE = {
  FIXED: "Фиксированная сумма",
  PERCENT: "Процент от доли с проектов",
} as const;

/** Что делаем с клиентом после окончания договора. */
export const RENEWAL_MODE = {
  AUTO: "Продлевается автоматически",
  NEGOTIATE: "Пересматриваем условия",
  ONE_TIME: "Разовый проект, без продления",
} as const;

export const LEDGER_KIND = {
  PAYMENT: "Оплата клиента",
  INCOME: "Приход",
  EXPENSE: "Расход",
  TRANSFER: "Перевод",
} as const;
