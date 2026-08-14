import { payPayroll } from "@/lib/actions";
import { som } from "@/lib/format";
import Select from "./Select";

/**
 * Подтверждение выплаты за месяц.
 *
 * Сумму не даём править руками: она пересчитывается на сервере по ведомости,
 * иначе подменой поля можно выписать любой перевод. Нужно другое число —
 * меняются ставки или премии, и ведомость пересчитается сама.
 */
export default function PayoutForm({
  userId,
  month,
  total,
  base,
  projectShare,
  bonus,
  accounts,
}: {
  userId: string;
  month: string;
  total: number;
  base: number;
  projectShare: number;
  bonus: number;
  accounts: { id: string; name: string }[];
}) {
  return (
    <form action={payPayroll} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="month" value={month} />

      <div className="rounded-2xl border border-zinc-200 p-4 text-sm">
        <div className="flex items-center justify-between py-1">
          <span className="text-muted">Оклад</span>
          <span>{som(base)}</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-muted">Доли с проектов</span>
          <span>{som(projectShare)}</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-muted">Премии</span>
          <span>{som(bonus)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-zinc-200 pt-2 font-semibold">
          <span>К выплате</span>
          <span>{som(total)}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">С какого счёта</label>
          <Select
            name="accountId"
            defaultValue={accounts[0]?.id ?? ""}
            options={[
              { value: "", label: "Не указывать счёт" },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
        </div>
        <div>
          <label className="label">Способ</label>
          <Select
            name="method"
            defaultValue="TRANSFER"
            options={[
              { value: "TRANSFER", label: "Перевод" },
              { value: "CASH", label: "Наличные" },
              { value: "CARD", label: "Карта" },
            ]}
          />
        </div>
      </div>

      <div>
        <label className="label">Комментарий</label>
        <input className="input" name="comment" placeholder="выплатил на Оптиму" />
      </div>

      <button className="btn-primary w-full">Выплатить {som(total)}</button>
    </form>
  );
}
