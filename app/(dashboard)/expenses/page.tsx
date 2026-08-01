import { ExpenseDashboard } from "../components/expense-dashboard";
import { requirePageAccess } from "@/lib/auth";

export default async function ExpensesPage() {
  const user = await requirePageAccess("expenses.monthly");
  return (
    <ExpenseDashboard
      canManageCategories={user.role === "ADMIN"}
    />
  );
}
