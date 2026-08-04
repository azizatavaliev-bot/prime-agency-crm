"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, X, Wallet } from "lucide-react";
import { markPaid } from "@/lib/actions";

/**
 * Отметка оплаты с подтверждением: деньги — не то место, где стоит менять
 * статус случайным кликом по строке. Показываем клиента, сумму и срок.
 */
export default function MarkPaidButton({
  paymentId,
  clientName,
  amount,
  dueAt,
  compact = false,
}: {
  paymentId: string;
  clientName: string;
  amount: string;
  dueAt: string;
  compact?: boolean;
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
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={compact ? "btn-ghost !px-3 !py-1 !text-xs" : "btn-ghost !px-3 !py-1.5 !text-xs"}
      >
        <CheckCircle2 size={13} /> Оплачено
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
            <div
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px] animate-[fadeIn_.15s_ease-out]"
              onClick={() => setOpen(false)}
            />
            <div className="surface relative w-full max-w-sm rounded-t-3xl p-5 shadow-2xl animate-[slideUp_.2s_ease-out] sm:rounded-3xl sm:p-6">
              <button
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 rounded-xl p-1.5 text-muted transition hover:bg-subtle"
                aria-label="Закрыть"
              >
                <X size={16} />
              </button>

              <div className="accent-gradient mb-4 flex h-11 w-11 items-center justify-center rounded-2xl text-white">
                <Wallet size={20} />
              </div>

              <div className="text-lg font-semibold tracking-tight">Подтвердить оплату</div>
              <p className="mt-1 text-sm text-muted">
                Счёт станет оплаченным, сумма попадёт в выручку текущего месяца.
              </p>

              <div className="mt-4 space-y-2 rounded-2xl bg-subtle p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted">Клиент</span>
                  <span className="font-medium">{clientName}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted">Сумма</span>
                  <span className="font-semibold">{amount}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted">Срок</span>
                  <span>{dueAt}</span>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button onClick={() => setOpen(false)} className="btn-ghost flex-1">
                  Отмена
                </button>
                <form action={markPaid} className="flex-1">
                  <input type="hidden" name="id" value={paymentId} />
                  <button className="btn-primary w-full">
                    <CheckCircle2 size={16} /> Оплачено
                  </button>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
