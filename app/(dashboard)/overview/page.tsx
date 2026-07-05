import { requirePageAccess } from "@/lib/auth";
import { ExpenseDashboard } from "../components/expense-dashboard";

export default async function OverviewPage() {
  await requirePageAccess("overview");
  return <ExpenseDashboard />;
}
