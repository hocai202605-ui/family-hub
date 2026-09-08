import { TravelOverviewDashboard } from "../components/travel-overview-dashboard";
import { requirePageAccess } from "@/lib/auth";

export default async function TravelPage() {
  await requirePageAccess("travel.overview");
  return <TravelOverviewDashboard />;
}
