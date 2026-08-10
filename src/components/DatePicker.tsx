"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const ru = (s: string) => {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}.${m}.${y}`;
};

/**
 * Свой календарь вместо нативного <input type="date">: системный попап
 * рисуется браузером, не поддаётся стилям и выбивается из интерфейса.
 * Значение хранится в скрытом input в формате YYYY-MM-DD — как ждёт сервер.
 */
export default function DatePicker({
  name,
  defaultValue,
  required,
  placeholder = "Выберите дату",
  onChange,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  /** Необязательный колбэк — чтобы родитель мог зеркалить значение (например, в режиме "за 1 день"). */
  onChange?: (value: string) => void;
}) {
  const [value, setValueRaw] = useState(defaultValue ?? "");
  const setValue = (v: string) => {
    setValueRaw(v);
    onChange?.(v);
  };
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => (defaultValue ? new Date(defaultValue) : new Date()));
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  // понедельник — первый день недели
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = iso(new Date());

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const pick = (day: number) => {
    setValue(iso(new Date(year, month, day)));
    setOpen(false);
  };

  const shift = (delta: number) => setCursor(new Date(year, month + delta, 1));

  return (
    <div className="relative" ref={boxRef}>
      <input type="hidden" name={name} value={value} required={required} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input flex items-center justify-between gap-2 text-left"
      >
        <span className={value ? "" : "text-muted"}>{value ? ru(value) : placeholder}</span>
        <CalendarDays size={15} className="shrink-0 text-muted" />
      </button>

      {open && (
        <div className="card absolute left-0 top-[calc(100%+4px)] z-50 w-[286px] p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shift(-1)}
              className="rounded-lg p-1.5 text-muted transition hover:bg-subtle"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => shift(1)}
              className="rounded-lg p-1.5 text-muted transition hover:bg-subtle"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-center text-[11px] font-medium text-muted">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />;
              const cellIso = iso(new Date(year, month, day));
              const isSelected = cellIso === value;
              const isToday = cellIso === today;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => pick(day)}
                  className={`h-9 rounded-lg text-sm transition ${
                    isSelected
                      ? "accent-gradient font-semibold text-white"
                      : isToday
                        ? "accent-soft accent-text font-medium"
                        : "hover:bg-subtle"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2">
            <button
              type="button"
              onClick={() => {
                setValue("");
                setOpen(false);
              }}
              className="rounded-lg px-2 py-1 text-xs text-muted transition hover:bg-subtle"
            >
              Очистить
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setCursor(now);
                setValue(iso(now));
                setOpen(false);
              }}
              className="accent-text rounded-lg px-2 py-1 text-xs font-medium transition hover:bg-subtle"
            >
              Сегодня
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
