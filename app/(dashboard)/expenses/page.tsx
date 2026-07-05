import { ExpenseDashboard } from "../components/expense-dashboard";
import { requirePageAccess } from "@/lib/auth";

export default async function ExpensesPage() {
  await requirePageAccess("expenses.monthly");
  return <ExpenseDashboard />;
}
