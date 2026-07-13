import type { IconName } from "@/app/(dashboard)/components/icons";

export type MenuKey =
  | "overview"
  | "expenses.monthly"
  | "expenses.yearly"
  | "income.monthly"
  | "income.yearly"
  | "investments"
  | "calendar"
  | "goals"
  | "health"
  | "parenting"
  | "admin.users";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: IconName;
  menuKey: MenuKey;
  adminOnly?: boolean;
  children?: NavItem[];
};

export const navItems: NavItem[] = [
  { href: "/overview", label: "Tong quan", description: "Buc tranh gia dinh", icon: "home", menuKey: "overview" },
  {
    href: "/expenses",
    label: "Chi tieu",
    description: "Bao cao va giao dich",
    icon: "wallet",
    menuKey: "expenses.monthly",
    children: [
      { href: "/expenses/yearly", label: "Bao cao nam", description: "Bieu do theo nam", icon: "barChart", menuKey: "expenses.yearly" },
      { href: "/expenses", label: "Chi tieu thang", description: "Giao dich tung thang", icon: "wallet", menuKey: "expenses.monthly" },
    ],
  },
  {
    href: "/income",
    label: "Thu nhap",
    description: "Bao cao va giao dich",
    icon: "banknote",
    menuKey: "income.monthly",
    children: [
      { href: "/income/yearly", label: "Bao cao nam", description: "Bieu do theo nam", icon: "barChart", menuKey: "income.yearly" },
      { href: "/income", label: "Thu nhap thang", description: "Dong tien tung thang", icon: "banknote", menuKey: "income.monthly" },
    ],
  },
  { href: "/investments", label: "Dau tu", description: "Tai san va loi nhuan", icon: "barChart", menuKey: "investments" },
  {
    href: "/calendar",
    label: "Lịch hằng ngày",
    description: "Thói quen và nhật ký ngày",
    icon: "calendar",
    menuKey: "calendar",
  },
  { href: "/goals", label: "Muc tieu", description: "Ke hoach dai han", icon: "target", menuKey: "goals" },
  { href: "/health", label: "Suc khoe", description: "Thoi quen cham soc", icon: "heart", menuKey: "health" },
  { href: "/parenting", label: "Nuoi day con", description: "Hoc tap va ne nep", icon: "leaf", menuKey: "parenting" },
  { href: "/admin/users", label: "Nguoi dung", description: "Tai khoan va phan quyen", icon: "users", menuKey: "admin.users", adminOnly: true },
];

export const allMenuKeys = Array.from(
  new Set(navItems.flatMap((item) => [item.menuKey, ...(item.children?.map((child) => child.menuKey) ?? [])])),
);

export function filterNavItems(role: "ADMIN" | "USER", permissions: string[]) {
  if (role === "ADMIN") {
    return navItems;
  }

  const permissionSet = new Set(permissions);

  return navItems
    .filter((item) => !item.adminOnly)
    .map((item) => {
      const allowedChildren = item.children?.filter((child) => permissionSet.has(child.menuKey));
      const selfAllowed = permissionSet.has(item.menuKey);

      if (!selfAllowed && (!allowedChildren || allowedChildren.length === 0)) {
        return null;
      }

      if (!item.children) {
        return item;
      }

      const children = allowedChildren ?? [];
      const href = selfAllowed ? item.href : children[0]?.href ?? item.href;

      return {
        ...item,
        href,
        children,
      };
    })
    .filter((item): item is NavItem => item !== null);
}

export function menuKeyForPath(pathname: string): MenuKey | null {
  if (pathname === "/overview") return "overview";
  if (pathname === "/expenses") return "expenses.monthly";
  if (pathname === "/expenses/yearly") return "expenses.yearly";
  if (pathname === "/income") return "income.monthly";
  if (pathname === "/income/yearly") return "income.yearly";
  if (pathname === "/investments") return "investments";
  if (pathname === "/calendar") return "calendar";
  if (pathname === "/goals") return "goals";
  if (pathname === "/health") return "health";
  if (pathname === "/parenting") return "parenting";
  if (pathname === "/admin/users") return "admin.users";
  return null;
}
