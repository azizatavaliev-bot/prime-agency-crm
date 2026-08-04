"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Info } from "lucide-react";

/**
 * Модалка с формой. Кнопка-триггер + окно, которое закрывается после успешной отправки.
 */
export default function FormModal({
  label,
  title,
  hint,
  children,
  width = "max-w-2xl",
  variant = "primary",
  icon,
}: {
  label: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
  width?: string;
  variant?: "primary" | "ghost";
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={variant === "primary" ? "btn-primary" : "btn-ghost"}
      >
        {icon}
        {label}
      </button>
      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
            <div
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px] animate-[fadeIn_.15s_ease-out]"
              onClick={() => setOpen(false)}
            />
            <div
              className={`surface relative w-full ${width} max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl animate-[slideUp_.2s_ease-out]`}
            >
              <div className="modal-head sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  {icon && (
                    <span className="accent-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white">
                      {icon}
                    </span>
                  )}
                  <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="shrink-0 rounded-xl p-2 text-muted transition hover:bg-subtle"
                  aria-label="Закрыть"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="px-5 py-5 sm:px-6">
                {hint && (
                  <div className="accent-soft mb-4 flex gap-2 rounded-2xl p-3 text-xs">
                    <Info size={14} className="accent-text mt-0.5 shrink-0" />
                    <span className="text-muted">{hint}</span>
                  </div>
                )}
                <div onSubmit={() => setTimeout(() => setOpen(false), 50)}>{children}</div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
