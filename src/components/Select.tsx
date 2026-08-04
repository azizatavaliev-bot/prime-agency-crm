"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: string; hint?: string };

/**
 * Свой выпадающий список вместо нативного <select>: системные списки
 * рендерятся окном ОС, игнорируют наши стили и в тёмной теме выглядят чужеродно.
 * Значение дублируется в скрытый input, поэтому обычные формы и server actions
 * работают без изменений.
 */
export default function Select({
  name,
  options,
  defaultValue,
  placeholder = "Выберите…",
  required,
  onChange,
}: {
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
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

  const current = options.find((o) => o.value === value);

  const pick = (v: string) => {
    setValue(v);
    setOpen(false);
    onChange?.(v);
  };

  return (
    <div className="relative" ref={boxRef}>
      <input type="hidden" name={name} value={value} required={required} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input flex items-center justify-between gap-2 text-left"
      >
        <span className={current ? "" : "text-muted"}>{current?.label ?? placeholder}</span>
        <ChevronDown size={15} className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="card absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-64 overflow-y-auto p-1.5">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => pick(o.value)}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-subtle ${
                o.value === value ? "accent-soft accent-text font-medium" : ""
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate">{o.label}</span>
                {o.hint && <span className="block truncate text-xs text-muted">{o.hint}</span>}
              </span>
              {o.value === value && <Check size={14} className="shrink-0" />}
            </button>
          ))}
          {options.length === 0 && <div className="px-3 py-2 text-sm text-muted">Пусто</div>}
        </div>
      )}
    </div>
  );
}
