# Architecture

## Purpose

Family Hub is a single-household web app for finance (expenses, income, investments) and lifestyle modules (calendar / daily habits, goals, health, parenting), with role-based menu access for family members.

## High-level layout

```
Browser
  → middleware.ts          # cookie presence gate for page routes
  → app/login              # unauthenticated login UI
  → app/(dashboard)/*      # authenticated shell + modules
  → app/api/*              # REST handlers (auth checked per route)
  → lib/*                  # auth, menu, prisma
  → PostgreSQL (Prisma)
```

## Directory map

| Path | Role |
|------|------|
| `app/layout.tsx` | Root HTML, fonts, `lang="vi"` |
| `app/login/` | Login page + client form |
| `app/forbidden/` | Forbidden page (prefer over silent login redirect for permission denials when improving UX) |
| `app/(dashboard)/layout.tsx` | Loads user, filters nav, wraps `DashboardShell` |
| `app/(dashboard)/page.tsx` | Welcome home inside shell |
| `app/(dashboard)/overview/` | Overview (currently reuses expense dashboard) |
| `app/(dashboard)/expenses/` | Monthly expenses + `yearly/` |
| `app/(dashboard)/income/` | Monthly income + `yearly/` |
| `app/(dashboard)/investments/` | Investments UI |
| `app/(dashboard)/admin/users/` | User management (admin) |
| `app/(dashboard)/calendar/` | Daily habits + weekly log (mock data via `PersonalGrowthDashboard`) |
| `app/(dashboard)/goals|health|parenting/` | Coming-soon placeholders |
| `app/(dashboard)/components/` | Large client dashboards + shell + icons |
| `app/api/auth/` | `login`, `logout`, `me` |
| `app/api/expenses|incomes|investments|categories/` | CRUD + list filters |
| `app/api/admin/users/` | Admin user CRUD, password, menu permissions |
| `app/api/market/gold/` | Proxy gold prices (requires investments access) |
| `lib/auth.ts` | PBKDF2 passwords, HMAC session cookie, require* helpers |
| `lib/menu.ts` | Nav tree, `MenuKey`, permission filter |
| `lib/prisma.ts` | Prisma singleton |
| `prisma/schema.prisma` | Models + enums |
| `prisma/seed.js` | Admin from env + categories + sample rows |
| `middleware.ts` | Redirect to `/login` if no session cookie on matched paths |

## Request flows

### Page (SSR)

1. Middleware: if path matched and no `family_session` cookie → redirect `/login?next=…`
2. `(dashboard)/layout.tsx`: `getCurrentUser()` verifies token + loads user + permissions; inactive/missing → `/login`
3. Page: `requirePageAccess(menuKey)` enforces menu RBAC
4. Client components fetch `/api/*` for data

### API

1. Handler calls `requireApiAccess(request, menuKey)` (or admin/any variant)
2. Zod-parse body/query
3. Prisma read/write
4. JSON response (`force-dynamic` on most routes)

## Module status

| Module | Status |
|--------|--------|
| Auth + session | Done |
| Admin users + menu permissions | Done |
| Categories | Done |
| Expenses monthly/yearly UI + API | Done |
| Income monthly/yearly UI + API | Done |
| Investments + gold price proxy | Done |
| Overview as true family summary | Partial (reuses expenses UI) |
| Calendar (habits + daily log) | UI mock on `/calendar` (`data/mockGrowth.json`), no API yet |
| Goals / health / parenting | Scaffold only (`ComingSoonModule`) |

## Design notes for agents

- This is **one shared household dataset**, not multi-tenant SaaS. All authorized users with a menu key see the same financial rows.
- Prefer extending existing `*-utils.ts` + dashboard patterns over introducing new layers (`services/`, `repositories/`) unless the user asks for a refactor.
- UI is largely client-side dashboards under `app/(dashboard)/components/`; pages stay thin server wrappers.
