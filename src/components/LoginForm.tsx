"use client";

import { useState } from "react";
import { Eye, EyeOff, LogIn, Loader2, AlertCircle } from "lucide-react";

/**
 * Форма входа. Пароль можно показать: набирать вслепую с телефона неудобно,
 * особенно когда его прислали сообщением и вводят вручную.
 */
export default function LoginForm({
  action,
  error,
}: {
  action: (fd: FormData) => Promise<void>;
  error?: boolean;
}) {
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <form
      action={async (fd) => {
        setBusy(true);
        try {
          await action(fd);
        } finally {
          setBusy(false);
        }
      }}
      className="mt-6 space-y-4"
    >
      <div>
        <label className="label" htmlFor="login">
          Логин
        </label>
        <input
          id="login"
          className="input"
          name="login"
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="login"
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Пароль
        </label>
        <div className="relative">
          <input
            id="password"
            className="input pr-11"
            name="password"
            type={shown ? "text" : "password"}
            required
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted transition hover:bg-subtle"
            aria-label={shown ? "Скрыть пароль" : "Показать пароль"}
            tabIndex={-1}
          >
            {shown ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>Неверный логин или пароль.</span>
        </div>
      )}

      <button className="btn-primary w-full !py-3" disabled={busy}>
        {busy ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Входим…
          </>
        ) : (
          <>
            <LogIn size={16} /> Войти
          </>
        )}
      </button>
    </form>
  );
}
