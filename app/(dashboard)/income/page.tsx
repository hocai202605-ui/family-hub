import { IncomeDashboard } from "../components/income-dashboard";
import { requirePageAccess } from "@/lib/auth";
import { defaultMemberForAccount } from "@/lib/default-member";

export default async function IncomePage() {
  const user = await requirePageAccess("income.monthly");
  return (
    <IncomeDashboard
      canManageCategories={user.role === "ADMIN"}
      defaultMember={defaultMemberForAccount({ email: user.email, name: user.name, role: user.role }, "CK")}
    />
  );
}
