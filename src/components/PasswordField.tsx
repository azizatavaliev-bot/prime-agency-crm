"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Пароль сотрудника — вводится вручную (владельцем или самим сотрудником
 * через администратора). Никакой автогенерации: раньше кнопка «Сгенерировать»
 * сбивала с толку и мешала ввести свой пароль.
 */
export default function PasswordField({ isNew }: { isNew: boolean }) {
  const [value, setValue] = useState("");
  const [shown, setShown] = useState(false);

  return (
    <div>
      <label className="label">Пароль {isNew && "*"}</label>
      <div className="flex gap-2">
        <input
          className="input font-mono"
          name="password"
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isNew ? "минимум 8 символов" : "оставить прежним"}
          autoComplete="new-password"
          minLength={isNew ? 8 : undefined}
          required={isNew}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          className="btn-ghost shrink-0 !px-2.5"
          title={shown ? "Скрыть" : "Показать"}
        >
          {shown ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      <div className="mt-1 text-xs text-muted">
        {isNew ? "Минимум 8 символов, любые." : "Пустое поле — пароль остаётся прежним, логин и остальные поля сохранятся."}
      </div>
    </div>
  );
}
