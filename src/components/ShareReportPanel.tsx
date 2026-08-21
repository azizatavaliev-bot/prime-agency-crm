"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Send, ListPlus, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { shareReportToClient, quickAddTasks } from "@/lib/actions";
import ModalShell from "./ModalShell";

/**
 * Окно после сохранения отчёта по клиенту: тот же текст, что уйдёт клиенту,
 * можно скопировать вручную, отправить прямо в Telegram, если чат привязан,
 * и сразу накидать 3–4 задачи по горячим следам — не открывая доску отдельно.
 */
export default function ShareReportPanel({
  reportId,
  clientId,
  clientName,
  hasChat,
  text,
  sent,
  error,
  tasksAdded,
}: {
  reportId: string;
  clientId: string;
  clientName: string;
  hasChat: boolean;
  text: string;
  sent: boolean;
  error?: string;
  tasksAdded?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [titles, setTitles] = useState("");

  useEffect(() => setOpen(true), [reportId]);

  const close = () => {
    setOpen(false);
    router.push("/marketing?tab=daily");
  };

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <ModalShell open={open} onClose={close} title={`Отчёт готов — ${clientName}`} icon={<Send size={16} />} width="max-w-lg">
      {sent && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 size={15} /> Отправлено клиенту в Telegram
        </div>
      )}
      {typeof tasksAdded === "number" && tasksAdded > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 size={15} /> Добавлено задач: {tasksAdded}
        </div>
      )}
      {error === "no-chat" && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <AlertTriangle size={15} /> У клиента не привязан Telegram — отправьте текст сами
        </div>
      )}

      <div className="mb-3 rounded-xl border border-zinc-200 bg-subtle p-3">
        <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-700">{text}</pre>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={copy} className="btn-ghost justify-center">
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "Скопировано" : "Скопировать"}
        </button>
        <form action={shareReportToClient}>
          <input type="hidden" name="reportId" value={reportId} />
          <button type="submit" className="btn-primary w-full justify-center" disabled={!hasChat}>
            <Send size={15} /> В Telegram
          </button>
        </form>
      </div>

      <div className="border-t border-zinc-100 pt-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <ListPlus size={15} /> Быстрые задачи по проекту
        </div>
        <p className="mb-2 text-xs text-muted">Каждая строка — своя задача, дедлайн сегодня, исполнитель — вы</p>
        <form action={quickAddTasks} className="space-y-2">
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="reportId" value={reportId} />
          <textarea
            className="input"
            name="titles"
            rows={3}
            placeholder={"Написать клиенту про новую связку\nЗапустить тест на 2 креатива\nСобрать отчёт за неделю"}
            value={titles}
            onChange={(e) => setTitles(e.target.value)}
          />
          <button type="submit" className="btn-ghost w-full justify-center" disabled={!titles.trim()}>
            <ListPlus size={15} /> Добавить в задачи
          </button>
        </form>
      </div>

      <button type="button" onClick={close} className="btn-ghost mt-4 w-full justify-center">
        <X size={15} /> Закрыть
      </button>
    </ModalShell>
  );
}
