"use client";

/**
 * Замена <input type="number"> для дробных сумм/ставок/курсов: нативный
 * type="number" завязан на локаль браузера и часто вообще не даёт напечатать
 * запятую (пользователь жмёт — ничего не происходит). Здесь просто текстовое
 * поле, принимающее и запятую, и точку — сервер (n() в actions.ts) сам
 * нормализует разделитель при парсинге.
 */
export default function DecimalInput({
  className = "input",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      className={className}
      onInput={(e) => {
        const el = e.currentTarget;
        const cleaned = el.value.replace(/[^\d.,]/g, "");
        if (cleaned !== el.value) el.value = cleaned;
      }}
    />
  );
}
