import { Layers, Plus, Trash2, Info, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { saveTaskTemplate, deleteTaskTemplate } from "@/lib/actions";
import { BOARDS } from "@/lib/constants";
import { Section, Collapse } from "@/components/ui";
import FormModal from "@/components/FormModal";
import Select from "@/components/Select";

export const dynamic = "force-dynamic";

/** Форма шаблона: пункты вводятся строками «Заголовок | через сколько дней». */
function TemplateForm({
  tpl,
}: {
  tpl?: {
    id: string;
    name: string;
    hint: string | null;
    board: string;
    items: { title: string; dueDays: number | null }[];
  };
}) {
  const itemsText = tpl?.items
    .map((i) => (i.dueDays === null ? i.title : `${i.title} | ${i.dueDays}`))
    .join("\n");

  return (
    <form action={saveTaskTemplate} className="space-y-4">
      {tpl && <input type="hidden" name="id" value={tpl.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Название</label>
          <input
            className="input"
            name="name"
            required
            defaultValue={tpl?.name}
            placeholder="Запуск нового клиента"
          />
        </div>
        <div>
          <label className="label">Доска</label>
          <Select
            name="board"
            defaultValue={tpl?.board ?? "TARGET"}
            options={Object.entries(BOARDS).map(([value, label]) => ({ value, label }))}
          />
        </div>
      </div>
      <div>
        <label className="label">Подсказка</label>
        <input
          className="input"
          name="hint"
          defaultValue={tpl?.hint ?? ""}
          placeholder="Что этот набор закрывает"
        />
      </div>
      <div>
        <label className="label">Задачи набора</label>
        <textarea
          className="input font-mono text-xs"
          name="items"
          rows={9}
          defaultValue={itemsText}
          placeholder={"Собрать бриф и доступы | 1\nНастроить рекламный кабинет | 2\nЗапустить тест связок | 5"}
        />
        <div className="mt-1 text-xs text-muted">
          Каждая задача с новой строки. После «|» — через сколько дней дедлайн (можно не указывать).
        </div>
      </div>
      <button className="btn-primary w-full">{tpl ? "Сохранить" : "Создать шаблон"}</button>
    </form>
  );
}

export default async function TemplatesPage() {
  const templates = await prisma.taskTemplate.findMany({
    include: { items: { orderBy: { order: "asc" } } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <Section
        title="Шаблоны наборов задач"
        icon={Layers}
        right={
          <FormModal label="Новый шаблон" title="Новый шаблон" icon={<Plus size={16} />}>
            <TemplateForm />
          </FormModal>
        }
      >
        <div className="mb-4 flex gap-2 rounded-2xl bg-subtle p-3 text-xs text-muted">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            Набор задач, который создаётся одной кнопкой на доске. Удобно для повторяющихся
            процессов: запуск клиента, закрытие месяца, подготовка отчёта.
          </span>
        </div>

        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{t.name}</div>
                  <div className="mt-0.5 text-xs text-muted">
                    {BOARDS[t.board as keyof typeof BOARDS] ?? t.board} · {t.items.length} задач
                    {t.hint ? ` · ${t.hint}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <FormModal
                    label="Изменить"
                    title={t.name}
                    variant="ghost"
                    icon={<Pencil size={15} />}
                  >
                    <TemplateForm
                      tpl={{
                        id: t.id,
                        name: t.name,
                        hint: t.hint,
                        board: t.board,
                        items: t.items.map((i) => ({ title: i.title, dueDays: i.dueDays })),
                      }}
                    />
                  </FormModal>
                  <form action={deleteTaskTemplate}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="btn-ghost text-red-600">
                      <Trash2 size={15} />
                    </button>
                  </form>
                </div>
              </div>

              {t.items.length > 0 && (
                <div className="mt-3">
                  <Collapse title="Что внутри">
                    <ol className="space-y-1 text-sm">
                      {t.items.map((i, idx) => (
                        <li key={i.id} className="flex gap-2">
                          <span className="text-muted">{idx + 1}.</span>
                          <span>{i.title}</span>
                          {i.dueDays !== null && (
                            <span className="text-xs text-muted">· +{i.dueDays} дн.</span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </Collapse>
                </div>
              )}
            </div>
          ))}
          {templates.length === 0 && (
            <div className="card p-8 text-center text-sm text-muted">
              Шаблонов пока нет — создайте первый
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
