import type { IconName } from "@/app/(dashboard)/components/icons";

export type MenuKey =
  | "overview"
  | "expenses.monthly"
  | "expenses.yearly"
  | "income.monthly"
  | "income.yearly"
  | "investments"
  | "investments.yearly"
  | "calendar"
  | "calendar.yearly"
  | "calendar.events"
  | "goals"
  | "health"
  | "parenting"
  | "travel.overview"
  | "travel.details"
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
  { href: "/overview", label: "Tổng quan", description: "Bức tranh gia đình", icon: "home", menuKey: "overview" },
  {
    href: "/expenses",
    label: "Chi tiêu",
    description: "Báo cáo và giao dịch",
    icon: "wallet",
    menuKey: "expenses.monthly",
    children: [
      { href: "/expenses/yearly", label: "Báo cáo năm", description: "Biểu đồ theo năm", icon: "barChart", menuKey: "expenses.yearly" },
      { href: "/expenses", label: "Chi tiêu tháng", description: "Giao dịch từng tháng", icon: "wallet", menuKey: "expenses.monthly" },
    ],
  },
  {
    href: "/income",
    label: "Thu nhập",
    description: "Báo cáo và giao dịch",
    icon: "banknote",
    menuKey: "income.monthly",
    children: [
      { href: "/income/yearly", label: "Báo cáo năm", description: "Biểu đồ theo năm", icon: "barChart", menuKey: "income.yearly" },
      { href: "/income", label: "Thu nhập tháng", description: "Dòng tiền từng tháng", icon: "banknote", menuKey: "income.monthly" },
    ],
  },
  {
    href: "/investments",
    label: "Đầu tư",
    description: "Danh mục và báo cáo năm",
    icon: "barChart",
    menuKey: "investments",
    children: [
      { href: "/investments/yearly", label: "Báo cáo năm", description: "Cơ cấu tháng và % thu nhập", icon: "barChart", menuKey: "investments.yearly" },
      { href: "/investments", label: "Danh mục tài sản", description: "Tài sản và lợi nhuận", icon: "wallet", menuKey: "investments" },
    ],
  },
  {
    href: "/calendar",
    label: "Lịch & Sự kiện",
    description: "Sự kiện, thói quen và nhật ký",
    icon: "calendar",
    menuKey: "calendar",
    children: [
      { href: "/calendar/events", label: "Sự kiện gia đình", description: "Lịch 12 tháng và danh mục sự kiện", icon: "flag", menuKey: "calendar.events" },
      { href: "/calendar/yearly", label: "Báo cáo năm", description: "Thói quen, nhật ký và kế hoạch", icon: "barChart", menuKey: "calendar.yearly" },
      { href: "/calendar", label: "Lịch hằng ngày", description: "Thói quen, nhật ký và lịch tháng", icon: "check", menuKey: "calendar" },
    ],
  },
  { href: "/goals", label: "Mục tiêu", description: "Kế hoạch dài hạn", icon: "target", menuKey: "goals" },
  { href: "/health", label: "Sức khỏe", description: "Thói quen chăm sóc", icon: "heart", menuKey: "health" },
  { href: "/parenting", label: "Nuôi dạy con", description: "Học tập và nề nếp", icon: "leaf", menuKey: "parenting" },
  {
    href: "/travel",
    label: "Du lịch",
    description: "Bản đồ và chuyến đi",
    icon: "plane",
    menuKey: "travel.overview",
    children: [
      { href: "/travel", label: "Bản đồ", description: "Tỉnh đã đi và cắm cờ", icon: "map", menuKey: "travel.overview" },
      { href: "/travel/details", label: "Chi tiết", description: "Chuyến đi và ngân sách", icon: "flag", menuKey: "travel.details" },
    ],
  },
  { href: "/admin/users", label: "Người dùng", description: "Tài khoản và phân quyền", icon: "users", menuKey: "admin.users", adminOnly: true },
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
  if (pathname === "/investments/yearly") return "investments.yearly";
  if (pathname === "/calendar") return "calendar";
  if (pathname === "/calendar/yearly") return "calendar.yearly";
  if (pathname === "/calendar/events") return "calendar.events";
  if (pathname === "/goals") return "goals";
  if (pathname === "/health") return "health";
  if (pathname === "/parenting") return "parenting";
  if (pathname === "/travel") return "travel.overview";
  if (pathname === "/travel/details") return "travel.details";
  if (pathname === "/admin/users") return "admin.users";
  return null;
}
