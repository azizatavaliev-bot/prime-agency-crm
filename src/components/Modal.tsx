"use client";

import { useState } from "react";
import ModalShell from "./ModalShell";

/**
 * Модалка-просмотр: содержимое рендерится на сервере и передаётся в children,
 * поэтому окно открывается мгновенно. Каркас общий — см. ModalShell.
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

  const overlay = (
    <ModalShell
      open={open}
      onClose={() => setOpen(false)}
      title={title}
      subtitle={subtitle}
      avatar={avatar}
      badge={badge}
      width={width}
      z={50}
    >
      {children}
    </ModalShell>
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
