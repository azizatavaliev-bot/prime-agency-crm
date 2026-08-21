"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * Связь формы с модалкой, в которой она лежит.
 *
 * Раньше окно закрывалось по таймеру сразу после нажатия: кнопка молчала, окно
 * исчезало раньше ответа сервера, и казалось, что ничего не произошло. Форма с
 * SubmitButton берёт закрытие на себя (`claim`) и закрывает окно тогда, когда
 * действие сервера действительно завершилось.
 */
export type ModalCloseApi = {
  close: () => void;
  /** «Закрытием управляю я» — модалке больше не нужно закрываться по таймеру. */
  claim: () => void;
};

export const ModalCloseContext = createContext<ModalCloseApi | null>(null);

export function useModalClose() {
  return useContext(ModalCloseContext);
}

/**
 * Кнопка отправки формы: блокируется на время запроса, показывает крутилку и
 * закрывает окно, когда действие сервера отработало.
 */
export default function SubmitButton({
  children,
  pendingLabel = "Сохраняем…",
  className = "btn-primary w-full !py-2.5",
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const modal = useModalClose();
  const wasPending = useRef(false);

  useEffect(() => {
    modal?.claim();
  }, [modal]);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      return;
    }
    // Запрос был и закончился — значит сервер ответил, окно можно убирать.
    if (wasPending.current) {
      wasPending.current = false;
      modal?.close();
    }
  }, [pending, modal]);

  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" /> {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
