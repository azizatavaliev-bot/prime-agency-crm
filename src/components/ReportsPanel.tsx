"use client";

import { useState } from "react";
import { ArrowLeft, Plus, TrendingUp } from "lucide-react";
import ReportForm from "./ReportForm";
import { Section } from "@/components/ui";

/**
 * Вкладка "Отчёты" внутри модалки клиента. Раньше "+ Отчёт" открывал вторую
 * модалку поверх первой — теперь форма просто подменяет содержимое этой же
 * вкладки (как обычный шаг), с кнопкой "Назад" к списку отчётов.
 */
export default function ReportsPanel({
  canWrite,
  clientName,
  formProps,
  children,
}: {
  canWrite: boolean;
  clientName: string;
  formProps: {
    clients: { id: string; name: string; targetCpl?: number | null }[];
    fixedClientId: string;
    defaultTargetCpl?: number | null;
    usdRate: number;
  };
  children: React.ReactNode;
}) {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="btn-ghost mb-3 !px-2.5 !py-1 !text-xs"
        >
          <ArrowLeft size={13} /> К списку отчётов
        </button>
        <ReportForm {...formProps} onSaved={() => setShowForm(false)} />
      </div>
    );
  }

  return (
    <Section
      title="Отчёты по таргету"
      icon={TrendingUp}
      right={
        canWrite ? (
          <button type="button" onClick={() => setShowForm(true)} className="btn-ghost">
            <Plus size={15} /> Отчёт
          </button>
        ) : undefined
      }
    >
      {children}
    </Section>
  );
}
