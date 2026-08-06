import { redirect } from "next/navigation";

/** Ежедневные отчёты переехали во вкладку раздела «Маркетинг». */
export default async function DailyRedirect() {
  redirect("/marketing?tab=daily");
}
