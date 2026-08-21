import { redirect } from "next/navigation";

/**
 * «Аналитика» переехала во вкладку раздела «Финансы и счета» — старые
 * закладки и ссылки из уведомлений вели сюда, поэтому оставлен редирект,
 * а не 404.
 */
export default function AnalyticsRedirect() {
  redirect("/finance?tab=analytics");
}
