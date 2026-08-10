import { redirect } from "next/navigation";
import { Zap } from "lucide-react";
import { getClientSession, clientLogin } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const session = await getClientSession();
  if (session) redirect("/portal");

  async function action(formData: FormData) {
    "use server";
    const loginValue = String(formData.get("login") || "");
    const password = String(formData.get("password") || "");
    const session = await clientLogin(loginValue, password);
    if (!session) redirect("/portal/login?error=1");
    redirect("/portal");
  }

  return (
    <div className="login-bg flex min-h-screen items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="accent-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white">
            <Zap size={20} fill="currentColor" />
          </span>
          <div>
            <div className="text-lg font-semibold leading-tight tracking-tight">Prime Agency</div>
            <div className="text-xs text-muted">Личный кабинет клиента</div>
          </div>
        </div>

        <h1 className="text-xl font-semibold tracking-tight">Вход в кабинет</h1>
        <p className="mt-1 text-sm text-muted">Логин и пароль выдаёт ваш таргетолог</p>

        <LoginForm action={action} error={Boolean(sp.error)} />
      </div>
    </div>
  );
}
