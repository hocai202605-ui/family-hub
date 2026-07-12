# UI / dashboard conventions

## Structure

- Route pages under `app/(dashboard)/<module>/page.tsx` are **server components**: call `requirePageAccess`, then render a client dashboard or `ComingSoonModule`.
- Shared chrome: `app/(dashboard)/layout.tsx` → `DashboardShell` with filtered `navItems` and user chip.
- Feature UIs live in `app/(dashboard)/components/*-dashboard.tsx` (large client components).
- Icons: `app/(dashboard)/components/icons.tsx` (`Icon` + `IconName`).
- Placeholder modules: `ComingSoonModule` with title/ideas — used by calendar, goals, health, parenting.

## Patterns to match

- VND via `Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 })`.
- Family members labels: CK/VK/CON with existing badge color patterns.
- Tailwind cards: `rounded-lg border … bg-white shadow-sm`; primary accents amber/slate/emerald already used.
- Client data: `fetch("/api/…")` with credentials (same-origin cookies). Handle loading/error states like existing dashboards.

## When adding UI

- Prefer extending an existing dashboard or extracting small shared helpers only if duplication is severe **and** the user asked for cleanup.
- Do not introduce a new component library (MUI, shadcn bulk install, etc.) unless requested.
- New nav items: update `lib/menu.ts` (`MenuKey`, `navItems`) and middleware matcher for new top-level paths.
- Vietnamese copy: prefer diacritics for user-visible strings when adding new text (existing nav labels may still be ASCII).

## Overview caveat

`/overview` currently reuses `ExpenseDashboard`. If building a real overview, aggregate income/expense/investment summaries rather than mounting the full expense editor unless intentional.
