import { UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/access";
import { PageHeader } from "@/components/ui";
import FormModal from "@/components/FormModal";
import UserForm from "@/components/UserForm";
import TeamTabs from "@/components/TeamTabs";
import { getShares } from "@/lib/finance";
import MembersTab from "./_tabs/MembersTab";
import PayrollTab from "./_tabs/PayrollTab";

export const dynamic = "force-dynamic";

/**
 * «Команда» и «Зарплаты» — раньше два разных пункта меню про одних и тех же
 * людей. Теперь одна страница с вкладками, как в «Финансах»: список
 * сотрудников и ведомость на выплату лежат рядом.
 */
export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; month?: string; error?: string }>;
}) {
  const me = await requireUser();
  // Раньше страница была доступна только супер-админу — но действия команды
  // (saveUser, impersonateUser) уже разрешены и админу через can.manageTeam,
  // так что и сама страница должна открываться ему, иначе кнопка «Войти как»
  // была бы недостижима.
  if (!can.manageTeam(me)) redirect("/no-access");

  const sp = await searchParams;
  const canSeePayroll = me.role === "SUPER_ADMIN";
  const tab = sp.tab === "payroll" && canSeePayroll ? "payroll" : "members";

  // Нужен только на вкладке «Сотрудники» (лимит проектов и кнопка добавления) — не тянем зря на «Зарплатах».
  const shares = tab === "members" ? await getShares() : null;

  return (
    <div>
      <PageHeader
        title="Команда"
        subtitle="Сотрудники, доступы и зарплаты — в одном разделе"
        right={
          tab === "members" && shares ? (
            <FormModal
              label="Добавить сотрудника"
              title="Новый сотрудник"
              icon={<UserPlus size={16} />}
              hint="Ставка по умолчанию применяется ко всем его проектам. Индивидуальную ставку под конкретного клиента задают в карточке клиента → «Команда проекта»."
            >
              <UserForm defaultLimit={shares.projectLimit} />
            </FormModal>
          ) : undefined
        }
      />

      <TeamTabs active={tab} showPayroll={canSeePayroll} />

      {tab === "members" && shares && <MembersTab me={me} projectLimit={shares.projectLimit} />}
      {tab === "payroll" && canSeePayroll && <PayrollTab sp={{ month: sp.month, error: sp.error }} />}
    </div>
  );
}
