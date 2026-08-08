import { redirect } from "next/navigation";
import {
  Crown,
  Target,
  Headset,
  Code2,
  Zap,
  Calculator,
  Users,
  Wallet,
  KanbanSquare,
  BarChart3,
} from "lucide-react";
import { getSession, login, demoLoginEnabled } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

const DEMO: { email: string; label: string; hint: string; icon: typeof Crown; wide?: boolean }[] = [
  { email: "owner@prime.kg", label: "Владелец", hint: "всё: финансы, прибыль, команда", icon: Crown, wide: true },
  { email: "buh@prime.kg", label: "Бухгалтер", hint: "оплаты, долги, расходы", icon: Calculator },
  { email: "target1@prime.kg", label: "Таргетолог", hint: "свои проекты и отчёты", icon: Target },
  { email: "account@prime.kg", label: "Аккаунт-менеджер", hint: "клиенты и оплаты", icon: Headset },
  { email: "dev@prime.kg", label: "Подрядчик", hint: "только свои задачи", icon: Code2 },
];
const DEMO_PASSWORD = "prime2026";

/** Что человек увидит внутри — короткий рассказ на экране входа. */
const FEATURES = [
  { icon: Users, title: "Клиенты и проекты", text: "договоры, дни оплат, рост в цифрах" },
  { icon: Wallet, title: "Финансы", text: "оплаты, расходы, счета и прибыль" },
  { icon: KanbanSquare, title: "Задачи", text: "доски, чеклисты, напоминания" },
  { icon: BarChart3, title: "Реклама", text: "цена заявки по каждому проекту" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  // локально включено само, на проде — только по явному DEMO_MODE=1
  const demoMode = demoLoginEnabled();
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
    // Проверка та же, что и при отрисовке: иначе кнопки спрятаны, а вход работает.
    if (!demoLoginEnabled()) redirect("/login?error=1");
    if (!DEMO.some((d) => d.email === email)) redirect("/login?error=1");
    const user = await login(email, DEMO_PASSWORD);
    if (!user) redirect("/login?error=1");
    redirect("/dashboard");
  }

  return (
    <div className="login-bg flex min-h-screen items-center justify-center p-4 lg:p-8">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl lg:grid-cols-2">
        {/* Левая половина — только на большом экране: на телефоне она съедала бы форму */}
        <div className="relative hidden flex-col overflow-hidden p-8 text-white lg:flex login-side">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                <Zap size={20} fill="currentColor" />
              </span>
              <div>
                <div className="text-lg font-semibold leading-tight tracking-tight">Prime Agency</div>
                <div className="text-xs text-white/70">Система учёта агентства</div>
              </div>
            </div>

            <div className="mt-8 space-y-3.5">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                      <Icon size={15} />
                    </span>
                    <div>
                      <div className="text-sm font-medium leading-tight">{f.title}</div>
                      <div className="text-xs leading-snug text-white/70">{f.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* mt-auto прижимает подпись вниз, но не даёт ей наехать на список */}
          <div className="mt-auto pt-8 text-xs leading-relaxed text-white/60">
            Доступ только для сотрудников агентства.
            <br />
            Логин и пароль выдаёт руководитель.
          </div>
        </div>

        {/* Правая половина — сама форма */}
        <div className="p-6 sm:p-8">
          {/* На телефоне логотип показываем здесь: левой панели там нет */}
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="accent-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white">
              <Zap size={20} fill="currentColor" />
            </span>
            <div>
              <div className="text-lg font-semibold leading-tight tracking-tight">Prime Agency</div>
              <div className="text-xs text-muted">Система учёта агентства</div>
            </div>
          </div>

          <div className="hidden lg:block">
            <h1 className="text-xl font-semibold tracking-tight">Вход в систему</h1>
            <p className="mt-1 text-sm text-muted">Введите данные, которые вам выдали</p>
          </div>

        <LoginForm action={action} error={Boolean(sp.error)} />

        {demoMode && (
          <div className="mt-6 border-t border-zinc-200 pt-5">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="h-px flex-1 bg-zinc-200" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
                Быстрый вход
              </span>
              <span className="h-px flex-1 bg-zinc-200" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO.map((d) => {
                const Icon = d.icon;
                return (
                  <form key={d.email} action={quickLogin} className={d.wide ? "col-span-2" : ""}>
                    <input type="hidden" name="email" value={d.email} />
                    <button className="group flex w-full items-center gap-2 rounded-xl border border-zinc-200 px-2.5 py-2 text-left transition hover:border-transparent hover:bg-subtle hover:shadow-sm">
                      <span className="accent-soft accent-text flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
                        <Icon size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium leading-tight">
                          {d.label}
                        </span>
                        <span className="block truncate text-[10px] leading-tight text-muted">
                          {d.hint}
                        </span>
                      </span>
                    </button>
                  </form>
                );
              })}
            </div>

            <div className="mt-3 text-center text-[11px] text-muted">
              Пароль у всех: <code className="font-medium">{DEMO_PASSWORD}</code> · на проде блок скрыт
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
