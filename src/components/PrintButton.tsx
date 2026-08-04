"use client";

export default function PrintButton({ label = "🖨 Скачать PDF" }: { label?: string }) {
  return (
    <button className="btn-primary print:hidden" onClick={() => window.print()}>
      {label}
    </button>
  );
}
