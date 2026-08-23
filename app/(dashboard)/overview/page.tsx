import { requirePageAccess } from "@/lib/auth";
import { ExpenseDashboard } from "../components/expense-dashboard";
import { defaultMemberForAccount } from "@/lib/default-member";

export default async function OverviewPage() {
  const user = await requirePageAccess("overview");
  return (
    <ExpenseDashboard
      canManageCategories={user.role === "ADMIN"}
      defaultMember={defaultMemberForAccount({ email: user.email, name: user.name, role: user.role }, "VK")}
    />
  );
}
