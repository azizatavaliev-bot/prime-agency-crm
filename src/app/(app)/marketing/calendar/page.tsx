import { redirect } from "next/navigation";

/** Календарь переехал во вкладку раздела «Маркетинг». */
export default async function CalendarRedirect({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams({ tab: "calendar" });
  if (sp.y) qs.set("y", sp.y);
  if (sp.m) qs.set("m", sp.m);
  redirect(`/marketing?${qs.toString()}`);
}
