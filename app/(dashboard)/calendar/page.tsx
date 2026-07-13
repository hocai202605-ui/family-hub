import { PersonalGrowthDashboard } from "../components/personal-growth-dashboard";
import { requirePageAccess } from "@/lib/auth";
import { defaultMemberForAccount } from "@/lib/default-member";

export default async function CalendarPage() {
  const user = await requirePageAccess("calendar");
  const defaultMember = defaultMemberForAccount(
    { email: user.email, role: user.role },
    "CK",
  );

  return <PersonalGrowthDashboard defaultMember={defaultMember} />;
}
