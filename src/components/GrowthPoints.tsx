import { Target, TrendingUp, TrendingDown, Plus, Trash2 } from "lucide-react";
import { som, num, dateRu, toInputDate } from "@/lib/format";
import { saveSnapshot, deleteSnapshot } from "@/lib/actions";
import FormModal from "./FormModal";
import DatePicker from "./DatePicker";
import DecimalInput from "./DecimalInput";

export type Snapshot = {
  id: string;
  type: string;
  takenAt: Date;
  leads: number | null;
  cpl: number | null;
  adSpend: number | null;
  revenue: number | null;
  conversion: number | null;
  note: string | null;
};

/** Показатели, по которым сравниваем «было» и «стало». */
const METRICS = [
  { key: "leads", label: "Заявок в месяц", fmt: (v: number) => num(v), better: "up" },
  { key: "cpl", label: "Цена заявки", fmt: (v: number) => som(v), better: "down" },
  { key: "adSpend", label: "Рекламный бюджет", fmt: (v: number) => som(v), better: "any" },
  { key: "revenue", label: "Выручка клиента", fmt: (v: number) => som(v), better: "up" },
  { key: "conversion", label: "Конверсия в продажу", fmt: (v: number) => `${num(v, 1)}%`, better: "up" },
] as const;

function snapshotForm(clientId: string, type: "POINT_A" | "POINT_B", snap?: Snapshot) {
  return (
    <form action={saveSnapshot} className="space-y-4">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="type" value={type} />
      {snap && <input type="hidden" name="id" value={snap.id} />}

      <div>
        <label className="label">Дата замера</label>
        <DatePicker name="takenAt" defaultValue={toInputDate(snap?.takenAt ?? new Date())} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Заявок в месяц</label>
          <input className="input" name="leads" type="number" defaultValue={snap?.leads ?? ""} />
        </div>
        <div>
          <label className="label">Цена заявки, сом</label>
          <DecimalInput name="cpl" defaultValue={snap?.cpl ?? ""} />
        </div>
        <div>
          <label className="label">Рекламный бюджет, сом</label>
          <DecimalInput name="adSpend" defaultValue={snap?.adSpend ?? ""} />
        </div>
        <div>
          <label className="label">Выручка клиента, сом</label>
          <DecimalInput name="revenue" defaultValue={snap?.revenue ?? ""} />
        </div>
        {/* Пятое поле в двухколоночном ряду — тянем на всю строку, чтобы справа не зияло пусто */}
        <div className="sm:col-span-2">
          <label className="label">Конверсия в продажу, %</label>
          <DecimalInput name="conversion" defaultValue={snap?.conversion ?? ""} />
        </div>
      </div>

      <div>
        <label className="label">Комментарий</label>
        <textarea className="input" name="note" rows={2} defaultValue={snap?.note ?? ""} />
      </div>

      <button className="btn-primary w-full">Сохранить замер</button>
    </form>
  );
}

/**
 * «Было / стало» по клиенту. Точка А фиксируется на старте, точка Б
 * обновляется по ходу работы — так видно результат в цифрах, а не на словах.
 */
export default function GrowthPoints({
  clientId,
  snapshots,
  canEdit,
}: {
  clientId: string;
  snapshots: Snapshot[];
  canEdit: boolean;
}) {
  const a = snapshots.find((s) => s.type === "POINT_A") ?? null;
  // Точка Б — самая свежая: её переснимают по мере роста.
  const bList = snapshots.filter((s) => s.type === "POINT_B");
  const b = bList.length ? bList[bList.length - 1] : null;

  return (
    <div className="card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="stat-icon !h-7 !w-7 accent-soft accent-text">
            <Target size={14} strokeWidth={2} />
          </span>
          Точка А vs Б · статистика роста
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <FormModal
              label={a ? "Изменить А" : "Точка А"}
              title="Точка А — как было на старте"
              variant="ghost"
              icon={<Plus size={15} />}
              hint="Зафиксируйте показатели клиента до начала работы — потом будет с чем сравнить."
            >
              {snapshotForm(clientId, "POINT_A", a ?? undefined)}
            </FormModal>
            <FormModal
              label="Точка Б"
              title="Точка Б — как стало сейчас"
              variant="ghost"
              icon={<Plus size={15} />}
              hint="Новый замер добавляется поверх старого: в сравнении участвует самый свежий."
            >
              {snapshotForm(clientId, "POINT_B")}
            </FormModal>
          </div>
        )}
      </div>

      {!a && !b ? (
        <div className="rounded-2xl bg-subtle p-6 text-center text-sm text-muted">
          Зафиксируйте показатели клиента (Точка А), чтобы отслеживать рост
        </div>
      ) : (
        <div className="overflow-x-auto scroll-hint">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-zinc-200 text-left">
                <th className="th">Показатель</th>
                <th className="th">Точка А {a ? `· ${dateRu(a.takenAt)}` : ""}</th>
                <th className="th">Точка Б {b ? `· ${dateRu(b.takenAt)}` : ""}</th>
                <th className="th">Изменение</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {METRICS.map((m) => {
                const av = a?.[m.key] ?? null;
                const bv = b?.[m.key] ?? null;
                let delta: number | null = null;
                if (av !== null && bv !== null && av !== 0) delta = ((bv - av) / av) * 100;

                // Для цены заявки снижение — это хорошо, для остального наоборот.
                const good =
                  delta === null || m.better === "any"
                    ? null
                    : m.better === "down"
                      ? delta < 0
                      : delta > 0;

                return (
                  <tr key={m.key}>
                    <td className="td text-muted">{m.label}</td>
                    <td className="td">{av !== null ? m.fmt(av) : "—"}</td>
                    <td className="td font-medium">{bv !== null ? m.fmt(bv) : "—"}</td>
                    <td className="td">
                      {delta === null ? (
                        "—"
                      ) : (
                        <span
                          className={`flex items-center gap-1 font-medium ${
                            good === null ? "" : good ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {delta > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                          {delta > 0 ? "+" : ""}
                          {num(delta, 1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {(a?.note || b?.note) && (
            <div className="mt-3 space-y-1 text-xs text-muted">
              {a?.note && <div>А: {a.note}</div>}
              {b?.note && <div>Б: {b.note}</div>}
            </div>
          )}

          {canEdit && bList.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-muted">Прошлые замеры Б:</span>
              {bList.slice(0, -1).map((s) => (
                <form key={s.id} action={deleteSnapshot}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="chip border-zinc-200 text-muted hover:text-red-600">
                    {dateRu(s.takenAt)} <Trash2 size={11} />
                  </button>
                </form>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
