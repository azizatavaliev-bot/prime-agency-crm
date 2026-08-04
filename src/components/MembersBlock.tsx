import { UserPlus, Trash2, Users } from "lucide-react";
import { saveMember, deleteMember } from "@/lib/actions";
import { ROLES } from "@/lib/constants";
import { som } from "@/lib/format";
import { MiniTable, Section } from "@/components/ui";
import FormModal from "@/components/FormModal";

type Member = {
  id: string;
  role: string;
  rateType: string;
  rate: number;
  note: string | null;
  user: { id: string; name: string; role: string };
};

/** Команда проекта: кто работает и на какой ставке (процент или фикс). */
export default function MembersBlock({
  clientId,
  members,
  users,
  canEdit,
}: {
  clientId: string;
  members: Member[];
  users: { id: string; name: string; role: string }[];
  canEdit: boolean;
}) {
  return (
    <Section
      title="Команда проекта"
      icon={Users}
      right={
        canEdit ? (
          <FormModal
            label="Добавить"
            title="Участник проекта"
            variant="ghost"
            icon={<UserPlus size={15} />}
            hint="Ставка считается от суммы платежей клиента: процент — доля с каждого чека, фикс — сумма за месяц."
          >
            <form action={saveMember} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="clientId" value={clientId} />
              <div>
                <label className="label">Сотрудник *</label>
                <select className="input" name="userId" required>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {ROLES[u.role as keyof typeof ROLES]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Роль на проекте</label>
                <select className="input" name="role" defaultValue="TARGETOLOG">
                  <option value="TARGETOLOG">Таргетолог</option>
                  <option value="ACCOUNT">Аккаунт-менеджер</option>
                  <option value="CONTRACTOR">Подрядчик (разработка/монтаж)</option>
                </select>
              </div>
              <div>
                <label className="label">Тип ставки</label>
                <select className="input" name="rateType" defaultValue="PERCENT">
                  <option value="PERCENT">Процент от чека</option>
                  <option value="FIXED">Фикс за месяц</option>
                </select>
              </div>
              <div>
                <label className="label">Значение</label>
                <input className="input" name="rate" type="number" min="0" step="any" placeholder="34 или 15000" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Комментарий</label>
                <input className="input" name="note" placeholder="что делает на проекте" />
              </div>
              <div className="sm:col-span-2">
                <button className="btn-primary">Сохранить участника</button>
              </div>
            </form>
          </FormModal>
        ) : undefined
      }
    >
      <MiniTable head={["Сотрудник", "Роль на проекте", "Ставка", "Комментарий", ""]}>
        {members.map((m) => (
          <tr key={m.id}>
            <td className="px-3 py-2 text-sm font-medium">{m.user.name}</td>
            <td className="px-3 py-2 text-sm">{ROLES[m.role as keyof typeof ROLES]}</td>
            <td className="px-3 py-2 text-sm whitespace-nowrap">
              {m.rateType === "PERCENT" ? `${m.rate}% от чека` : `${som(m.rate)} в месяц`}
            </td>
            <td className="px-3 py-2 text-sm text-muted">{m.note || "—"}</td>
            <td className="px-3 py-2">
              {canEdit && (
                <form action={deleteMember}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="rounded-lg p-1 text-muted transition hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                </form>
              )}
            </td>
          </tr>
        ))}
        {members.length === 0 && (
          <tr>
            <td className="px-3 py-3 text-sm text-muted" colSpan={5}>
              Участники не назначены — ставки берутся из общих настроек агентства
            </td>
          </tr>
        )}
      </MiniTable>
    </Section>
  );
}
