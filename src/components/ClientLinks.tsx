import { Link2, Plus, Trash2, ExternalLink, Table2, Globe, Megaphone, Database } from "lucide-react";
import { saveClientLink, deleteClientLink } from "@/lib/actions";
import FormModal from "./FormModal";
import Select from "./Select";

const LINK_TYPE = {
  ADS: { label: "Рекламный кабинет", icon: Megaphone },
  SHEETS: { label: "Таблица", icon: Table2 },
  SITE: { label: "Сайт", icon: Globe },
  CRM: { label: "CRM / база", icon: Database },
  OTHER: { label: "Другое", icon: Link2 },
} as const;

export type ClientLinkRow = { id: string; title: string; url: string; type: string };

/** Быстрый доступ к кабинетам, таблицам и доступам клиента. */
export default function ClientLinks({
  clientId,
  links,
  canEdit,
}: {
  clientId: string;
  links: ClientLinkRow[];
  canEdit: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="stat-icon !h-7 !w-7 accent-soft accent-text">
            <Link2 size={14} strokeWidth={2} />
          </span>
          Ссылки и доступы
        </div>
        {canEdit && (
          <FormModal label="Добавить" title="Новая ссылка" variant="ghost" icon={<Plus size={15} />}>
            <form action={saveClientLink} className="space-y-4">
              <input type="hidden" name="clientId" value={clientId} />
              <div>
                <label className="label">Что это</label>
                <Select
                  name="type"
                  defaultValue="ADS"
                  options={Object.entries(LINK_TYPE).map(([value, v]) => ({
                    value,
                    label: v.label,
                  }))}
                />
              </div>
              <div>
                <label className="label">Название</label>
                <input className="input" name="title" placeholder="Кабинет Facebook" />
              </div>
              <div>
                <label className="label">Ссылка</label>
                <input className="input" name="url" required placeholder="business.facebook.com/..." />
              </div>
              <button className="btn-primary w-full">Добавить</button>
            </form>
          </FormModal>
        )}
      </div>

      {links.length === 0 ? (
        <div className="rounded-2xl bg-subtle p-5 text-center text-sm text-muted">
          Здесь появятся ссылки на кабинеты, таблицы и доступы
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {links.map((l) => {
            const meta = LINK_TYPE[l.type as keyof typeof LINK_TYPE] ?? LINK_TYPE.OTHER;
            const Icon = meta.icon;
            return (
              <div
                key={l.id}
                className="group flex items-center gap-2 rounded-xl border border-zinc-200 p-2.5 transition hover:bg-subtle"
              >
                <span className="accent-soft accent-text flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                  <Icon size={15} />
                </span>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1"
                >
                  <span className="block truncate text-sm font-medium hover:underline">
                    {l.title}
                  </span>
                  <span className="block truncate text-[11px] text-muted">{meta.label}</span>
                </a>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg p-1 text-zinc-300 transition hover:text-[var(--accent)]"
                >
                  <ExternalLink size={14} />
                </a>
                {canEdit && (
                  <form action={deleteClientLink} className="opacity-0 transition group-hover:opacity-100">
                    <input type="hidden" name="id" value={l.id} />
                    <button className="rounded-lg p-1 text-zinc-300 hover:text-red-600">
                      <Trash2 size={13} />
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
