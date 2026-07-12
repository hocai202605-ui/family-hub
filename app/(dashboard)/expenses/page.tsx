import { ExpenseDashboard } from "../components/expense-dashboard";
import { requirePageAccess } from "@/lib/auth";
import { defaultMemberForAccount } from "@/lib/default-member";

export default async function ExpensesPage() {
  const user = await requirePageAccess("expenses.monthly");
  return (
    <ExpenseDashboard
      canManageCategories={user.role === "ADMIN"}
      defaultMember={defaultMemberForAccount({ email: user.email, role: user.role }, "VK")}
    />
  );
}
