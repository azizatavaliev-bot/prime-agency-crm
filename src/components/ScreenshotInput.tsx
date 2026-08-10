"use client";

import { useCallback, useRef, useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";

/**
 * Загрузка скриншота: обычный выбор файла + вставка из буфера обмена (Ctrl+V).
 * Файл кладётся в реальный <input type="file"> через DataTransfer, поэтому
 * попадает в обычный FormData серверного action — без отдельного эндпоинта.
 */
export default function ScreenshotInput({ name = "screenshot" }: { name?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const applyFile = useCallback((file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (inputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      inputRef.current.files = dt.files;
    }
    setFileName(file.name || "скриншот из буфера");
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            applyFile(file);
          }
          break;
        }
      }
    },
    [applyFile]
  );

  const clear = () => {
    setPreview(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      className="rounded-2xl border border-dashed border-zinc-300 p-3 text-sm outline-none focus:border-zinc-400"
      tabIndex={0}
      onPaste={onPaste}
    >
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        className="hidden"
        id={`${name}-file`}
        onChange={(e) => applyFile(e.target.files?.[0] ?? null)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={`${name}-file`}
          className="btn-ghost cursor-pointer !px-2.5 !py-1 !text-xs"
        >
          <ImageIcon size={13} /> Выбрать файл
        </label>
        <span className="text-xs text-muted">или кликните сюда и вставьте скриншот — Ctrl+V</span>
        {fileName && (
          <button type="button" onClick={clear} className="text-xs text-red-600 hover:underline">
            <X size={12} className="inline" /> убрать
          </button>
        )}
      </div>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="превью скриншота" className="mt-2 max-h-40 rounded-xl border border-zinc-200" />
      )}
    </div>
  );
}
