"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { Icon, IconName } from "./icons";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: IconName;
};

const navItems: NavItem[] = [
  { href: "/", label: "Tổng quan", description: "Bức tranh gia đình", icon: "home" },
  { href: "/expenses", label: "Chi tiêu", description: "Giao dịch hằng ngày", icon: "wallet" },
  { href: "/income", label: "Thu nhập", description: "Nguồn tiền vào", icon: "banknote" },
  { href: "/investments", label: "Đầu tư", description: "Tài sản & lợi nhuận", icon: "barChart" },
  { href: "/calendar", label: "Lịch hằng ngày", description: "Việc nhà & lịch hẹn", icon: "calendar" },
  { href: "/goals", label: "Mục tiêu", description: "Kế hoạch dài hạn", icon: "target" },
  { href: "/health", label: "Sức khỏe", description: "Thói quen chăm sóc", icon: "heart" },
  { href: "/parenting", label: "Nuôi dạy con", description: "Học tập & nề nếp", icon: "leaf" },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-amber-100 px-5 py-5">
        <Link className="flex items-center gap-3" href="/" onClick={onNavigate}>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-amber-100 text-amber-700">
            <Icon name="sparkles" />
          </span>
          <span>
            <span className="block text-base font-bold text-slate-950">Family Hub</span>
            <span className="block text-xs font-medium text-slate-500">Quản lý gia đình</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition",
                active
                  ? "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
              )}
              href={item.href}
              key={item.href}
              onClick={onNavigate}
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-md",
                  active ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500 group-hover:text-slate-900",
                )}
              >
                <Icon className="h-4 w-4" name={item.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{item.label}</span>
                <span className="block truncate text-xs text-slate-500">{item.description}</span>
              </span>
              {active ? <Icon className="h-4 w-4 shrink-0" name="chevronRight" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-amber-100 p-4">
        <div className="rounded-lg bg-[#fff7e8] p-4">
          <p className="text-sm font-bold text-slate-950">Mở rộng dần</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Mỗi module có route riêng để sau này thêm dữ liệu, biểu đồ và CRUD mà không phá layout chính.
          </p>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fffaf3] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-amber-100 bg-white shadow-sm lg:block">
        <SidebarContent />
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-amber-100 bg-white/95 px-4 shadow-sm backdrop-blur lg:hidden">
          <Link className="flex items-center gap-3" href="/">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-amber-100 text-amber-700">
              <Icon className="h-4 w-4" name="sparkles" />
            </span>
            <span className="text-sm font-bold text-slate-950">Family Hub</span>
          </Link>
          <button
            aria-label="Mở menu"
            className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-700"
            onClick={() => setIsOpen(true)}
            type="button"
          >
            <Icon className="h-5 w-5" name="menu" />
          </button>
        </header>

        <main className="min-h-screen">{children}</main>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Đóng menu"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <aside className="relative h-full w-[min(88vw,320px)] border-r border-amber-100 bg-white shadow-xl">
            <button
              aria-label="Đóng menu"
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-700"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <Icon className="h-4 w-4" name="x" />
            </button>
            <SidebarContent onNavigate={() => setIsOpen(false)} />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
