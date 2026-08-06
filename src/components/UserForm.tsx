"use client";

import { useState } from "react";
import { Crown, Calculator, Target, Headset, Code2, type LucideIcon } from "lucide-react";
import { saveUser } from "@/lib/actions";
import Select from "./Select";
import PasswordField from "./PasswordField";

/** Что реально открывает каждая роль — видно прямо при выборе. */
const ROLE_META: Record<string, { label: string; hint: string; icon: LucideIcon }> = {
  OWNER: { label: "Владелец", hint: "всё: финансы, прибыль, команда", icon: Crown },
  ACCOUNTANT: { label: "Бухгалтер", hint: "оплаты, долги, расходы — без вашей прибыли", icon: Calculator },
  TARGETOLOG: { label: "Таргетолог", hint: "свои проекты, отчёты, маркетинг", icon: Target },
  ACCOUNT: { label: "Аккаунт-менеджер", hint: "свои клиенты и оплаты", icon: Headset },
  CONTRACTOR: { label: "Подрядчик", hint: "только свои задачи на досках", icon: Code2 },
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  rate: number | null;
  rateType: string;
  projectLimit: number;
  active: boolean;
  phone?: string | null;
};

export default function UserForm({
  member,
  defaultLimit,
}: {
  member?: TeamMember;
  defaultLimit: number;
}) {
  const [role, setRole] = useState(member?.role ?? "TARGETOLOG");
  const [rateType, setRateType] = useState(member?.rateType ?? "PERCENT");

  // Ставка нужна тем, кто получает долю с проектов.
  const needsRate = role === "TARGETOLOG" || role === "CONTRACTOR" || role === "ACCOUNT";

  return (
    <form action={saveUser} className="space-y-5">
      {member && <input type="hidden" name="id" value={member.id} />}
      <input type="hidden" name="role" value={role} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Имя</label>
          <input
            className="input"
            name="name"
            required
            defaultValue={member?.name}
            placeholder="Айбек Осмонов"
          />
        </div>
        <div>
          <label className="label">Телефон</label>
          <input
            className="input"
            name="phone"
            defaultValue={member?.phone ?? ""}
            placeholder="+996 555 000 000"
          />
        </div>
        <div>
          <label className="label">Email — это и есть логин</label>
          <input
            className="input"
            name="email"
            type="email"
            required
            defaultValue={member?.email}
            placeholder="name@prime.kg"
          />
        </div>
        <PasswordField isNew={!member} />
      </div>

      {/* Роль карточками: сразу понятно, что человек увидит в системе */}
      <div>
        <div className="label">Роль и доступ</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(ROLE_META).map(([key, meta]) => {
            const Icon = meta.icon;
            const active = role === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setRole(key)}
                className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                  active
                    ? "accent-soft border-transparent ring-2 ring-[var(--accent)]"
                    : "border-zinc-200 hover:bg-subtle"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    active ? "accent-gradient text-white" : "bg-subtle text-muted"
                  }`}
                >
                  <Icon size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-tight">{meta.label}</span>
                  <span className="block text-[11px] leading-tight text-muted">{meta.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {needsRate && (
        <div className="rounded-2xl border border-zinc-200 p-4">
          <div className="mb-3 text-sm font-medium">Ставка по умолчанию</div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Тип</label>
              <Select
                name="rateType"
                defaultValue={rateType}
                onChange={setRateType}
                options={[
                  { value: "PERCENT", label: "Процент от чека" },
                  { value: "FIXED", label: "Фикс за месяц" },
                ]}
              />
            </div>
            <div>
              <label className="label">{rateType === "PERCENT" ? "Процент, %" : "Сумма, сом"}</label>
              <input
                className="input"
                name="rate"
                type="number"
                step="any"
                min="0"
                defaultValue={member?.rate ?? ""}
                placeholder={rateType === "PERCENT" ? "34" : "15000"}
              />
            </div>
            <div>
              <label className="label">Лимит проектов</label>
              <input
                className="input"
                name="projectLimit"
                type="number"
                min="1"
                defaultValue={member?.projectLimit ?? defaultLimit}
              />
            </div>
          </div>
          <div className="mt-2 text-xs text-muted">
            Ставка по умолчанию. На конкретном проекте она задаётся в карточке клиента → «Кто
            работает» и имеет приоритет.
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={member?.active ?? true} />
        Работает в агентстве — снимите галочку вместо удаления
      </label>

      <button className="btn-primary w-full">
        {member ? "Сохранить" : "Добавить сотрудника"}
      </button>
    </form>
  );
}
