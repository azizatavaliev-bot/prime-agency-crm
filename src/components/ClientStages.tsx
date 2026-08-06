"use client";

import { TrendingUp } from "lucide-react";
import { setClientStatus } from "@/lib/actions";

/**
 * Этап клиента — кликабельная лента, как в FADAMOS.
 * Раньше статус менялся только через форму редактирования: чтобы поставить
 * «Пауза», приходилось открывать карточку целиком.
 */
export default function ClientStages({
  clientId,
  current,
  stages,
  canEdit,
}: {
  clientId: string;
  current: string;
  stages: { key: string; name: string; color?: string | null }[];
  canEdit: boolean;
}) {
  const currentName = stages.find((s) => s.key === current)?.name ?? current;

  return (
    <div className="rounded-2xl border border-zinc-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <TrendingUp size={15} className="accent-text" /> Этап клиента
        </div>
        <div className="text-xs text-muted">
          Сейчас: <span className="font-medium text-zinc-900">{currentName}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {stages.map((s) => {
          const active = s.key === current;
          if (!canEdit)
            return (
              <span
                key={s.key}
                className={`chip ${active ? s.color ?? "accent-gradient border-transparent text-white" : "border-zinc-200 text-muted"}`}
              >
                {s.name}
              </span>
            );
          return (
            <form key={s.key} action={setClientStatus}>
              <input type="hidden" name="id" value={clientId} />
              <input type="hidden" name="status" value={s.key} />
              <button
                className={`chip transition ${
                  active
                    ? s.color ?? "accent-gradient border-transparent text-white"
                    : "border-zinc-200 text-muted hover:bg-subtle hover:text-zinc-900"
                }`}
              >
                {s.name}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
