"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import type { NavItem } from "@/lib/menu";
import { Icon } from "./icons";

type ShellUser = {
  name: string;
  email: string;
  role: "ADMIN" | "USER";
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function isChildActive(pathname: string, href: string) {
  return pathname === href;
}

function hasActiveChild(pathname: string, item: NavItem) {
  return Boolean(item.children?.some((child) => isChildActive(pathname, child.href) || isActive(pathname, child.href)));
}

function SidebarContent({ navItems, onNavigate, user }: { navItems: NavItem[]; onNavigate?: () => void; user: ShellUser }) {
  const pathname = usePathname();

  const autoExpanded = useMemo(() => {
    const keys = new Set<string>();
    for (const item of navItems) {
      if (item.children?.length && (hasActiveChild(pathname, item) || isActive(pathname, item.href))) {
        keys.add(item.menuKey);
      }
    }
    return keys;
  }, [navItems, pathname]);

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set(autoExpanded));

  useEffect(() => {
    setExpandedKeys((current) => {
      const next = new Set(current);
      for (const key of autoExpanded) next.add(key);
      return next;
    });
  }, [autoExpanded]);

  function toggleExpanded(menuKey: string) {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(menuKey)) next.delete(menuKey);
      else next.add(menuKey);
      return next;
    });
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-amber-100 px-5 py-5">
        <Link className="flex items-center gap-3" href="/expenses" onClick={onNavigate}>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-amber-100 text-amber-700">
            <Icon name="sparkles" />
          </span>
          <span>
            <span className="block text-base font-bold text-slate-950">Family Hub</span>
            <span className="block text-xs font-medium text-slate-500">Quan ly gia dinh</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const hasChildren = Boolean(item.children && item.children.length > 0);
          const childActive = hasActiveChild(pathname, item);
          const active = isActive(pathname, item.href) || childActive;
          const expanded = hasChildren && expandedKeys.has(item.menuKey);

          return (
            <div className="space-y-1" key={item.menuKey}>
              <div
                className={cn(
                  "group flex items-center gap-1 rounded-lg text-sm transition",
                  active
                    ? "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                )}
              >
                <Link
                  className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3"
                  href={item.href}
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
                </Link>

                {hasChildren ? (
                  <button
                    aria-expanded={expanded}
                    aria-label={expanded ? `Thu gọn ${item.label}` : `Mở ${item.label}`}
                    className="mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-500 transition hover:bg-white/80 hover:text-slate-900"
                    onClick={() => toggleExpanded(item.menuKey)}
                    type="button"
                  >
                    <Icon
                      className={cn("h-4 w-4 transition-transform", expanded ? "rotate-90" : "rotate-0")}
                      name="chevronRight"
                    />
                  </button>
                ) : active ? (
                  <Icon className="mr-3 h-4 w-4 shrink-0" name="chevronRight" />
                ) : null}
              </div>

              {hasChildren && expanded ? (
                <div className="ml-6 space-y-1 border-l border-amber-100 pl-3">
                  {item.children!.map((child) => {
                    const childIsActive = isChildActive(pathname, child.href);

                    return (
                      <Link
                        className={cn(
                          "group flex items-center gap-2 rounded-md px-3 py-2 text-xs transition",
                          childIsActive
                            ? "bg-amber-100 text-amber-900"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-950",
                        )}
                        href={child.href}
                        key={child.menuKey}
                        onClick={onNavigate}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" name={child.icon} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{child.label}</span>
                          <span className="block truncate text-[11px]">{child.description}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-amber-100 p-4">
        <div className="rounded-lg bg-[#fff7e8] p-4">
          <p className="truncate text-sm font-bold text-slate-950">{user.name}</p>
          <p className="mt-1 truncate text-xs text-slate-600">{user.email}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="rounded-md bg-white px-2 py-1 text-[11px] font-bold uppercase text-amber-700 ring-1 ring-amber-100">
              {user.role}
            </span>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border border-amber-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:text-slate-950"
              onClick={handleLogout}
              type="button"
            >
              <Icon className="h-3.5 w-3.5" name="logOut" />
              Dang xuat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({ children, navItems, user }: { children: ReactNode; navItems: NavItem[]; user: ShellUser }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fffaf3] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-amber-100 bg-white shadow-sm lg:block">
        <SidebarContent navItems={navItems} user={user} />
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-amber-100 bg-white/95 px-4 shadow-sm backdrop-blur lg:hidden">
          <Link className="flex items-center gap-3" href="/expenses">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-amber-100 text-amber-700">
              <Icon className="h-4 w-4" name="sparkles" />
            </span>
            <span className="text-sm font-bold text-slate-950">Family Hub</span>
          </Link>
          <button
            aria-label="Mo menu"
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
            aria-label="Dong menu"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <aside className="relative h-full w-[min(88vw,320px)] border-r border-amber-100 bg-white shadow-xl">
            <button
              aria-label="Dong menu"
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-700"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <Icon className="h-4 w-4" name="x" />
            </button>
            <SidebarContent navItems={navItems} onNavigate={() => setIsOpen(false)} user={user} />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
