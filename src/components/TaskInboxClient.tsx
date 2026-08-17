"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Sparkles, Check, X, Mic, MessageSquare, FileText, CalendarDays, AlertTriangle } from "lucide-react";
import { extractCandidates, confirmCandidate, rejectCandidate, type ExtractState } from "@/lib/taskCandidateActions";
import { PRIORITY } from "@/lib/constants";
import { toInputDate } from "@/lib/format";
import Select from "./Select";
import DatePicker from "./DatePicker";

const SOURCE_OPTIONS: { value: string; label: string; icon: typeof Mic }[] = [
  { value: "MANUAL", label: "Текст", icon: FileText },
  { value: "AUDIO", label: "Аудио (транскрипт)", icon: Mic },
  { value: "CHAT", label: "Чат", icon: MessageSquare },
];

const SOURCE_LABEL: Record<string, string> = { MANUAL: "текст", AUDIO: "аудио", CHAT: "чат" };

function ExtractButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      <Sparkles size={15} /> {pending ? "Разбираю…" : "Вычленить задачи"}
    </button>
  );
}

export type CandidateData = {
  id: string;
  source: string;
  title: string;
  comment: string | null;
  clientId: string | null;
  assigneeId: string | null;
  dueAt: string | null;
  priority: string;
  rawText: string;
};

type Opt = { id: string; name: string };

function CandidateCard({ candidate, clients, users }: { candidate: CandidateData; clients: Opt[]; users: Opt[] }) {
  const [busy, setBusy] = useState(false);

  return (
    <form
      action={async (fd) => {
        setBusy(true);
        await confirmCandidate(fd);
      }}
      className="card space-y-3 p-4"
    >
      <input type="hidden" name="id" value={candidate.id} />
      <div className="flex items-center gap-2 text-xs text-muted">
        {SOURCE_LABEL[candidate.source] ?? candidate.source}
        {candidate.rawText && <span className="truncate italic">«{candidate.rawText.slice(0, 90)}»</span>}
      </div>

      <input
        className="input !text-base font-medium"
        name="title"
        required
        defaultValue={candidate.title}
        placeholder="Что нужно сделать?"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="label">Проект</div>
          <Select
            name="clientId"
            defaultValue={candidate.clientId ?? ""}
            placeholder="— без проекта —"
            options={[{ value: "", label: "— без проекта —" }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </div>
        <div>
          <div className="label">Ответственный</div>
          <Select
            name="assigneeId"
            defaultValue={candidate.assigneeId ?? ""}
            placeholder="— не назначен —"
            options={[{ value: "", label: "— не назначен —" }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="label flex items-center gap-1.5">
            <CalendarDays size={13} /> Срок
          </div>
          <DatePicker name="dueAt" defaultValue={candidate.dueAt ? toInputDate(candidate.dueAt) : ""} />
        </div>
        <div>
          <div className="label">Приоритет</div>
          <Select
            name="priority"
            defaultValue={candidate.priority}
            options={Object.entries(PRIORITY).map(([value, label]) => ({ value, label }))}
          />
        </div>
      </div>

      <textarea
        className="input"
        name="comment"
        rows={2}
        defaultValue={candidate.comment ?? ""}
        placeholder="Комментарий (необязательно)"
      />

      <div className="flex gap-2">
        <button className="btn-primary flex-1" disabled={busy} type="submit">
          <Check size={15} /> Создать задачу
        </button>
        <button
          className="btn-ghost"
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const fd = new FormData();
            fd.set("id", candidate.id);
            await rejectCandidate(fd);
          }}
        >
          <X size={15} /> Отклонить
        </button>
      </div>
    </form>
  );
}

export default function TaskInboxClient({
  candidates,
  clients,
  users,
}: {
  candidates: CandidateData[];
  clients: Opt[];
  users: Opt[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [source, setSource] = useState("MANUAL");
  const [state, formAction] = useActionState<ExtractState, FormData>(extractCandidates, { ok: true });

  useEffect(() => {
    if (state.ok && state.count !== undefined) {
      formRef.current?.reset();
      setSource("MANUAL");
    }
  }, [state]);

  return (
    <div className="space-y-6">
      <form ref={formRef} action={formAction} className="card space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          {SOURCE_OPTIONS.map((o) => {
            const Icon = o.icon;
            const active = source === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setSource(o.value)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition ${
                  active ? "accent-gradient text-white font-medium" : "bg-subtle text-muted hover:text-zinc-900"
                }`}
              >
                <Icon size={14} /> {o.label}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="source" value={source} />
        <textarea
          className="input"
          name="rawText"
          required
          rows={6}
          placeholder={
            source === "AUDIO"
              ? "Вставьте транскрипт записи планёрки…"
              : source === "CHAT"
                ? "Вставьте лог сообщений из командного чата…"
                : "Вставьте заметки, лог чата или транскрипт — ИИ найдёт в тексте задачи…"
          }
        />
        {!state.ok && state.error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle size={15} className="shrink-0" /> {state.error}
          </div>
        )}
        {state.ok && state.count === 0 && (
          <div className="text-sm text-muted">ИИ не нашёл в тексте конкретных задач.</div>
        )}
        <ExtractButton />
      </form>

      {candidates.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">Кандидатов на подтверждение нет</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map((c) => (
            <CandidateCard key={c.id} candidate={c} clients={clients} users={users} />
          ))}
        </div>
      )}
    </div>
  );
}
