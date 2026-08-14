"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { changeOwnPassword } from "@/lib/actions";

const ERRORS: Record<string, string> = {
  short: "Новый пароль короче 8 символов",
  mismatch: "Пароли не совпали — проверьте второе поле",
  wrong: "Текущий пароль введён неверно",
  same: "Новый пароль совпадает со старым",
};

/** Смена своего пароля: со старым паролем, чтобы чужая открытая сессия не забрала доступ. */
export default function ChangePassword({
  error,
  changed,
}: {
  error?: string;
  changed?: boolean;
}) {
  const [shown, setShown] = useState(false);

  return (
    <form action={changeOwnPassword} className="card space-y-4 p-4">
      {changed && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Пароль изменён. Входы на других устройствах закрыты.
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {ERRORS[error] ?? "Не получилось сменить пароль"}
        </div>
      )}

      <div>
        <label className="label">Текущий пароль</label>
        <input
          className="input"
          name="current"
          type={shown ? "text" : "password"}
          required
          autoComplete="current-password"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Новый пароль</label>
          <div className="relative">
            <input
              className="input pr-10"
              name="password"
              type={shown ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="минимум 8 символов"
            />
            <button
              type="button"
              onClick={() => setShown((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:bg-subtle"
              aria-label={shown ? "Скрыть пароли" : "Показать пароли"}
            >
              {shown ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <div>
          <label className="label">Ещё раз</label>
          <input
            className="input"
            name="repeat"
            type={shown ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
      </div>

      <button className="btn-primary w-full sm:w-auto">
        <KeyRound size={15} /> Сменить пароль
      </button>

      <div className="text-xs text-muted">
        После смены вход на других устройствах закроется — войти нужно будет заново.
      </div>
    </form>
  );
}
