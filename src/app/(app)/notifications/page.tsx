import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readAllNotifications } from "@/lib/actions";
import { dateRu } from "@/lib/format";
import { PageHeader, Empty } from "@/components/ui";
import { Wallet, CircleAlert, Sparkles, Bell, CheckCheck, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const ICONS = { PAYMENT_DUE: Wallet, CPL_ALERT: CircleAlert, NEW_LEAD: Sparkles } as const;
const TONES: Record<string, string> = {
  PAYMENT_DUE: "bg-amber-50 text-amber-600",
  CPL_ALERT: "bg-red-50 text-red-600",
  NEW_LEAD: "bg-sky-50 text-sky-600",
};

export default async function NotificationsPage() {
  const user = await requireUser();
  const list = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Уведомления"
        subtitle="Оплаты, превышение CPL, новые назначения"
        right={
          list.some((n) => !n.read) ? (
            <form action={readAllNotifications}>
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
              {(() => {
                const Icon = ICONS[n.kind as keyof typeof ICONS] ?? Bell;
                return (
                  <div className={`rounded-xl p-2 ${TONES[n.kind] ?? "bg-zinc-100 text-zinc-500"}`}>
                    <Icon size={16} />
                  </div>
                );
              })()}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{n.title}</div>
                {n.body && <div className="mt-1 text-sm text-zinc-500">{n.body}</div>}
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
        {list.length === 0 && <Empty text="Уведомлений нет" />}
      </div>
    </div>
  );
}
