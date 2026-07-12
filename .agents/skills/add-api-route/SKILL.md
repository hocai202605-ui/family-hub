---
name: add-api-route
description: Add a new authenticated Next.js App Router API route following Family Dashboard patterns (Zod, Prisma, menu RBAC). Use when creating or extending REST endpoints under app/api.
---

# Add API route

## Steps

1. Choose path under `app/api/<resource>/` (and `[id]/ if needed). Mirror existing resources (`expenses`, `incomes`, `investments`, `categories`, `admin/users`).
2. Colocate Zod schema + mappers in `<resource>-utils.ts` when non-trivial (see `app/api/expenses/expense-utils.ts`).
3. In `route.ts`:
   - `export const dynamic = "force-dynamic";`
   - Auth first via `requireApiAccess` / `requireAnyApiAccess` / `requireAdminApiAccess` from `lib/auth.ts`
   - Validate body/query with Zod `safeParse`
   - Use `prisma` from `@/lib/prisma`
   - Return consistent JSON + HTTP status codes
4. Pick the correct `MenuKey` from `lib/menu.ts`. Admin-only → `requireAdminApiAccess`.
5. If category-backed money rows, verify category exists and `type` matches.
6. Do not add unauthenticated open proxies to external APIs.

## Checklist

- [ ] Auth guard present on every export (`GET`/`POST`/`PUT`/`PATCH`/`DELETE`)
- [ ] Zod validation for writes
- [ ] No secrets logged
- [ ] Dates use existing `dateFromInput` / range helpers pattern
- [ ] Client dashboard (if any) points at the new path

## References

- `docs/architecture.md`, `.grok/rules/20-api-conventions.md`, `.grok/rules/10-auth-security.md`
