import { InvestmentDashboard } from "../components/investment-dashboard";
import { requirePageAccess } from "@/lib/auth";

export const metadata = {
  title: "Đầu tư | Family Dashboard",
};

export default async function InvestmentsPage() {
  await requirePageAccess("investments");
  return <InvestmentDashboard />;
}
