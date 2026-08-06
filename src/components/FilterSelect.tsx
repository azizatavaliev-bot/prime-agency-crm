"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type FilterOption = { value: string; label: string };

/**
 * Выпадающий фильтр. В отличие от Select в формах — сразу отправляет форму
 * при выборе: жать «Показать» после каждого фильтра неудобно.
 */
export default function FilterSelect({
  name,
  options,
  defaultValue = "",
  width = "max-w-[200px]",
}: {
  name: string;
  options: FilterOption[];
  defaultValue?: string;
  width?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const current = options.find((o) => o.value === value) ?? options[0];

  const pick = (v: string) => {
    setValue(v);
    setOpen(false);
    const input = inputRef.current;
    if (!input) return;
    // Пишем значение в DOM напрямую: состояние React обновится только к следующему
    // рендеру, а форма отправляется прямо сейчас и утащила бы старое значение.
    input.value = v;
    input.form?.requestSubmit();
  };

  return (
    <div className={`relative w-full ${width}`} ref={boxRef}>
      <input ref={inputRef} type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input flex items-center justify-between gap-2 text-left"
      >
        <span className="truncate">{current?.label ?? "—"}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`}
        />
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
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              {o.value === value && <Check size={14} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
