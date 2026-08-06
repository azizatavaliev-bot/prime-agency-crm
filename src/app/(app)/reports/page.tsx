import { redirect } from "next/navigation";

/** Отчёты по таргету переехали во вкладку «По клиентам» раздела «Маркетинг». */
export default async function ReportsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams({ tab: "clients" });
  if (sp.clientId) qs.set("clientId", sp.clientId);
  redirect(`/marketing?${qs.toString()}`);
}
