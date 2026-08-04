import { saveUser } from "@/lib/actions";
import { ROLES } from "@/lib/constants";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  rate: number | null;
  rateType: string;
  projectLimit: number;
  active: boolean;
};

export default function UserForm({
  member,
  defaultLimit,
}: {
  member?: TeamMember;
  defaultLimit: number;
}) {
  return (
    <form action={saveUser} className="grid gap-4 sm:grid-cols-3">
      {member && <input type="hidden" name="id" value={member.id} />}
      <div>
        <label className="label">Имя *</label>
        <input className="input" name="name" required defaultValue={member?.name} />
      </div>
      <div>
        <label className="label">Email *</label>
        <input className="input" name="email" type="email" required defaultValue={member?.email} />
      </div>
      <div>
        <label className="label">Пароль</label>
        <input className="input" name="password" placeholder={member ? "оставить прежним" : "prime2026"} />
      </div>
      <div>
        <label className="label">Роль</label>
        <select className="input" name="role" defaultValue={member?.role ?? "TARGETOLOG"}>
          {Object.entries(ROLES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Ставка</label>
        <input
          className="input"
          name="rate"
          type="number"
          step="any"
          defaultValue={member?.rate ?? ""}
          placeholder="34"
        />
      </div>
      <div>
        <label className="label">Тип ставки</label>
        <select className="input" name="rateType" defaultValue={member?.rateType ?? "PERCENT"}>
          <option value="PERCENT">% от чека</option>
          <option value="FIXED">фикс, сом</option>
        </select>
      </div>
      <div>
        <label className="label">Лимит проектов</label>
        <input
          className="input"
          name="projectLimit"
          type="number"
          defaultValue={member?.projectLimit ?? defaultLimit}
        />
      </div>
      <div className="flex items-end">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={member?.active ?? true} /> Активен
        </label>
      </div>
      <div className="sm:col-span-3">
        <button className="btn-primary">{member ? "Сохранить" : "Добавить"}</button>
      </div>
    </form>
  );
}
