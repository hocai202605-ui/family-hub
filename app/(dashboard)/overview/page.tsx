import { requirePageAccess } from "@/lib/auth";
import { ExpenseDashboard } from "../components/expense-dashboard";

export default async function OverviewPage() {
  const user = await requirePageAccess("overview");
  return (
    <ExpenseDashboard
      canManageCategories={user.role === "ADMIN"}
    />
  );
}
