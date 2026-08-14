"use client";

import { useState } from "react";
import { Share2, Copy, Check, Send, MessageCircle, RefreshCw, Eye, EyeOff } from "lucide-react";
import { resetUserPassword } from "@/lib/actions";
import ModalShell from "./ModalShell";

/**
 * Передача доступа новому сотруднику: генерируем пароль и готовое сообщение,
 * которое остаётся просто отправить в Telegram или WhatsApp.
 *
 * Пароль показывается один раз — в базе лежит только его хеш.
 */
export default function ShareAccess({
  userId,
  name,
  email,
  roleLabel,
  appUrl,
}: {
  userId: string;
  name: string;
  email: string;
  roleLabel: string;
  appUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(true);

  const message = password
    ? `Привет, ${name}! 👋

Тебя добавили в систему агентства Prime.
Роль: ${roleLabel}

🔗 Ссылка для входа: ${appUrl}
👤 Логин: ${email}
🔑 Пароль: ${password}

Как начать:
1. Открой ссылку на телефоне или компьютере.
2. Введи логин и пароль.
3. Смени пароль на свой — «Профиль» → «Пароль».
4. В разделе «Задачи» появятся твои задачи, в «Регламентах» — что ты ведёшь.

Сохрани это сообщение до первого входа: пароль больше нигде не показывается.
Если что-то не открывается — напиши мне.`
    : "";

  const generate = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("id", userId);
      const pass = await resetUserPassword(fd);
      setPassword(pass);
      setOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="btn-ghost !px-2.5 !py-1.5 !text-xs"
        title="Создать пароль и получить готовое сообщение"
      >
        {busy ? <RefreshCw size={14} className="animate-spin" /> : <Share2 size={14} />}
        Поделиться
      </button>

      <ModalShell
        open={open && Boolean(password)}
        onClose={() => setOpen(false)}
        title={`Доступ для ${name}`}
        icon={<Share2 size={16} />}
        width="max-w-lg"
        z={70}
      >
        <div className="mb-4 text-sm text-muted">
          Пароль создан. Скопируйте сообщение и отправьте сотруднику — второй раз он не покажется.
        </div>

        <div className="mb-3 grid gap-2 rounded-2xl border border-zinc-200 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">Логин</span>
            <span className="font-medium">{email}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">Пароль</span>
            <span className="flex items-center gap-2">
              <code className="font-mono font-medium">{shown ? password : "••••••••••"}</code>
              <button
                type="button"
                onClick={() => setShown((v) => !v)}
                className="rounded p-1 text-muted hover:bg-subtle"
                aria-label={shown ? "Скрыть" : "Показать"}
              >
                {shown ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </span>
          </div>
        </div>

        <textarea
          readOnly
          value={message}
          rows={9}
          className="input mb-3 font-mono !text-[12px] leading-relaxed"
          onFocus={(e) => e.currentTarget.select()}
        />

        <div className="grid gap-2 sm:grid-cols-3">
          <button
            onClick={async () => {
              // На телефоне системное меню удобнее: там сразу все мессенджеры.
              if (navigator.share) {
                try {
                  await navigator.share({ title: "Доступ в систему Prime", text: message });
                  return;
                } catch {
                  /* закрыл окно — просто копируем */
                }
              }
              await copy();
            }}
            className="btn-primary"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Скопировано" : "Копировать"}
          </button>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost justify-center"
          >
            <Send size={15} /> Telegram
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost justify-center"
          >
            <MessageCircle size={15} /> WhatsApp
          </a>
        </div>
      </ModalShell>
    </>
  );
}
