import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Plus,
  FileText,
  Trash2,
  Pencil,
  FileBarChart,
  Wallet,
  Users,
  Target,
  CircleCheck,
  CircleAlert,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientScope, can } from "@/lib/access";
import { reportMetrics } from "@/lib/finance";
import { deleteReport } from "@/lib/actions";
import { som, dateRu, num, targetCplLabel } from "@/lib/format";
import { Table, Stat } from "@/components/ui";
import FormModal from "@/components/FormModal";
import FilterSelect from "@/components/FilterSelect";
import ReportForm from "@/components/ReportForm";
import { ReportModal } from "@/components/details";

export default async function ClientReportsTab({ sp }: { sp: { clientId?: string } }) {
  const user = await requireUser();
  if (user.role === "DEVELOPER" || user.role === "EDITOR") redirect("/no-access");

  const clients = await prisma.client.findMany({
    where: clientScope(user),
    select: { id: true, name: true, targetCpl: true },
    orderBy: { name: "asc" },
  });

  const reports = await prisma.adReport.findMany({
    where: {
      AND: [{ client: clientScope(user) }, sp.clientId ? { clientId: sp.clientId } : {}],
    },
    include: { client: true, author: true },
    orderBy: { periodTo: "desc" },
    take: 100,
  });

  const withM = reports.map((r) => ({ r, m: reportMetrics(r) }));
  const inTarget = withM.filter((x) => x.m.inTarget === true).length;
  const spent = reports.reduce((s, r) => s + r.spent, 0);
  const leads = reports.reduce((s, r) => s + r.leads, 0);

  return (
    <div>
      {can.writeReports(user) && clients.length > 0 && (
        <div className="mb-4 flex justify-end">
          <FormModal
            label="Новый отчёт"
            title="Отчёт за период"
            icon={<Plus size={16} />}
            hint="Целевой CPL — порог решения: связки дороже отключаем, дешевле — масштабируем. Если факт выше порога, таргетолог и владелец получат алерт."
          >
            <ReportForm clients={clients} />
          </FormModal>
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="Отчётов" value={String(reports.length)} icon={FileBarChart} />
        <Stat label="Потрачено" value={som(spent)} icon={Wallet} />
        <Stat label="Заявок" value={num(leads)} icon={Users} />
        <Stat
          label="Средний CPL"
          value={leads ? `${num(spent / leads)} сом` : "—"}
          hint={`в цели: ${inTarget} из ${withM.filter((x) => x.m.inTarget !== null).length}`}
          tone={inTarget > withM.length / 2 ? "good" : "warn"}
          icon={Target}
        />
      </div>

      <form className="my-4 flex flex-wrap gap-2" action="/marketing">
        <input type="hidden" name="tab" value="clients" />
        <FilterSelect
          name="clientId"
          defaultValue={sp.clientId ?? ""}
          width="max-w-xs"
          options={[
            { value: "", label: "Все проекты" },
            ...clients.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </form>

      <Table head={["Проект", "Период", "Потрачено", "Заявки", "CPL", "Цель", "CPA", "Статус", "Связки", ""]}>
        {withM.map(({ r, m }) => (
          <ReportModal
            key={r.id}
            report={r}
            clientName={r.client.name}
            clientId={r.clientId}
            canEdit={can.writeReports(user)}
            defaultTargetCpl={r.client.targetCpl}
            className={m.inTarget === false ? "bg-red-50" : m.inTarget ? "bg-emerald-50" : ""}
            row={
              <>
                <td className="td font-medium">{r.client.name}</td>
                <td className="td text-zinc-500">
                  {dateRu(r.periodFrom)} — {dateRu(r.periodTo)}
                </td>
                <td className="td">{som(r.spent)}</td>
                <td className="td">{r.leads}</td>
                <td
                  className={`td font-medium ${
                    m.cplOk === false ? "text-red-600" : m.cplOk ? "text-emerald-600" : ""
                  }`}
                >
                  {m.cpl ? `${num(m.cpl)} сом` : "—"}
                </td>
                <td className="td text-zinc-500">{targetCplLabel(r.targetCpl)}</td>
                <td className={`td ${m.cpaOk === false ? "text-red-600" : m.cpaOk ? "text-emerald-600" : ""}`}>
                  {m.cpa ? `${num(m.cpa)} сом` : "—"}
                </td>
                <td className="td">
                  {m.inTarget === null ? (
                    "—"
                  ) : m.inTarget ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600">
                      <CircleCheck size={14} /> в цели
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-red-600">
                      <CircleAlert size={14} /> превышение
                    </span>
                  )}
                </td>
                <td className="td text-zinc-500">{r.bundles || "—"}</td>
                <td className="td">
                  <div className="flex gap-2">
                    <Link href={`/reports/${r.id}`} className="btn-ghost !px-3 !py-1 !text-xs">
                      <FileText size={13} /> Клиенту
                    </Link>
                    {can.writeReports(user) && (
                      <>
                        <FormModal
                          label=""
                          title={`Отчёт за период — ${r.client.name}`}
                          variant="ghost"
                          icon={<Pencil size={13} />}
                          hint="Если ошиблись в цифрах, цели или скриншоте — поправьте и сохраните заново."
                        >
                          <ReportForm
                            clients={[]}
                            fixedClientId={r.clientId}
                            defaultTargetCpl={r.client.targetCpl}
                            report={{ ...r, hasScreenshot: Boolean(r.screenshot) }}
                          />
                        </FormModal>
                        <form action={deleteReport}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="btn-ghost !px-2 !py-1 text-red-600" title="Удалить отчёт">
                            <Trash2 size={13} />
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </td>
              </>
            }
          />
        ))}
        {reports.length === 0 && (
          <tr>
            <td className="td text-zinc-500" colSpan={10}>
              Отчётов пока нет
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
