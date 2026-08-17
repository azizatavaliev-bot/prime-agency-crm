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
