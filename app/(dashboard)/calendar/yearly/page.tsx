import { YearlyCalendarDashboard } from "../../components/yearly-calendar-dashboard";
import { requirePageAccess } from "@/lib/auth";
import { defaultMemberForAccount } from "@/lib/default-member";

export default async function YearlyCalendarReportPage() {
  const user = await requirePageAccess("calendar.yearly");
  const defaultMember = defaultMemberForAccount(
    { email: user.email, name: user.name, role: user.role },
    "CK",
  );

  return <YearlyCalendarDashboard defaultMember={defaultMember} />;
}
