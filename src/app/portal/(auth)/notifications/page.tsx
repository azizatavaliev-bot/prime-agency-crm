import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readAllPortalNotifications } from "@/lib/actions";
import { dateRu } from "@/lib/format";
import { PageHeader, Empty } from "@/components/ui";
import { FileBarChart, CheckCheck, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortalNotificationsPage() {
  const session = await requireClient();
  const list = await prisma.notification.findMany({
    where: { clientId: session.clientId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Уведомления"
        subtitle="Новые отчёты по вашему проекту"
        right={
          list.some((n) => !n.read) ? (
            <form action={readAllPortalNotifications}>
              <button className="btn-ghost">
                <CheckCheck size={15} /> Отметить всё прочитанным
              </button>
            </form>
          ) : undefined
        }
      />
      <div className="space-y-2">
        {list.map((n) => (
          <div key={n.id} className={`card p-4 ${n.read ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-sky-50 p-2 text-sky-600">
                <FileBarChart size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{n.title}</div>
                {n.body && <div className="mt-1 whitespace-pre-line text-sm text-zinc-500">{n.body}</div>}
                <div className="mt-1 text-xs text-zinc-400">{dateRu(n.createdAt)}</div>
              </div>
              {n.link && (
                <Link href={n.link} className="btn-ghost !px-3 !py-1 !text-xs">
                  Открыть <ArrowRight size={13} />
                </Link>
              )}
            </div>
          </div>
        ))}
        {list.length === 0 && <Empty text="Уведомлений пока нет" />}
      </div>
    </div>
  );
}
