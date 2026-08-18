"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Sparkles, X, AlertTriangle, CheckCircle2, ImagePlus } from "lucide-react";
import { autoFillReportsFromScreenshots, type AutoFillState } from "@/lib/reportScreenshotActions";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full !py-2.5" disabled={disabled || pending}>
      <Sparkles size={15} /> {pending ? "ИИ разбирает скриншоты…" : "Заполнить отчёты"}
    </button>
  );
}

/**
 * Вставка скриншотов рекламного кабинета (Ctrl+V, можно несколько за раз —
 * хоть целую неделю) → ИИ сам создаёт отчёты по дням/направлениям, без
 * экрана подтверждения. Поправить результат — обычной кнопкой редактирования
 * на созданном отчёте.
 */
export default function ScreenshotReportUpload({ clientId }: { clientId: string }) {
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const dropRef = useRef<HTMLDivElement>(null);
  const [state, formAction] = useActionState<AutoFillState, FormData>(autoFillReportsFromScreenshots, { ok: true });

  useEffect(() => {
    if (state.ok && state.count !== undefined) {
      images.forEach((i) => URL.revokeObjectURL(i.preview));
      setImages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const addFiles = (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    setImages((prev) => [...prev, ...imgs.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
  };

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const files = Array.from(e.clipboardData?.items ?? [])
        .filter((i) => i.type.startsWith("image/"))
        .map((i) => i.getAsFile())
        .filter((f): f is File => Boolean(f));
      if (!files.length) return;
      e.preventDefault();
      addFiles(files);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const removeImage = (idx: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  return (
    <form
      action={formAction}
      className="space-y-3"
      onSubmit={(e) => {
        if (!images.length) e.preventDefault();
      }}
    >
      <input type="hidden" name="clientId" value={clientId} />

      <div
        ref={dropRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(Array.from(e.dataTransfer.files));
        }}
        className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-sm text-muted"
      >
        <ImagePlus size={18} className="mx-auto mb-1.5 text-muted" />
        Нажмите Ctrl+V здесь (можно несколько скриншотов подряд — хоть за всю неделю) или перетащите файлы
        <input
          type="file"
          accept="image/*"
          multiple
          className="mt-2 block w-full text-xs"
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.preview} alt="" className="h-20 w-20 rounded-lg border border-zinc-200 object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Файлы уходят в форму отдельным полем — hidden-инпуты выше только держат count для DOM-ключей. */}
      <FileFields images={images} />

      {!state.ok && state.error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle size={15} className="shrink-0" /> {state.error}
        </div>
      )}
      {state.ok && state.count !== undefined && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 size={15} className="shrink-0" />
          {state.count === 0
            ? "ИИ не нашёл на скриншотах данных для отчёта"
            : `Создано отчётов: ${state.count}${state.newDirections ? `, новых направлений: ${state.newDirections}` : ""}`}
        </div>
      )}

      <SubmitButton disabled={images.length === 0} />
    </form>
  );
}

/** Настоящие File нельзя положить в defaultValue — прокидываем через DataTransfer в скрытый input[type=file]. */
function FileFields({ images }: { images: { file: File; preview: string }[] }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const dt = new DataTransfer();
    images.forEach((i) => dt.items.add(i.file));
    ref.current.files = dt.files;
  }, [images]);
  return <input ref={ref} type="file" name="screenshots" multiple className="hidden" />;
}
