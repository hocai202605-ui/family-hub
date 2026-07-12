import { requirePageAccess } from "@/lib/auth";
import { defaultMemberForAccount } from "@/lib/default-member";
import { ExpenseDashboard } from "../components/expense-dashboard";

export default async function OverviewPage() {
  const user = await requirePageAccess("overview");
  return (
    <ExpenseDashboard
      canManageCategories={user.role === "ADMIN"}
      defaultMember={defaultMemberForAccount({ email: user.email, role: user.role }, "VK")}
    />
  );
}
