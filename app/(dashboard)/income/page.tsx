import { IncomeDashboard } from "../components/income-dashboard";
import { requirePageAccess } from "@/lib/auth";

export default async function IncomePage() {
  await requirePageAccess("income.monthly");
  return <IncomeDashboard />;
}
