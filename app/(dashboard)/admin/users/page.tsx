import { requirePageAccess } from "@/lib/auth";
import { UserManagement } from "../../components/user-management";

export default async function AdminUsersPage() {
  await requirePageAccess("admin.users");
  return <UserManagement />;
}
