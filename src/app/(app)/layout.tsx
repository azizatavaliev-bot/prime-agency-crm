import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";
import Nav, { type NavItem } from "@/components/Nav";
import TopBar from "@/components/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unread = await prisma.notification.count({ where: { userId: user.id, read: false } });

  const items: NavItem[] = [];
  items.push({
    href: "/dashboard",
    label: user.role === "OWNER" ? "Дашборд" : "Мой кабинет",
    icon: "dashboard",
  });
  if (user.role !== "CONTRACTOR") items.push({ href: "/clients", label: "Клиенты", icon: "clients" });
  // Оплаты, расходы и счета — один раздел с вкладками, а не три пункта меню.
  if (user.role === "OWNER" || user.role === "ACCOUNTANT")
    items.push({ href: "/finance", label: "Финансы и счета", icon: "finance" });
  else if (user.role === "ACCOUNT")
    items.push({ href: "/payments", label: "Оплаты", icon: "payments" });
  // Отчёты по таргету и реклама агентства — один раздел с вкладками.
  if (user.role !== "CONTRACTOR")
    items.push({ href: "/marketing", label: "Маркетинг", icon: "marketing" });
  items.push({ href: "/tasks", label: "Задачи", icon: "tasks" });
  items.push({ href: "/regulations", label: "Регламенты", icon: "regulations" });

  if (user.role === "OWNER") {
    items.push({ href: "/team", label: "Команда", icon: "team", group: "Управление" });
    items.push({ href: "/analytics", label: "Аналитика", icon: "analytics", group: "Управление" });
    items.push({ href: "/settings", label: "Настройки", icon: "settings", group: "Управление" });
  }
  items.push({ href: "/notifications", label: "Уведомления", icon: "notifications", group: "Управление" });
  items.push({ href: "/profile", label: "Профиль", icon: "profile", group: "Управление" });

  const recent = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <div className="lg:flex min-h-screen">
      <Nav items={items} user={{ name: user.name, roleLabel: ROLES[user.role] }} unread={unread} />
      <main className="min-w-0 flex-1">
        <TopBar
          user={{ name: user.name, roleLabel: ROLES[user.role] }}
          unread={unread}
          recent={recent.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            link: n.link,
            read: n.read,
            createdAt: n.createdAt.toISOString(),
          }))}
        />
        <div className="p-4 pt-4 lg:p-8 lg:pt-0">{children}</div>
      </main>
    </div>
  );
}
