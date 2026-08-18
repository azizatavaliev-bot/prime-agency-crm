"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X, Wallet } from "lucide-react";
import { markPaid } from "@/lib/actions";
import ModalShell from "./ModalShell";

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

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="Подтвердить оплату"
        icon={<Wallet size={16} />}
        width="max-w-sm"
        z={70}
      >
        <p className="text-sm text-muted">
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
      </ModalShell>
    </>
  );
}
