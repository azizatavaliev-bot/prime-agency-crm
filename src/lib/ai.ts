import "server-only";
import { GoogleGenAI, Type } from "@google/genai";

export type ExtractedCandidate = {
  title: string;
  comment: string | null;
  clientId: string | null;
  assigneeId: string | null;
  dueAt: string | null; // YYYY-MM-DD
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  rawText: string;
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    candidates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Короткая формулировка задачи, глагол в начале" },
          comment: { type: Type.STRING, description: "Доп. детали, если были в тексте — иначе пустая строка", nullable: true },
          clientId: { type: Type.STRING, description: "id проекта из списка, если упомянут явно — иначе пустая строка", nullable: true },
          assigneeId: { type: Type.STRING, description: "id сотрудника из списка, если явно назван ответственный — иначе пустая строка", nullable: true },
          dueAt: { type: Type.STRING, description: "Срок в формате YYYY-MM-DD, если упомянут (в т.ч. относительно текущей даты) — иначе пустая строка", nullable: true },
          priority: { type: Type.STRING, enum: ["URGENT", "HIGH", "MEDIUM", "LOW"], description: "Срочность по тону формулировки: явное 'срочно/горит' — URGENT, иначе по смыслу" },
          rawText: { type: Type.STRING, description: "Дословная цитата из исходного текста, откуда взята эта задача" },
        },
        required: ["title", "priority", "rawText"],
      },
    },
  },
  required: ["candidates"],
};

/**
 * Вычленяет кандидатов в задачи из текста планёрки/чата через Gemini.
 * Ничего не пишет в БД — чистая функция текст → структурированный список,
 * запись и подтверждение делает вызывающий код (taskCandidateActions.ts).
 */
export async function extractTaskCandidates(
  rawText: string,
  context: {
    clients: { id: string; name: string }[];
    users: { id: string; name: string; role: string }[];
    sourceLabel: string;
  }
): Promise<ExtractedCandidate[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY не настроен — добавьте ключ в .env");

  const ai = new GoogleGenAI({ apiKey });
  const today = new Date().toISOString().slice(0, 10);

  const clientsList = context.clients.map((c) => `${c.id} — ${c.name}`).join("\n") || "(проектов нет)";
  const usersList = context.users.map((u) => `${u.id} — ${u.name} (${u.role})`).join("\n") || "(сотрудников нет)";

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: rawText,
    config: {
      systemInstruction:
        `Ты помогаешь агентству вычленять задачи из ${context.sourceLabel}. ` +
        `Сегодня ${today}. Найди все поручения, договорённости и обещания сделать что-то — ` +
        `для каждого определи проект, ответственного, срок и приоритет, если это можно понять из текста. ` +
        `Не выдумывай clientId/assigneeId, которых нет в списках ниже — если не уверен, оставляй поле пустым. ` +
        `Не создавай кандидата из общих обсуждений без конкретного действия. Пиши title кратко и по-русски. ` +
        `Если задач в тексте нет — верни пустой список candidates.\n\n` +
        `Проекты (id — название):\n${clientsList}\n\nСотрудники (id — имя (роль)):\n${usersList}`,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) return [];
  const parsed = JSON.parse(text) as { candidates?: (ExtractedCandidate & { comment?: string | null })[] };
  return (parsed.candidates ?? []).map((c) => ({
    title: c.title,
    comment: c.comment || null,
    clientId: c.clientId || null,
    assigneeId: c.assigneeId || null,
    dueAt: c.dueAt || null,
    priority: c.priority || "MEDIUM",
    rawText: c.rawText,
  }));
}

export type ExtractedReportEntry = {
  sourceImageIndex: number;
  date: string; // YYYY-MM-DD
  directionName: string | null;
  objective: "LEADS" | "ENGAGEMENT" | "TRAFFIC" | "PROFILE_VISITS";
  spend: number;
  currency: "KGS" | "USD";
  metric: number; // счётчик, соответствующий objective (заявки/вовлечённость/переходы/посещения)
  impressions: number;
};

const REPORT_SCREENSHOT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    entries: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sourceImageIndex: { type: Type.INTEGER, description: "Номер скриншота (с 0), откуда взята эта строка" },
          date: { type: Type.STRING, description: "Дата в формате YYYY-MM-DD. Если на скрине период — конец периода. Если разбивка по дням — своя дата на каждую строку" },
          directionName: { type: Type.STRING, description: "Название направления/кампании/кабинета как написано на скрине — иначе пустая строка", nullable: true },
          objective: { type: Type.STRING, enum: ["LEADS", "ENGAGEMENT", "TRAFFIC", "PROFILE_VISITS"], description: "Цель кампании по тому, что считает скрин: заявки/лиды — LEADS, вовлечённость (лайки/сохранения/реакции) — ENGAGEMENT, переходы/клики — TRAFFIC, посещения профиля — PROFILE_VISITS" },
          spend: { type: Type.NUMBER, description: "Потрачено, число" },
          currency: { type: Type.STRING, enum: ["KGS", "USD"], description: "Валюта расхода на скрине" },
          metric: { type: Type.NUMBER, description: "Значение метрики, соответствующей objective" },
          impressions: { type: Type.NUMBER, description: "Показы, если есть на скрине — иначе 0" },
        },
        required: ["sourceImageIndex", "date", "objective", "spend", "currency", "metric"],
      },
    },
  },
  required: ["entries"],
};

/**
 * Вычленяет строки рекламных отчётов из скриншотов рекламных кабинетов через Gemini Vision.
 * По одному скрину может выйти несколько строк (недельная разбивка по дням/кампаниям).
 * Ничего не пишет в БД — запись и подстановку/создание направлений делает
 * reportScreenshotActions.ts.
 */
export async function extractReportsFromScreenshots(
  images: { mimeType: string; base64: string }[],
  context: { directions: { id: string; name: string }[] }
): Promise<ExtractedReportEntry[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY не настроен — добавьте ключ в .env");

  const ai = new GoogleGenAI({ apiKey });
  const today = new Date().toISOString().slice(0, 10);
  const directionsList = context.directions.map((d) => d.name).join(", ") || "(пока нет ни одного)";

  const parts = [
    {
      text:
        `Ты разбираешь скриншоты рекламных кабинетов (Meta Ads, Instagram и т.п.) для агентства. ` +
        `Сегодня ${today}. Прислано ${images.length} скриншот(ов), пронумерованных с 0 по порядку. ` +
        `Для каждого скриншота вычлени одну строку на каждую дату/кампанию, которую видишь: если это недельная ` +
        `таблица по дням — строка на каждый день; если один период целиком — одна строка с датой конца периода. ` +
        `Уже заведённые направления этого проекта: ${directionsList}. Если на скрине видно название кампании/направления, ` +
        `похожее на одно из них — пиши именно это существующее название (не выдумывай другое написание). ` +
        `Если название новое — пиши как есть, оно будет заведено как новое направление. Если направление на скрине ` +
        `не подписано вообще — оставляй directionName пустым.`,
    },
    ...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
  ];

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: parts,
    config: {
      responseMimeType: "application/json",
      responseSchema: REPORT_SCREENSHOT_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) return [];
  const parsed = JSON.parse(text) as { entries?: ExtractedReportEntry[] };
  return (parsed.entries ?? []).map((e) => ({
    sourceImageIndex: e.sourceImageIndex ?? 0,
    date: e.date,
    directionName: e.directionName || null,
    objective: e.objective || "ENGAGEMENT",
    spend: e.spend || 0,
    currency: e.currency || "KGS",
    metric: e.metric || 0,
    impressions: e.impressions || 0,
  }));
}
