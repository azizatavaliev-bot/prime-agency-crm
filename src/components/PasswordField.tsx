"use client";

import { useState } from "react";
import { RefreshCw, Copy, Check, Eye, EyeOff } from "lucide-react";

/** Без похожих символов: 0/O и 1/l/I путают при передаче голосом. */
const ALPHABET = "abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789";

function generate(len = 10) {
  const bytes = new Uint32Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/**
 * Пароль сотрудника: генерируется случайным и показывается владельцу,
 * чтобы передать лично. Раньше у всех новых был один и тот же.
 */
export default function PasswordField({ isNew }: { isNew: boolean }) {
  const [value, setValue] = useState("");
  const [shown, setShown] = useState(true);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <label className="label">Пароль</label>
      <div className="flex gap-2">
        <input
          className="input font-mono"
          name="password"
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isNew ? "нажмите «сгенерировать»" : "оставить прежним"}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => {
            setValue(generate());
            setShown(true);
          }}
          className="btn-ghost shrink-0 !px-2.5"
          title="Сгенерировать пароль"
        >
          <RefreshCw size={15} />
        </button>
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          className="btn-ghost shrink-0 !px-2.5"
          title={shown ? "Скрыть" : "Показать"}
        >
          {shown ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
        <button
          type="button"
          onClick={copy}
          disabled={!value}
          className="btn-ghost shrink-0 !px-2.5 disabled:opacity-40"
          title="Скопировать"
        >
          {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
        </button>
      </div>
      <div className="mt-1 text-xs text-muted">
        {value
          ? "Скопируйте и передайте сотруднику — после сохранения пароль больше не показывается."
          : isNew
            ? "Оставите пустым — сотрудник войдёт с паролем prime2026, лучше сгенерировать свой."
            : "Пустое поле — пароль остаётся прежним."}
      </div>
    </div>
  );
}
