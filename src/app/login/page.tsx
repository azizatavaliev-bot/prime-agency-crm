import { redirect } from "next/navigation";
import { Crown, Target, Headset, Code2, Zap, Calculator } from "lucide-react";
import { getSession, login } from "@/lib/auth";

const DEMO = [
  { email: "owner@prime.kg", label: "Владелец", hint: "все финансы и цели", icon: Crown },
  { email: "buh@prime.kg", label: "Бухгалтер", hint: "оплаты, долги, расходы", icon: Calculator },
  { email: "target1@prime.kg", label: "Таргетолог", hint: "только свои проекты", icon: Target },
  { email: "account@prime.kg", label: "Аккаунт-менеджер", hint: "клиенты и оплаты", icon: Headset },
  { email: "dev@prime.kg", label: "Подрядчик", hint: "задачи по разработке", icon: Code2 },
];
const DEMO_PASSWORD = "prime2026";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  // на проде демо-кнопки скрыты: иначе любой по ссылке зайдёт владельцем
  const demoMode = process.env.DEMO_MODE === "1";
  const session = await getSession();
  if (session) redirect("/dashboard");

  async function action(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const user = await login(email, password);
    if (!user) redirect("/login?error=1");
    redirect("/dashboard");
  }

  async function quickLogin(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "");
    if (process.env.DEMO_MODE !== "1") redirect("/login?error=1");
    if (!DEMO.some((d) => d.email === email)) redirect("/login?error=1");
    const user = await login(email, DEMO_PASSWORD);
    if (!user) redirect("/login?error=1");
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center gap-2 text-xl font-semibold">
          <Zap size={20} className="text-amber-500" fill="currentColor" />
          Prime Agency
        </div>
        <p className="mt-1 text-sm text-muted">Система учёта агентства</p>

        <form action={action} className="mt-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <label className="label">Пароль</label>
            <input
              className="input"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          {sp.error && <div className="text-sm text-red-600">Неверный email или пароль</div>}
          <button className="btn-primary w-full">Войти</button>
        </form>

        {demoMode && (
        <div className="mt-6 border-t border-zinc-200 pt-5">
          <div className="mb-3 text-xs font-medium text-muted">Быстрый вход в демо — один клик</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEMO.map((d) => {
              const Icon = d.icon;
              return (
                <form key={d.email} action={quickLogin}>
                  <input type="hidden" name="email" value={d.email} />
                  <button className="btn-ghost w-full !justify-start !px-3 !py-2.5 text-left">
                    <Icon size={16} className="shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-tight">{d.label}</span>
                      <span className="block text-[11px] text-muted leading-tight">{d.hint}</span>
                    </span>
                  </button>
                </form>
              );
            })}
          </div>
          <div className="mt-3 text-[11px] text-muted">
            Пароль у всех демо-аккаунтов: <code>{DEMO_PASSWORD}</code>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
