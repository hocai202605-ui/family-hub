<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Family Dashboard — Agent Rules

Family Hub: personal/family finance + lifestyle dashboard.

**Stack:** Next.js 13.5 App Router · React 18 · TypeScript · Prisma 5 · PostgreSQL · Tailwind 3 · Zod · custom HMAC session auth (not NextAuth).

## Where things live

| Area | Path |
|------|------|
| Dashboard UI (pages + shell) | `app/(dashboard)/` |
| Client feature UIs | `app/(dashboard)/components/` |
| REST API routes | `app/api/` |
| Auth / session / RBAC helpers | `lib/auth.ts` |
| Nav + menu keys + filter | `lib/menu.ts` |
| Prisma client singleton | `lib/prisma.ts` |
| Schema + migrations + seed | `prisma/` |
| Middleware (cookie gate) | `middleware.ts` |
| Deeper docs | `docs/` |
| Modular agent rules | `.grok/rules/` |
| Skills & slash commands | `.agents/` |

## Hard rules

1. **API routes** must call `requireApiAccess`, `requireAnyApiAccess`, or `requireAdminApiAccess` from `lib/auth.ts` before any DB work.
2. **Dashboard pages** must call `requirePageAccess(menuKey)` (or admin equivalent via menu key `admin.users`).
3. **New menu surface** → update `MenuKey` + `navItems` in `lib/menu.ts`, and `middleware.ts` `matcher` if the path is new.
4. **Never commit secrets.** Do not log passwords or password hashes. Prefer `AUTH_SECRET` from env (no hard-coded production secrets).
5. **Money:** amounts are VND integers (`Int` in Prisma for expenses/incomes). Dates are `YYYY-MM-DD`; persist with existing UTC midnight helpers in `*-utils.ts`.
6. **Validate** request bodies with Zod schemas colocated in API `*-utils.ts` (see expenses/incomes/investments).
7. **Do not invent Next 14/15-only APIs** without checking installed Next docs under `node_modules/next/dist/docs/`.
8. Prefer extending existing patterns over new frameworks. Do not add AI product features unless asked.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
```

## Before coding

- Read the matching file under `.grok/rules/` for the area you touch.
- For architecture / domain / security context, open `docs/`.
- For repeatable workflows, use skills under `.agents/skills/`.
