import { requirePageAccess } from "@/lib/auth";
import { GoalsDashboard } from "../components/goals-dashboard";

export default async function GoalsPage() {
  await requirePageAccess("goals");
  return <GoalsDashboard />;
}
