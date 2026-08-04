import { Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Pencil } from "lucide-react";
import { saveDictItem, deleteDictItem, toggleDictItem, moveDictItem } from "@/lib/actions";
import { Badge, MiniTable } from "@/components/ui";
import FormModal from "@/components/FormModal";

export type DictRow = {
  id: string;
  type: string;
  key: string;
  name: string;
  color: string | null;
  hint: string | null;
  order: number;
  builtin: boolean;
  active: boolean;
};

const COLORS: [string, string][] = [
  ["bg-zinc-100 text-zinc-700 border-zinc-200", "Серый"],
  ["bg-sky-100 text-sky-700 border-sky-200", "Синий"],
  ["bg-emerald-100 text-emerald-700 border-emerald-200", "Зелёный"],
  ["bg-amber-100 text-amber-700 border-amber-200", "Жёлтый"],
  ["bg-red-100 text-red-700 border-red-200", "Красный"],
];

function ItemForm({ type, item, withColor }: { type: string; item?: DictRow; withColor: boolean }) {
  return (
    <form action={saveDictItem} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="type" value={type} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className={withColor ? "" : "sm:col-span-2"}>
        <label className="label">Название *</label>
        <input className="input" name="name" required defaultValue={item?.name} />
      </div>
      {withColor && (
        <div>
          <label className="label">Цвет метки</label>
          <select className="input" name="color" defaultValue={item?.color ?? COLORS[0][0]}>
            {COLORS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="label">Порядок</label>
        <input className="input" name="order" type="number" defaultValue={item?.order ?? 100} />
      </div>
      <div className="flex items-end">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={item?.active ?? true} /> Показывать
        </label>
      </div>
      <div className="sm:col-span-2">
        <label className="label">Подсказка (не обязательно)</label>
        <input className="input" name="hint" defaultValue={item?.hint ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <button className="btn-primary">{item ? "Сохранить" : "Добавить"}</button>
      </div>
    </form>
  );
}

/** Блок управления одним справочником: добавить, переименовать, порядок, скрыть, удалить. */
export default function DictBlock({
  type,
  title,
  hint,
  items,
  withColor = false,
}: {
  type: string;
  title: string;
  hint: string;
  items: DictRow[];
  withColor?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium">{title}</div>
          <div className="mt-0.5 text-xs text-muted">{hint}</div>
        </div>
        <FormModal
          label="Добавить"
          title={`Новое значение — ${title.toLowerCase()}`}
          variant="ghost"
          icon={<Plus size={15} />}
          hint="Значение сразу появится во всех формах системы. Порядок задаёт, как элементы идут в списках и колонках канбана."
        >
          <ItemForm type={type} withColor={withColor} />
        </FormModal>
      </div>

      <div className="mt-3">
        <MiniTable head={["Значение", "Статус", "Порядок", ""]}>
          {items.map((i) => (
            <tr key={i.id} className={i.active ? "" : "opacity-50"}>
              <td className="px-3 py-2 text-sm">
                {withColor ? (
                  <Badge className={i.color ?? undefined}>{i.name}</Badge>
                ) : (
                  <span className="font-medium">{i.name}</span>
                )}
                {i.hint && <div className="mt-0.5 text-xs text-muted">{i.hint}</div>}
              </td>
              <td className="px-3 py-2 text-xs text-muted">
                {i.builtin ? "встроенное" : "своё"}
                {!i.active && " · скрыто"}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-1">
                  <form action={moveDictItem}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="dir" value="up" />
                    <button className="rounded-lg p-1 text-muted transition hover:bg-subtle" title="Выше">
                      <ChevronUp size={14} />
                    </button>
                  </form>
                  <form action={moveDictItem}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="dir" value="down" />
                    <button className="rounded-lg p-1 text-muted transition hover:bg-subtle" title="Ниже">
                      <ChevronDown size={14} />
                    </button>
                  </form>
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-1">
                  <FormModal
                    label=""
                    title={`Изменить — ${i.name}`}
                    variant="ghost"
                    icon={<Pencil size={13} />}
                  >
                    <ItemForm type={type} item={i} withColor={withColor} />
                  </FormModal>
                  <form action={toggleDictItem}>
                    <input type="hidden" name="id" value={i.id} />
                    <button
                      className="rounded-lg p-1.5 text-muted transition hover:bg-subtle"
                      title={i.active ? "Скрыть из форм" : "Показывать"}
                    >
                      {i.active ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </form>
                  <form action={deleteDictItem}>
                    <input type="hidden" name="id" value={i.id} />
                    <button
                      className="rounded-lg p-1.5 text-muted transition hover:text-red-600"
                      title={i.builtin ? "Встроенное — будет скрыто" : "Удалить"}
                    >
                      <Trash2 size={13} />
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td className="px-3 py-3 text-sm text-muted" colSpan={4}>
                Значений нет — используются встроенные по умолчанию
              </td>
            </tr>
          )}
        </MiniTable>
      </div>
    </div>
  );
}
