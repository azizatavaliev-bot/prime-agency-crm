import { redirect } from "next/navigation";
import { Plus, CheckCircle2, Trash2, Wallet, Clock, AlertCircle, PiggyBank } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientScope, can } from "@/lib/access";
import { deletePayment } from "@/lib/actions";
import { som, dateRu, monthKey, monthLabel, daysUntil } from "@/lib/format";
import { PAYMENT_STATUS } from "@/lib/constants";
import { dicts, labelOf } from "@/lib/dict";
import { Table, Stat } from "@/components/ui";
import FormModal from "@/components/FormModal";
import MarkPaidButton from "@/components/MarkPaidButton";
import PaymentForm from "@/components/PaymentForm";
import { PaymentModal, PayStatusBadge } from "@/components/details";

export default async function PaymentsTab({ sp }: { sp: { month?: string; status?: string } }) {
  const user = await requireUser();
  if (!can.seePayments(user)) redirect("/no-access");
  const month = sp.month || monthKey();

  const payments = await prisma.payment.findMany({
    where: {
      AND: [
        { client: clientScope(user) },
        { periodMonth: month },
        sp.status ? { status: sp.status } : {},
      ],
    },
    include: { client: true, account: true },
    orderBy: { dueAt: "asc" },
  });

  const clients = await prisma.client.findMany({
    where: clientScope(user),
    select: { id: true, name: true, avgCheck: true },
    orderBy: { name: "asc" },
  });
  const contractors = await prisma.user.findMany({
    where: { role: "DEVELOPER", active: true },
    select: { id: true, name: true },
  });
  const accounts = await prisma.account.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const dd = await dicts(["PAYMENT_KIND", "PAYMENT_METHOD", "CLIENT_STATUS"]);
  const paid = payments.filter((p) => p.status === "PAID");
  const revenue = paid.reduce((s, p) => s + p.amount, 0);
  const debt = payments.filter((p) => p.status === "DEBT").reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter((p) => p.status === "PENDING").reduce((s, p) => s + p.amount, 0);
  const isOwner = user.role === "SUPER_ADMIN";

  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(monthKey(d));
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <FormModal
          label="Новый платёж"
          title="Новый платёж"
          icon={<Plus size={16} />}
          hint="Платёж привязывается к клиенту и исполнителю. Сумма сразу делится: доля исполнителя → резерв на развитие → чистая прибыль владельца."
        >
          <PaymentForm
            clients={clients}
            contractors={contractors}
            accounts={accounts}
            kinds={dd.PAYMENT_KIND}
            methods={dd.PAYMENT_METHOD}
          />
        </FormModal>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="Оплачено" value={som(revenue)} tone="good" icon={Wallet} />
        <Stat label="Ожидается" value={som(pending)} tone="warn" icon={Clock} />
        <Stat label="Долг" value={som(debt)} tone={debt ? "bad" : "good"} icon={AlertCircle} />
        {isOwner && (
          <Stat
            label="Прибыль владельца"
            value={som(paid.reduce((s, p) => s + p.ownerNet, 0))}
            icon={PiggyBank}
            hint={`команде ${som(paid.reduce((s, p) => s + p.execShare, 0))}, резерв ${som(
              paid.reduce((s, p) => s + p.reserve, 0)
            )}`}
          />
        )}
      </div>

      <form className="my-4 flex flex-wrap gap-2" action="/finance">
        <input type="hidden" name="tab" value="payments" />
        <select className="input max-w-[180px]" name="month" defaultValue={month}>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        <select className="input max-w-[180px]" name="status" defaultValue={sp.status ?? ""}>
          <option value="">Все статусы</option>
          {Object.entries(PAYMENT_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button className="btn-ghost">Показать</button>
      </form>

      <Table
        head={[
          "Клиент",
          "Тип",
          "Сумма",
          "Статус",
          "План",
          "Оплачено",
          "Метод",
          ...(isOwner ? ["Исполнителю", "Резерв", "Владельцу"] : []),
          "",
        ]}
      >
        {payments.map((p) => {
          const d = daysUntil(p.dueAt);
          return (
            <PaymentModal
              key={p.id}
              payment={p}
              clientName={p.client.name}
              clientId={p.clientId}
              isOwner={isOwner}
              row={
                <>
                  <td className="td font-medium">{p.client.name}</td>
                  <td className="td text-zinc-500">{labelOf(dd.PAYMENT_KIND, p.kind)}</td>
                  <td className="td font-medium">{som(p.amount)}</td>
                  <td className="td">
                    <PayStatusBadge status={p.status} />
                  </td>
                  <td className={`td ${p.status !== "PAID" && d !== null && d <= 3 ? "text-amber-600" : ""}`}>
                    {dateRu(p.dueAt)}
                    {p.status !== "PAID" && d !== null && d < 0 && (
                      <span className="text-red-600"> · просрочено</span>
                    )}
                  </td>
                  <td className="td">{dateRu(p.paidAt)}</td>
                  <td className="td text-zinc-500">{labelOf(dd.PAYMENT_METHOD, p.method)}</td>
                  {isOwner && <td className="td">{som(p.execShare)}</td>}
                  {isOwner && <td className="td">{som(p.reserve)}</td>}
                  {isOwner && <td className="td font-medium">{som(p.ownerNet)}</td>}
                  <td className="td">
                    <div className="flex gap-2">
                      {p.status !== "PAID" && (
                        <MarkPaidButton
                          paymentId={p.id}
                          clientName={p.client.name}
                          amount={som(p.amount)}
                          dueAt={dateRu(p.dueAt)}
                          compact
                        />
                      )}
                      {isOwner && (
                        <form action={deletePayment}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="btn-ghost !px-2 !py-1 text-red-600">
                            <Trash2 size={13} />
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </>
              }
            />
          );
        })}
        {payments.length === 0 && (
          <tr>
            <td className="td text-zinc-500" colSpan={11}>
              Платежей за этот месяц нет
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
