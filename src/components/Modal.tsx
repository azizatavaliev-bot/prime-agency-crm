"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Универсальная модалка. Содержимое рендерится на сервере и передаётся в children,
 * поэтому окно открывается мгновенно, без загрузки.
 */
export default function Modal({
  trigger,
  row,
  title,
  avatar,
  subtitle,
  badge,
  children,
  width = "max-w-3xl",
  className = "",
}: {
  /** обычный триггер-кнопка */
  trigger?: React.ReactNode;
  /** ячейки <td>: тогда триггером становится вся строка таблицы */
  row?: React.ReactNode;
  title: string;
  /** элемент слева от заголовка: аватар, иконка */
  avatar?: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
  className?: string;
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

  const overlay = (
    <>
      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px] animate-[fadeIn_.15s_ease-out]"
              onClick={() => setOpen(false)}
            />
            <div
              className={`surface relative w-full ${width} max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl animate-[slideUp_.2s_ease-out]`}
            >
              <div className="modal-head sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  {avatar}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-semibold tracking-tight">{title}</h2>
                      {badge}
                    </div>
                    {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="shrink-0 rounded-xl p-2 text-muted transition hover:bg-subtle"
                  aria-label="Закрыть"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="px-5 py-5 sm:px-6">{children}</div>
            </div>
          </div>,
          document.body
        )}
    </>
  );

  if (row)
    return (
      <tr
        className={`row-click ${className}`}
        onClick={(e) => {
          // клик по вложенной кнопке/ссылке не должен открывать модалку
          if ((e.target as HTMLElement).closest("a,button,select,input,form")) return;
          setOpen(true);
        }}
      >
        {row}
        <td className="hidden">{overlay}</td>
      </tr>
    );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`text-left ${className}`}>
        {trigger}
      </button>
      {overlay}
    </>
  );
}
