"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Единый каркас модального окна.
 *
 * Раньше в системе было пять разных реализаций, и вели они себя по-разному:
 * где-то не работал Esc, где-то за окном прокручивалась страница. Теперь
 * поведение в одном месте: портал, затемнение, Esc, блокировка фона, возврат
 * фокуса и безопасный отступ снизу на телефонах.
 */
export function useModalChrome(open: boolean, onClose: () => void) {
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // Фон не должен уезжать под окном
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      // Возвращаем фокус туда, откуда открыли, — иначе он падает в начало страницы
      restoreTo.current?.focus?.();
    };
  }, [open, onClose]);
}

export default function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  icon,
  avatar,
  badge,
  children,
  width = "max-w-3xl",
  /** Слой: вложенные окна должны перекрывать родительские. */
  z = 60,
  /** Компактное окно без шапки — для коротких подтверждений. */
  bare = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  avatar?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
  z?: number;
  bare?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useModalChrome(open, onClose);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-end justify-center sm:items-center"
      style={{ zIndex: z }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-zinc-900/45 backdrop-blur-[3px] animate-[fadeIn_.15s_ease-out]"
        onClick={onClose}
      />
      <div
        className={`surface relative w-full ${width} max-h-[92dvh] overflow-y-auto rounded-t-3xl shadow-2xl animate-[slideUp_.2s_ease-out] sm:rounded-3xl`}
      >
        {!bare && (
          <div className="modal-head sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              {avatar}
              {icon && (
                <span className="accent-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white">
                  {icon}
                </span>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display truncate text-lg font-semibold tracking-tight">
                    {title}
                  </h2>
                  {badge}
                </div>
                {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl p-2 text-muted transition hover:bg-subtle"
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {/* pb-safe — чтобы кнопка не пряталась под полосой жестов на телефоне */}
        <div className={`${bare ? "p-5 sm:p-6" : "px-5 py-5 sm:px-6"} pb-safe`}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
