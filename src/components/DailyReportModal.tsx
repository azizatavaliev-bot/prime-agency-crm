"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import ModalShell from "./ModalShell";
import { ModalCloseContext } from "./SubmitButton";
import MarketingReportForm from "./MarketingReportForm";
import type { SelectOption } from "./Select";

type ReportDefaults = React.ComponentProps<typeof MarketingReportForm>["defaults"];

/**
 * Форма отчёта — модалкой поверх страницы, а не постоянным блоком сверху.
 *
 * Раньше «Новый отчёт» всегда стоял открытым над списком: страницу приходилось
 * пролистывать мимо него каждый раз. Теперь форма всплывает по кнопке — как
 * карточки открываются в Unity, — и сама открывается, если пришли по ссылке
 * «Изменить» (`?edit=id`).
 */
export default function DailyReportModal({
  editing,
  channels,
  sources,
  directions,
  clients,
  usdRate,
  defaults,
}: {
  editing: boolean;
  channels: SelectOption[];
  sources: SelectOption[];
  directions: SelectOption[];
  clients: SelectOption[];
  usdRate: number;
  defaults?: ReportDefaults;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(editing);

  useEffect(() => setOpen(editing), [editing]);

  const close = useCallback(() => {
    setOpen(false);
    // Правку открывали по ?edit=id — закрыли окно, значит и правку отменили.
    if (editing) router.push("/marketing?tab=daily");
  }, [editing, router]);

  const api = useMemo(() => ({ close, claim: () => {} }), [close]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        <Plus size={16} /> Новый отчёт
      </button>

      <ModalShell
        open={open}
        onClose={close}
        title={editing ? "Правка отчёта" : "Новый отчёт"}
        icon={<FileText size={16} />}
        width="max-w-2xl"
      >
        <ModalCloseContext.Provider value={api}>
          <MarketingReportForm
            channels={channels}
            sources={sources}
            directions={directions}
            clients={clients}
            usdRate={usdRate}
            defaults={defaults}
          />
        </ModalCloseContext.Provider>
      </ModalShell>
    </>
  );
}
