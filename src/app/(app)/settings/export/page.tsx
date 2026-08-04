import { Download, FileSpreadsheet, FileText, Info } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";

const TILES: { type: string; label: string; hint: string }[] = [
  { type: "clients", label: "Клиенты", hint: "статусы, чеки, услуги, таргетологи" },
  { type: "payments", label: "Оплаты", hint: "суммы, статусы, распределение долей" },
  { type: "expenses", label: "Расходы", hint: "категории, статусы, проекты" },
  { type: "ledger", label: "Журнал операций", hint: "приходы, расходы и переводы одним файлом" },
  { type: "reports", label: "Отчёты по таргету", hint: "бюджеты, заявки, CPL и CPA" },
  { type: "tasks", label: "Задачи", hint: "доски, этапы, дедлайны, исполнители" },
  { type: "team", label: "Команда", hint: "роли, ставки, загрузка" },
];

export default async function SettingsExportPage() {
  const [clients, payments, expenses, reports, tasks, users] = await Promise.all([
    prisma.client.count(),
    prisma.payment.count(),
    prisma.expense.count(),
    prisma.adReport.count(),
    prisma.task.count(),
    prisma.user.count(),
  ]);
  const counts: Record<string, number> = {
    clients,
    payments,
    expenses,
    reports,
    tasks,
    team: users,
    ledger: payments + expenses,
  };

  return (
    <div>
      <Section title="Выгрузка в Excel" icon={FileSpreadsheet}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.map((t) => (
            <a
              key={t.type}
              href={`/api/export?type=${t.type}`}
              className="card p-4 transition hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{t.label}</span>
                <Download size={16} className="text-muted" />
              </div>
              <div className="mt-1 text-xs text-muted">{t.hint}</div>
              <div className="mt-2 text-xs text-muted">записей: {counts[t.type] ?? 0}</div>
            </a>
          ))}
        </div>
        <div className="mt-3 flex gap-2 rounded-2xl bg-subtle p-3 text-xs text-muted">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            Файлы в формате CSV с разделителем «;» и кодировкой UTF-8 — открываются в Excel, Numbers и Google
            Таблицах без настроек. Выгружаются все записи, не только текущий месяц.
          </span>
        </div>
      </Section>

      <Section title="Печать в PDF" icon={FileText}>
        <div className="card p-4 text-sm text-muted">
          Отчёт для клиента и сводку по агентству можно сохранить в PDF кнопкой «Скачать PDF»: в карточке отчёта
          (раздел «Отчёты по таргету» → «Клиенту») и на странице «Аналитика».
        </div>
      </Section>
    </div>
  );
}
