import { saveBonus } from "@/lib/actions";
import Select from "./Select";
import DecimalInput from "./DecimalInput";

/** Разовая премия сотруднику за месяц: сумма, за что и по какому проекту. */
export default function BonusForm({
  userId,
  month,
  clients,
  users,
}: {
  userId?: string;
  month: string;
  clients: { id: string; name: string }[];
  /** Нужны, когда премия начисляется не из карточки конкретного человека. */
  users?: { id: string; name: string }[];
}) {
  return (
    <form action={saveBonus} className="space-y-4">
      <input type="hidden" name="month" value={month} />
      {userId ? <input type="hidden" name="userId" value={userId} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {!userId && users && (
          <div>
            <label className="label">Кому</label>
            <Select
              name="userId"
              required
              options={users.map((u) => ({ value: u.id, label: u.name }))}
              defaultValue={users[0]?.id}
            />
          </div>
        )}
        <div>
          <label className="label">Сумма, сом</label>
          <DecimalInput name="amount" required placeholder="5000" />
        </div>
        <div>
          <label className="label">Проект (необязательно)</label>
          <Select
            name="clientId"
            defaultValue=""
            options={[
              { value: "", label: "Без привязки к проекту" },
              ...clients.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
      </div>

      <div>
        <label className="label">За что</label>
        <input
          className="input"
          name="reason"
          required
          placeholder="удержал клиента после падения заявок"
        />
        <div className="mt-1 text-xs text-muted">
          Формулировка попадёт в ведомость и в уведомление сотруднику
        </div>
      </div>

      <button className="btn-primary w-full">Начислить премию</button>
    </form>
  );
}
