import { Handshake, Pencil, CalendarClock, Percent, RefreshCw } from "lucide-react";
import { RENEWAL_MODE } from "@/lib/constants";
import { som, dateRu } from "@/lib/format";
import FormModal from "./FormModal";
import TermsForm, { type ClientTerms } from "./TermsForm";


/**
 * Условия сотрудничества: сколько берём, какого числа платят, до какой даты
 * договор и что дальше. Раньше это жило в переписке — теперь в карточке.
 */
export default function TermsBlock({
  client,
  canEdit,
}: {
  client: ClientTerms;
  canEdit: boolean;
}) {
  const renewal = client.renewalMode
    ? RENEWAL_MODE[client.renewalMode as keyof typeof RENEWAL_MODE]
    : null;

  const rows: { label: string; value: string; icon?: React.ReactNode }[] = [
    { label: "Берём в месяц", value: client.avgCheck > 0 ? som(client.avgCheck) : "не задано" },
    {
      label: "Платит",
      value: client.paymentDay ? `${client.paymentDay} числа` : "дата не задана",
      icon: <CalendarClock size={11} />,
    },
    { label: "Порядок оплаты", value: client.paymentTerms || "—" },
    {
      label: "% от прибыли",
      value: client.profitPercent ? `${client.profitPercent}%` : "—",
      icon: <Percent size={11} />,
    },
    { label: "Договор", value: client.contractStart ? dateRu(client.contractStart) : "—" },
    { label: "Действует до", value: client.contractEnd ? dateRu(client.contractEnd) : "бессрочно" },
    { label: "После окончания", value: renewal ?? "не решили", icon: <RefreshCw size={11} /> },
    {
      label: "Пересмотр цены",
      value: client.priceReviewAt ? dateRu(client.priceReviewAt) : "—",
    },
  ];

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="stat-icon !h-7 !w-7 accent-soft accent-text">
            <Handshake size={14} strokeWidth={2} />
          </span>
          Условия сотрудничества
        </div>
        {canEdit && (
          <FormModal
            label="Изменить"
            title="Условия по проекту"
            variant="ghost"
            icon={<Pencil size={14} />}
            hint="Эти цифры используются в напоминаниях об оплате и в расчёте долей команды."
          >
            <TermsForm client={client} />
          </FormModal>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="field-label">{r.label}</div>
            <div className="field-value flex items-center gap-1">
              {/* Иконка рядом с прочерком читается как мусор — показываем только при значении */}
              {r.value !== "—" && r.icon}
              {r.value}
            </div>
          </div>
        ))}
      </div>

      {(client.agreement || client.termsNote) && (
        <div className="mt-3 space-y-1.5 border-t border-zinc-100 pt-3 text-xs text-muted">
          {client.agreement && <div>Договорённости: {client.agreement}</div>}
          {client.termsNote && <div>По деньгам: {client.termsNote}</div>}
        </div>
      )}
    </div>
  );
}
