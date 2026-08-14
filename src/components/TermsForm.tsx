import { saveClientTerms } from "@/lib/actions";
import { RENEWAL_MODE } from "@/lib/constants";
import { toInputDate } from "@/lib/format";
import Select from "./Select";
import DatePicker from "./DatePicker";

export type ClientTerms = {
  id: string;
  avgCheck: number;
  paymentDay: number | null;
  contractStart: Date | null;
  contractEnd: Date | null;
  profitPercent: number | null;
  paymentTerms: string | null;
  renewalMode: string | null;
  priceReviewAt: Date | null;
  termsNote: string | null;
  agreement: string | null;
};

/** Форма условий по проекту. Вынесена отдельно: открывается и из шапки карточки, и из блока условий. */
export default function TermsForm({ client }: { client: ClientTerms }) {
  return (

    <form action={saveClientTerms} className="space-y-4">
      <input type="hidden" name="clientId" value={client.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Сколько берём в месяц, сом</label>
          <input
            className="input"
            name="avgCheck"
            type="number"
            min="0"
            step="any"
            defaultValue={client.avgCheck}
            placeholder="30000"
          />
        </div>
        <div>
          <label className="label">Какого числа платит</label>
          <input
            className="input"
            name="paymentDay"
            type="number"
            min="1"
            max="31"
            defaultValue={client.paymentDay ?? ""}
            placeholder="5"
          />
        </div>
        <div>
          <label className="label">Порядок оплаты</label>
          <input
            className="input"
            name="paymentTerms"
            defaultValue={client.paymentTerms ?? ""}
            placeholder="предоплата 100% до 5 числа"
          />
        </div>
        <div>
          <label className="label">% от прибыли клиента</label>
          <input
            className="input"
            name="profitPercent"
            type="number"
            min="0"
            step="any"
            defaultValue={client.profitPercent ?? ""}
            placeholder="если работаем за процент"
          />
        </div>
        <div>
          <label className="label">Договор с</label>
          <DatePicker name="contractStart" defaultValue={toInputDate(client.contractStart)} />
        </div>
        <div>
          <label className="label">Договор до</label>
          <DatePicker name="contractEnd" defaultValue={toInputDate(client.contractEnd)} />
        </div>
        <div>
          <label className="label">Что после окончания</label>
          <Select
            name="renewalMode"
            defaultValue={client.renewalMode ?? ""}
            options={[
              { value: "", label: "Не решили" },
              ...Object.entries(RENEWAL_MODE).map(([value, label]) => ({ value, label })),
            ]}
          />
        </div>
        <div>
          <label className="label">Пересмотр цены</label>
          <DatePicker name="priceReviewAt" defaultValue={toInputDate(client.priceReviewAt)} />
        </div>
      </div>

      <div>
        <label className="label">Договорённости по работе</label>
        <input
          className="input"
          name="agreement"
          defaultValue={client.agreement ?? ""}
          placeholder="4 креатива в неделю, отчёт по пятницам"
        />
      </div>
      <div>
        <label className="label">Условия по деньгам — что важно помнить</label>
        <input
          className="input"
          name="termsNote"
          defaultValue={client.termsNote ?? ""}
          placeholder="рекламный бюджет платит сам, нам только за работу"
        />
      </div>

      <button className="btn-primary w-full">Сохранить условия</button>
    </form>
  );
}
