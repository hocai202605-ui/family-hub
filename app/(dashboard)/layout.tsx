import { ReactNode } from "react";
import { DashboardShell } from "./components/dashboard-shell";
import { getCurrentUser } from "@/lib/auth";
import { filterNavItems } from "@/lib/menu";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const navItems = filterNavItems(user.role, user.permissions);

  return (
    <DashboardShell
      navItems={navItems}
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
      }}
    >
      {children}
    </DashboardShell>
  );
}
