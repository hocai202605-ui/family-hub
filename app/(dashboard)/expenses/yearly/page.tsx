import { YearlyExpenseDashboard } from "../../components/yearly-expense-dashboard";
import { requirePageAccess } from "@/lib/auth";

export default async function YearlyExpenseReportPage() {
  await requirePageAccess("expenses.yearly");
  return (
    <YearlyExpenseDashboard />
  );
}
