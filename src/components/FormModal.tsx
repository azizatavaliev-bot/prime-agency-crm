"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import ModalShell from "./ModalShell";

/**
 * Модалка с формой: кнопка-триггер + окно, которое закрывается после отправки.
 * Каркас общий — см. ModalShell.
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={variant === "primary" ? "btn-primary" : "btn-ghost"}
        title={label || title}
        aria-label={label || title}
      >
        {icon}
        {label}
      </button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        icon={icon}
        width={width}
        z={60}
      >
        {hint && (
          <div className="accent-soft mb-4 flex gap-2 rounded-2xl p-3 text-xs">
            <Info size={14} className="accent-text mt-0.5 shrink-0" />
            <span className="text-muted">{hint}</span>
          </div>
        )}
        {/* Форма отправлена — окно закрываем, чтобы не жать «крестик» руками */}
        <div onSubmit={() => setTimeout(() => setOpen(false), 50)}>{children}</div>
      </ModalShell>
    </>
  );
}
