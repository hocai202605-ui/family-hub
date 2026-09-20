import { FamilyEventsDashboard } from "../../components/family-events-dashboard";
import { requirePageAccess } from "@/lib/auth";

export default async function FamilyEventsPage() {
  await requirePageAccess("calendar.events");
  return <FamilyEventsDashboard />;
}
