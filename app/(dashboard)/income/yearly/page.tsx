import { YearlyIncomeDashboard } from "../../components/yearly-income-dashboard";
import { requirePageAccess } from "@/lib/auth";

export default async function YearlyIncomeReportPage() {
  await requirePageAccess("income.yearly");
  return <YearlyIncomeDashboard />;
}
