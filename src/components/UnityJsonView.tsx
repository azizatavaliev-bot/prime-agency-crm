"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * Первая версия просмотра эндпоинтов Unity, чью точную форму ответа мы ещё
 * не видели вживую (задачи, поступления) — сырой JSON вместо таблицы.
 * Таблицу доточим, когда увидим реальные данные из настоящего аккаунта.
 */
export default function UnityJsonView({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(data, null, 2);

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs text-muted">
          Первая версия — таблицу доточим после того, как увидим реальные данные
        </div>
        <button
          type="button"
          className="btn-ghost !px-2 !py-1 text-xs"
          onClick={() => {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>
      <pre className="max-h-[60vh] overflow-auto rounded-xl bg-subtle p-3 text-xs leading-relaxed">{text}</pre>
    </div>
  );
}
