import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import SubNav, { type SubNavItem } from "@/components/SubNav";

export const dynamic = "force-dynamic";

const ITEMS: SubNavItem[] = [
  { href: "/settings", label: "Общие", icon: "general" },
  { href: "/settings/dictionaries", label: "Справочники", icon: "dictionaries" },
  { href: "/settings/team", label: "Сотрудники", icon: "team" },
  { href: "/settings/notifications", label: "Уведомления", icon: "notifications" },
  { href: "/settings/export", label: "Экспорт", icon: "export" },
  { href: "/settings/integrations", label: "Интеграции", icon: "integrations" },
];

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireOwner();
  const [clients, users, accounts, dictItems] = await Promise.all([
    prisma.client.count(),
    prisma.user.count({ where: { active: true } }),
    prisma.account.count({ where: { active: true } }),
    prisma.dictItem.count({ where: { active: true } }),
  ]);

  const tiles = [
    { label: "Клиентов", value: clients },
    { label: "Сотрудников", value: users },
    { label: "Счетов", value: accounts },
    { label: "Значений в справочниках", value: dictItems },
  ];

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Настройки"
        subtitle="Здесь настраивается вся система: деньги, справочники, доступы, уведомления и интеграции"
      />

      <div className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-4">
            <div className="text-xs text-muted">{t.label}</div>
            <div className="mt-1 text-2xl font-semibold">{t.value}</div>
          </div>
        ))}
      </div>

      <SubNav items={ITEMS} />
      {children}
    </div>
  );
}
