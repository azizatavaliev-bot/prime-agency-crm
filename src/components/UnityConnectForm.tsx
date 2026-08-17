"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, LogIn } from "lucide-react";
import { connectUnity, type ConnectUnityState } from "@/lib/unityActions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      <LogIn size={15} /> {pending ? "Подключаю…" : "Подключить"}
    </button>
  );
}

export default function UnityConnectForm({ defaultUsername, reconnect }: { defaultUsername?: string; reconnect?: boolean }) {
  const [state, formAction] = useActionState<ConnectUnityState, FormData>(connectUnity, { ok: true });

  return (
    <form action={formAction} className="card max-w-sm space-y-3 p-5">
      <div>
        <div className="font-medium">{reconnect ? "Переподключить Unity" : "Подключить Unity"}</div>
        <div className="mt-0.5 text-sm text-muted">
          {reconnect
            ? "Связь с Unity истекла — введите логин и пароль ещё раз."
            : "Обычно совпадает с вашим входом в Prime."}
        </div>
      </div>
      <input
        className="input"
        name="username"
        required
        autoFocus
        defaultValue={defaultUsername}
        placeholder="Логин в Unity"
      />
      <input className="input" name="password" type="password" required placeholder="Пароль" />
      {!state.ok && state.error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle size={15} className="shrink-0" /> {state.error}
        </div>
      )}
      <SubmitButton />
    </form>
  );
}
