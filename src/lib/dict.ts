import "server-only";
import { prisma } from "./prisma";
import {
  CLIENT_STATUS,
  CLIENT_STATUS_COLOR,
  SERVICES,
  PAYMENT_METHOD,
  PAYMENT_KIND,
  EXPENSE_CATEGORY,
  INCOME_CATEGORY,
  TARGET_STAGES,
  DEV_STAGES,
  VIDEO_STAGES,
  ACCOUNT_KIND,
} from "./constants";

export const DICT_TYPES = {
  CLIENT_STATUS: "Статусы клиентов",
  SERVICE: "Услуги агентства",
  SOURCE: "Источники заявок",
  NICHE: "Ниши клиентов",
  PAYMENT_KIND: "Типы оплат",
  PAYMENT_METHOD: "Способы оплаты",
  EXPENSE_CATEGORY: "Категории расходов",
  INCOME_CATEGORY: "Категории приходов",
  ACCOUNT_KIND: "Типы счетов",
  STAGE_TARGET: "Этапы доски «Таргет»",
  STAGE_DEV: "Этапы доски «Разработка»",
  STAGE_VIDEO: "Этапы доски «Монтаж»",
} as const;

export type DictType = keyof typeof DICT_TYPES;

/** Подсказка под каждым справочником в настройках — что именно он меняет. */
export const DICT_HINT: Record<DictType, string> = {
  CLIENT_STATUS: "Статусы в карточке клиента и в списке. Активными считаются Тест, Ведётся и Риск оттока.",
  SERVICE: "Услуги, которые отмечаются галочками в карточке клиента.",
  SOURCE: "Откуда пришёл клиент — подсказки в карточке и разрез в аналитике.",
  NICHE: "Ниши для быстрого выбора в карточке клиента.",
  PAYMENT_KIND: "Типы оплат: абонплата и разовые услуги. Влияет на распределение долей.",
  PAYMENT_METHOD: "Как клиент платит: перевод, наличные, счёт.",
  EXPENSE_CATEGORY: "Категории в разделе «Расходы» и в отчёте по категориям.",
  INCOME_CATEGORY: "Категории прочих приходов в разделе «Финансы».",
  ACCOUNT_KIND: "Типы счетов: касса, банк, карта.",
  STAGE_TARGET: "Колонки канбана по таргету — этапы конвейера заявок.",
  STAGE_DEV: "Колонки канбана разработки сайтов и ботов.",
  STAGE_VIDEO: "Колонки канбана монтажа.",
};

const FALLBACK: Record<DictType, Record<string, string>> = {
  CLIENT_STATUS: CLIENT_STATUS,
  SERVICE: SERVICES,
  SOURCE: {},
  NICHE: {},
  PAYMENT_KIND: PAYMENT_KIND,
  PAYMENT_METHOD: PAYMENT_METHOD,
  EXPENSE_CATEGORY: EXPENSE_CATEGORY,
  INCOME_CATEGORY: INCOME_CATEGORY,
  ACCOUNT_KIND: ACCOUNT_KIND,
  STAGE_TARGET: TARGET_STAGES,
  STAGE_DEV: DEV_STAGES,
  STAGE_VIDEO: VIDEO_STAGES,
};

export type DictOption = { key: string; name: string; color?: string | null };

/** Значения справочника: из базы, а если пусто — встроенные константы. */
export async function dict(type: DictType, includeInactive = false): Promise<DictOption[]> {
  const rows = await prisma.dictItem.findMany({
    where: { type, ...(includeInactive ? {} : { active: true }) },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  if (rows.length) return rows.map((r) => ({ key: r.key, name: r.name, color: r.color }));
  return Object.entries(FALLBACK[type]).map(([key, name]) => ({
    key,
    name,
    color: type === "CLIENT_STATUS" ? CLIENT_STATUS_COLOR[key] : null,
  }));
}

/** Несколько справочников одним запросом. */
export async function dicts<T extends DictType>(types: T[]): Promise<Record<T, DictOption[]>> {
  const rows = await prisma.dictItem.findMany({
    where: { type: { in: types as string[] }, active: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  const out = {} as Record<T, DictOption[]>;
  for (const t of types) {
    const found = rows.filter((r) => r.type === t);
    out[t] = found.length
      ? found.map((r) => ({ key: r.key, name: r.name, color: r.color }))
      : Object.entries(FALLBACK[t]).map(([key, name]) => ({
          key,
          name,
          color: t === "CLIENT_STATUS" ? CLIENT_STATUS_COLOR[key] : null,
        }));
  }
  return out;
}

export function labelOf(list: DictOption[], key: string | null | undefined) {
  if (!key) return "—";
  return list.find((i) => i.key === key)?.name ?? key;
}

export function colorOf(list: DictOption[], key: string | null | undefined) {
  return list.find((i) => i.key === key)?.color ?? undefined;
}

/** Этапы доски задач из справочника. */
export async function stagesOf(board: string): Promise<DictOption[]> {
  if (board === "DEV") return dict("STAGE_DEV");
  if (board === "VIDEO") return dict("STAGE_VIDEO");
  return dict("STAGE_TARGET");
}
