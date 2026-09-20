import { YearlyInvestmentDashboard } from "../../components/yearly-investment-dashboard";
import { requirePageAccess } from "@/lib/auth";

export default async function YearlyInvestmentReportPage() {
  await requirePageAccess("investments.yearly");
  return <YearlyInvestmentDashboard />;
}
