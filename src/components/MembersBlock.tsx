import { UserPlus, Trash2, Users, Percent, Wallet } from "lucide-react";
import { saveMember, deleteMember } from "@/lib/actions";
import { ROLES } from "@/lib/constants";
import { som } from "@/lib/format";
import { Avatar } from "@/components/ui";
import FormModal from "@/components/FormModal";
import Select from "@/components/Select";

type Member = {
  id: string;
  role: string;
  rateType: string;
  rate: number;
  note: string | null;
  user: { id: string; name: string; role: string };
};

const PROJECT_ROLE = {
  TARGETOLOG: "Таргетолог",
  TEAM_LEAD: "Аккаунт-менеджер",
  CONTRACTOR: "Подрядчик",
};

/** Команда проекта: кто работает и на какой ставке (процент или фикс). */
export default function MembersBlock({
  clientId,
  members,
  users,
  canEdit,
  avgCheck = 0,
}: {
  clientId: string;
  members: Member[];
  users: { id: string; name: string; role: string }[];
  canEdit: boolean;
  /** Абонплата клиента — чтобы сразу показать, сколько выходит участнику. */
  avgCheck?: number;
}) {
  const addForm = (
    <form action={saveMember} className="space-y-4">
      <input type="hidden" name="clientId" value={clientId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Сотрудник</label>
          <Select
            name="userId"
            required
            options={users.map((u) => ({
              value: u.id,
              label: u.name,
              hint: ROLES[u.role as keyof typeof ROLES],
            }))}
            defaultValue={users[0]?.id}
          />
        </div>
        <div>
          <label className="label">Роль на проекте</label>
          <Select
            name="role"
            defaultValue="TARGETOLOG"
            options={Object.entries(PROJECT_ROLE).map(([value, label]) => ({ value, label }))}
          />
        </div>
        <div>
          <label className="label">Тип ставки</label>
          <Select
            name="rateType"
            defaultValue="PERCENT"
            options={[
              { value: "PERCENT", label: "Процент от чека" },
              { value: "FIXED", label: "Фикс за месяц" },
            ]}
          />
        </div>
        <div>
          <label className="label">Значение</label>
          <input
            className="input"
            name="rate"
            type="number"
            min="0"
            step="any"
            placeholder="34 или 15000"
          />
        </div>
      </div>
      <div>
        <label className="label">Что делает на проекте</label>
        <input className="input" name="note" placeholder="ведёт переписку и оплаты" />
      </div>
      <button className="btn-primary w-full">Добавить в команду</button>
    </form>
  );

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="stat-icon !h-7 !w-7 accent-soft accent-text">
            <Users size={14} strokeWidth={2} />
          </span>
          Кто работает
          {members.length > 0 && (
            <span className="rounded-md bg-subtle px-1.5 text-[11px] text-muted">
              {members.length}
            </span>
          )}
        </div>
        {canEdit && (
          <FormModal
            label="Добавить"
            title="Участник проекта"
            variant="ghost"
            icon={<UserPlus size={15} />}
            hint="Процент считается с каждого платежа клиента, фикс — сумма за месяц. Индивидуальная ставка важнее общих настроек агентства."
          >
            {addForm}
          </FormModal>
        )}
      </div>

      {members.length === 0 ? (
        <div className="rounded-2xl bg-subtle p-5 text-center text-sm text-muted">
          Участники не назначены — ставки берутся из общих настроек агентства
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {members.map((m) => {
            const isPercent = m.rateType === "PERCENT";
            // Сколько выйдет с текущей абонплаты — видно сразу, без калькулятора.
            const perMonth = isPercent ? Math.round((avgCheck * m.rate) / 100) : m.rate;
            return (
              <div
                key={m.id}
                className="group flex items-start gap-3 rounded-2xl border border-zinc-200 p-3"
              >
                <Avatar name={m.user.name} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.user.name}</div>
                  <div className="text-xs text-muted">
                    {PROJECT_ROLE[m.role as keyof typeof PROJECT_ROLE] ??
                      ROLES[m.role as keyof typeof ROLES]}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="flex items-center gap-1 rounded-lg accent-soft accent-text px-1.5 py-0.5 text-[11px] font-medium">
                      {isPercent ? <Percent size={10} /> : <Wallet size={10} />}
                      {isPercent ? `${m.rate}% от чека` : `${som(m.rate)} в месяц`}
                    </span>
                    {perMonth > 0 && (
                      <span className="text-[11px] text-muted">≈ {som(perMonth)} с проекта</span>
                    )}
                  </div>

                  {m.note && <div className="mt-1 text-[11px] text-muted">{m.note}</div>}
                </div>

                {canEdit && (
                  <form action={deleteMember} className="opacity-0 transition group-hover:opacity-100">
                    <input type="hidden" name="id" value={m.id} />
                    <button className="rounded-lg p-1 text-zinc-300 transition hover:text-red-600">
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
