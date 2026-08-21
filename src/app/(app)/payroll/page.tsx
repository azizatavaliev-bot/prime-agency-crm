import { redirect } from "next/navigation";

/**
 * «Зарплаты» переехали во вкладку раздела «Команда» — старые закладки и
 * ссылки из уведомлений вели сюда, поэтому оставлен редирект, а не 404.
 */
export default async function PayrollRedirect({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams({ tab: "payroll" });
  if (sp.month) params.set("month", sp.month);
  if (sp.error) params.set("error", sp.error);
  redirect(`/team?${params.toString()}`);
}
