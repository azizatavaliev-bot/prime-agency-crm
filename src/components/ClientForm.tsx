"use client";

import { Building2, Users, Wallet, FileSignature, Target, StickyNote } from "lucide-react";
import { saveClient } from "@/lib/actions";
import { toInputDate } from "@/lib/format";
import { CLIENT_STATUS, SERVICES } from "@/lib/constants";
import Select from "./Select";
import DatePicker from "./DatePicker";
import FormSection from "./FormSection";
import SubmitButton from "./SubmitButton";

type UserOpt = { id: string; name: string; role: string };
type Opt = { key: string; name: string };

const toOpts = (o: Record<string, string>) => Object.entries(o).map(([key, name]) => ({ key, name }));

export default function ClientForm({
  users,
  client,
  canAssignAccount,
  statuses = [],
  services: serviceOpts = [],
  sources = [],
  niches = [],
}: {
  users: UserOpt[];
  statuses?: Opt[];
  services?: Opt[];
  sources?: Opt[];
  niches?: Opt[];
  client?: {
    id: string;
    name: string;
    niche: string | null;
    contact: string | null;
    source: string | null;
    status: string;
    avgCheck: number;
    startedAt: Date;
    services: string;
    adAccount: string | null;
    nextPaymentAt: Date | null;
    notes: string | null;
    targetologId: string | null;
    accountId: string | null;
    paymentDay?: number | null;
    contractStart?: Date | null;
    contractEnd?: Date | null;
    profitPercent?: number | null;
    goal?: string | null;
    agreement?: string | null;
    targetCpl?: number | null;
    sitePrice?: number | null;
    botPrice?: number | null;
    videoPrice?: number | null;
    portalLogin?: string | null;
    cardLast4?: string | null;
    cardHolder?: string | null;
  };
  canAssignAccount: boolean;
}) {
  const services = (client?.services || "").split(",").filter(Boolean);
  const statusList = statuses.length ? statuses : toOpts(CLIENT_STATUS);
  const serviceList = serviceOpts.length ? serviceOpts : toOpts(SERVICES);
  const targetologs = users.filter((u) => u.role === "TARGETOLOG");
  const accountManagers = users.filter((u) => u.role === "TEAM_LEAD");

  return (
    <form action={saveClient} className="space-y-5">
      {client && <input type="hidden" name="id" value={client.id} />}

      {/* Короткие блоки — парами на широком экране: окно шире (max-w-4xl), меньше
          прокрутки, чем когда все 7 секций идут одна под одной в узкую колонку. */}
      <div className="grid gap-5 lg:grid-cols-2">
      <FormSection title="О клиенте" hint="Как называется и чем занимается" icon={Building2}>
        <div>
          <label className="label">Название *</label>
          <input className="input" name="name" required autoFocus defaultValue={client?.name} placeholder="Стоматология «Ак Тиш»" />
        </div>
        <div>
          <label className="label">Ниша</label>
          <input
            className="input"
            name="niche"
            defaultValue={client?.niche ?? ""}
            placeholder="стоматология, кофейня…"
            list="niche-options"
          />
          <datalist id="niche-options">
            {niches.map((nc) => (
              <option key={nc.key} value={nc.name} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label">Контакт</label>
          <input
            className="input"
            name="contact"
            defaultValue={client?.contact ?? ""}
            placeholder="имя, WhatsApp / Telegram"
          />
        </div>
        <div>
          <label className="label">Источник заявки</label>
          <input
            className="input"
            name="source"
            defaultValue={client?.source ?? ""}
            placeholder="рекомендация, Instagram…"
            list="source-options"
          />
          <datalist id="source-options">
            {sources.map((sc) => (
              <option key={sc.key} value={sc.name} />
            ))}
          </datalist>
        </div>
      </FormSection>

      <FormSection title="Кто ведёт" hint="Ответственные за проект" icon={Users}>
        <div>
          <label className="label">Таргетолог</label>
          <Select
            name="targetologId"
            defaultValue={client?.targetologId ?? ""}
            placeholder="— не назначен —"
            options={[
              { value: "", label: "— не назначен —" },
              ...targetologs.map((u) => ({ value: u.id, label: u.name })),
            ]}
          />
        </div>
        {canAssignAccount && (
          <div>
            <label className="label">Аккаунт-менеджер</label>
            <Select
              name="accountId"
              defaultValue={client?.accountId ?? ""}
              placeholder="— не назначен —"
              options={[
                { value: "", label: "— не назначен —" },
                ...accountManagers.map((u) => ({ value: u.id, label: u.name })),
              ]}
            />
          </div>
        )}
        <div>
          <label className="label">Статус</label>
          <Select
            name="status"
            defaultValue={client?.status ?? statusList[0]?.key ?? "TEST"}
            options={statusList.map((st) => ({ value: st.key, label: st.name }))}
          />
        </div>
        <div>
          <label className="label">Дата старта</label>
          <DatePicker name="startedAt" defaultValue={toInputDate(client?.startedAt ?? new Date())} />
        </div>
      </FormSection>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
      <FormSection title="Деньги" hint="Абонплата и когда клиент платит" icon={Wallet}>
        <div>
          <label className="label">Абонплата, сом</label>
          <input
            className="input"
            name="avgCheck"
            type="number"
            min="0"
            step="any"
            defaultValue={client?.avgCheck ?? 0}
          />
        </div>
        <div>
          <label className="label">День оплаты (число месяца)</label>
          <input
            className="input"
            name="paymentDay"
            type="number"
            min="1"
            max="31"
            defaultValue={client?.paymentDay ?? ""}
            placeholder="например 10"
          />
        </div>
        <div>
          <label className="label">% от прибыли</label>
          <input
            className="input"
            name="profitPercent"
            type="number"
            min="0"
            step="any"
            defaultValue={client?.profitPercent ?? ""}
            placeholder="если работаем за процент"
          />
        </div>
        <div>
          <label className="label">Следующая оплата (разово)</label>
          <DatePicker name="nextPaymentAt" defaultValue={toInputDate(client?.nextPaymentAt)} />
        </div>
      </FormSection>

      <FormSection title="Договор" hint="Сроки действия — предупредим за 30 дней до конца" icon={FileSignature}>
        <div>
          <label className="label">Подписан</label>
          <DatePicker name="contractStart" defaultValue={toInputDate(client?.contractStart)} />
        </div>
        <div>
          <label className="label">Действует до</label>
          <DatePicker name="contractEnd" defaultValue={toInputDate(client?.contractEnd)} />
        </div>
      </FormSection>
      </div>

      <FormSection title="Услуги и цель" hint="Что делаем и к какому результату идём" icon={Target} columns={1}>
        <div>
          <div className="label">Услуги</div>
          <div className="flex flex-wrap gap-2">
            {serviceList.map((sv) => (
              <label key={sv.key} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="services"
                  value={sv.key}
                  defaultChecked={services.includes(sv.key)}
                  className="peer sr-only"
                />
                <span className="chip chip-toggle border-zinc-200 text-muted transition">
                  {sv.name}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Целевой CPL, сом</label>
            <input
              className="input"
              name="targetCpl"
              type="number"
              min="0"
              step="any"
              defaultValue={client?.targetCpl ?? ""}
              placeholder="порог решения по заявке"
            />
          </div>
          <div>
            <label className="label">Цель клиента</label>
            <input
              className="input"
              name="goal"
              defaultValue={client?.goal ?? ""}
              placeholder="20 заявок в месяц по 500 сом"
            />
          </div>
        </div>
        <div>
          <div className="label">Стоимость доп. услуг, сом</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              className="input"
              name="sitePrice"
              type="number"
              min="0"
              step="any"
              defaultValue={client?.sitePrice ?? ""}
              placeholder="сайт"
            />
            <input
              className="input"
              name="botPrice"
              type="number"
              min="0"
              step="any"
              defaultValue={client?.botPrice ?? ""}
              placeholder="чат-бот"
            />
            <input
              className="input"
              name="videoPrice"
              type="number"
              min="0"
              step="any"
              defaultValue={client?.videoPrice ?? ""}
              placeholder="монтаж"
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Договорённости и доступы" icon={StickyNote} columns={1}>
        <div>
          <label className="label">Что договорились</label>
          <textarea
            className="input"
            name="agreement"
            rows={2}
            defaultValue={client?.agreement ?? ""}
            placeholder="что входит в абонплату, кто снимает видео, сроки отчётов"
          />
        </div>
        <div>
          <label className="label">Рекламный кабинет</label>
          <input
            className="input"
            name="adAccount"
            defaultValue={client?.adAccount ?? ""}
            placeholder="кабинет клиента / агентский, логин"
          />
        </div>
        <div>
          <label className="label">Заметки</label>
          <textarea className="input" name="notes" rows={2} defaultValue={client?.notes ?? ""} />
        </div>
      </FormSection>

      <FormSection title="Портал клиента" hint="Логин и пароль для входа клиента в личный кабинет" icon={Wallet}>
        <div>
          <label className="label">Логин портала</label>
          <input
            className="input"
            name="portalLogin"
            defaultValue={client?.portalLogin ?? ""}
            placeholder="например, aktish"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div>
          <label className="label">{client?.portalLogin ? "Новый пароль (необязательно)" : "Пароль"}</label>
          <input
            className="input"
            name="portalPassword"
            type="text"
            placeholder={client?.portalLogin ? "оставьте пустым, чтобы не менять" : "придумайте пароль"}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div>
          <label className="label">Последние 4 цифры карты</label>
          <input className="input" name="cardLast4" maxLength={4} defaultValue={client?.cardLast4 ?? ""} placeholder="1234" />
        </div>
        <div>
          <label className="label">Держатель карты</label>
          <input className="input" name="cardHolder" defaultValue={client?.cardHolder ?? ""} placeholder="Имя Фамилия" />
        </div>
      </FormSection>

      <div className="form-footer">
        <SubmitButton pendingLabel="Сохраняем…">
          {client ? "Сохранить изменения" : "Добавить клиента"}
        </SubmitButton>
      </div>
    </form>
  );
}
