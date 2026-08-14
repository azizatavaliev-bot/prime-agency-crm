"use client";

import { useState } from "react";
import { Wallet, CalendarClock, Landmark } from "lucide-react";
import { savePayment } from "@/lib/actions";
import { PAYMENT_STATUS, PAYMENT_KIND, PAYMENT_METHOD } from "@/lib/constants";
import { toInputDate, som } from "@/lib/format";
import Select from "./Select";
import DatePicker from "./DatePicker";
import FormSection from "./FormSection";

const toOpts = (o: Record<string, string>) => Object.entries(o).map(([key, name]) => ({ key, name }));

export default function PaymentForm({
  clients,
  contractors,
  accounts = [],
  kinds = [],
  methods = [],
  fixedClientId,
  payment,
}: {
  clients: { id: string; name: string; avgCheck: number }[];
  contractors: { id: string; name: string }[];
  accounts?: { id: string; name: string }[];
  kinds?: { key: string; name: string }[];
  methods?: { key: string; name: string }[];
  fixedClientId?: string;
  /** Заполнено — правим существующий платёж, а не заводим новый. */
  payment?: {
    id: string;
    kind: string;
    amount: number;
    status: string;
    method: string;
    dueAt: string;
    paidAt: string | null;
    accountId: string | null;
    execUserId: string | null;
    comment: string | null;
  };
}) {
  const kindList = kinds.length ? kinds : toOpts(PAYMENT_KIND);
  const methodList = methods.length ? methods : toOpts(PAYMENT_METHOD);

  const [clientId, setClientId] = useState(fixedClientId ?? clients[0]?.id ?? "");
  const [kind, setKind] = useState(payment?.kind ?? "SUBSCRIPTION");
  const [amount, setAmount] = useState(payment ? String(Math.round(payment.amount)) : "");
  // Дату фактической оплаты показываем только когда платёж отмечен оплаченным.
  const [status, setStatus] = useState(payment?.status ?? "PENDING");

  // абонплата почти всегда равна чеку клиента — подставляем, чтобы не набирать руками
  const suggested = clients.find((c) => c.id === clientId)?.avgCheck ?? 0;
  const showSuggest = kind === "SUBSCRIPTION" && suggested > 0 && !amount;
  const isSubscription = kind === "SUBSCRIPTION";

  return (
    <form action={savePayment} className="space-y-4">
      {payment && <input type="hidden" name="id" value={payment.id} />}
      <FormSection title="Что оплачивают" icon={Wallet}>
        {fixedClientId ? (
          <input type="hidden" name="clientId" value={fixedClientId} />
        ) : (
          <div>
            <label className="label">Клиент *</label>
            <Select
              name="clientId"
              required
              defaultValue={clientId}
              onChange={setClientId}
              options={clients.map((c) => ({ value: c.id, label: c.name, hint: som(c.avgCheck) }))}
            />
          </div>
        )}
        <div>
          <label className="label">Тип оплаты</label>
          <Select
            name="kind"
            defaultValue={kind}
            onChange={setKind}
            options={kindList.map((k) => ({ value: k.key, label: k.name }))}
          />
        </div>
        <div>
          <label className="label">Сумма, сом *</label>
          <input
            className="input"
            name="amount"
            type="number"
            min="0"
            step="any"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={suggested ? String(Math.round(suggested)) : ""}
          />
          {showSuggest && (
            <button
              type="button"
              onClick={() => setAmount(String(Math.round(suggested)))}
              className="accent-text mt-1.5 text-xs font-medium hover:underline"
            >
              Подставить абонплату {som(suggested)}
            </button>
          )}
        </div>
        <div>
          <label className="label">Статус</label>
          <Select
            name="status"
            defaultValue={status}
            onChange={setStatus}
            options={Object.entries(PAYMENT_STATUS).map(([value, label]) => ({ value, label }))}
          />
        </div>
      </FormSection>

      <FormSection title="Когда и куда" hint="Дата плана включает напоминание за 3 дня" icon={CalendarClock}>
        <div>
          <label className="label">Дата оплаты (план)</label>
          <DatePicker name="dueAt" defaultValue={payment?.dueAt ?? toInputDate(new Date())} />
        </div>
        {status === "PAID" && (
          <div>
            <label className="label">Когда фактически оплатили</label>
            <DatePicker
              name="paidAt"
              defaultValue={payment?.paidAt ?? toInputDate(new Date())}
            />
          </div>
        )}
        <div>
          <label className="label">Следующая оплата</label>
          <DatePicker name="nextPaymentAt" placeholder="если разовая — оставьте пустым" />
        </div>
        <div>
          <label className="label">На какой счёт</label>
          <Select
            name="accountId"
            defaultValue={payment?.accountId ?? ""}
            placeholder="— не указан —"
            options={[
              { value: "", label: "— не указан —" },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
        </div>
        <div>
          <label className="label">Способ оплаты</label>
          <Select
            name="method"
            defaultValue={payment?.method ?? "TRANSFER"}
            options={methodList.map((m) => ({ value: m.key, label: m.name }))}
          />
        </div>
      </FormSection>

      {!isSubscription && (
        <FormSection title="Исполнитель" hint="Кому уходит доля с этой разовой услуги" icon={Landmark} columns={1}>
          <Select
            name="execUserId"
            defaultValue={payment?.execUserId ?? ""}
            placeholder="— по умолчанию —"
            options={[
              { value: "", label: "— по умолчанию —" },
              ...contractors.map((u) => ({ value: u.id, label: u.name })),
            ]}
          />
        </FormSection>
      )}

      <div>
        <label className="label">Комментарий</label>
        <input
          className="input"
          name="comment"
          defaultValue={payment?.comment ?? ""}
          placeholder="за что платёж, если нужно уточнить"
        />
      </div>

      <button className="btn-primary w-full !py-2.5">
        {payment ? "Сохранить платёж" : "Добавить платёж"}
      </button>
    </form>
  );
}
