import { redirect } from "next/navigation";

/** Расходы переехали во вкладку раздела «Финансы и счета». */
export default async function ExpensesRedirect({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams({ tab: "expenses" });
  if (sp.month) qs.set("month", sp.month);
  if (sp.category) qs.set("category", sp.category);
  redirect(`/finance?${qs.toString()}`);
}
