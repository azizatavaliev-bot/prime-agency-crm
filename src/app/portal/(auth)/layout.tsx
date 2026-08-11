import Link from "next/link";
import { LogOut, Bell, Zap, ListTodo } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireClient();
  const unread = await prisma.notification.count({ where: { clientId: session.clientId, read: false } });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur lg:px-8">
        <Link href="/portal" className="flex items-center gap-2.5">
          <span className="accent-gradient flex h-8 w-8 items-center justify-center rounded-lg text-white">
            <Zap size={16} fill="currentColor" />
          </span>
          <div>
            <div className="text-sm font-medium leading-tight">{session.name}</div>
            <div className="text-xs text-muted leading-tight">Личный кабинет клиента</div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/portal/tasks" className="btn-ghost !px-3 !py-1.5">
            <ListTodo size={15} />
          </Link>
          <Link href="/portal/notifications" className="btn-ghost !px-3 !py-1.5 relative">
            <Bell size={15} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                {unread}
              </span>
            )}
          </Link>
          <form action="/api/portal-logout" method="POST">
            <button className="btn-ghost !px-3 !py-1.5">
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-4 lg:p-8">{children}</main>
    </div>
  );
}
