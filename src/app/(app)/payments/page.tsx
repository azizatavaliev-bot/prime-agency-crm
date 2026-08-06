import { redirect } from "next/navigation";

/** Оплаты переехали во вкладку раздела «Финансы и счета». */
export default async function PaymentsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams({ tab: "payments" });
  if (sp.month) qs.set("month", sp.month);
  if (sp.status) qs.set("status", sp.status);
  redirect(`/finance?${qs.toString()}`);
}
