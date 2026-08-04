"use client";

import { Layers } from "lucide-react";
import { applyTaskTemplate } from "@/lib/actions";
import FormModal from "./FormModal";
import Select from "./Select";

/** Применение шаблона: создаёт весь набор задач одним действием. */
export default function ApplyTemplate({
  templates,
  clients,
  users,
}: {
  templates: { id: string; name: string; hint: string | null; count: number }[];
  clients: { id: string; name: string }[];
  users: { id: string; name: string }[];
}) {
  if (!templates.length) return null;
  return (
    <FormModal
      label="Шаблон"
      title="Применить шаблон задач"
      variant="ghost"
      icon={<Layers size={16} />}
      hint="Создаст сразу весь набор задач — например, чек-лист запуска нового клиента."
    >
      <form action={applyTaskTemplate} className="space-y-4">
        <div>
          <label className="label">Шаблон</label>
          <Select
            name="templateId"
            required
            options={templates.map((t) => ({
              value: t.id,
              label: t.name,
              hint: `${t.count} задач${t.hint ? ` · ${t.hint}` : ""}`,
            }))}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Клиент</label>
            <Select
              name="clientId"
              placeholder="— без клиента —"
              options={[
                { value: "", label: "— без клиента —" },
                ...clients.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
          <div>
            <label className="label">Ответственный</label>
            <Select
              name="assigneeId"
              placeholder="— не назначен —"
              options={[
                { value: "", label: "— не назначен —" },
                ...users.map((u) => ({ value: u.id, label: u.name })),
              ]}
            />
          </div>
        </div>
        <button className="btn-primary w-full">Создать задачи</button>
      </form>
    </FormModal>
  );
}
