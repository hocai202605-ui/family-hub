---
name: check-permissions
description: Audit page and API routes for correct auth and MenuKey RBAC coverage. Use when reviewing security, adding features, or the user asks to check permissions.
---

# Check permissions

## Procedure

1. List dashboard pages under `app/(dashboard)/**/page.tsx` and confirm each calls `requirePageAccess` with a key from `lib/menu.ts` (or is the shell home that only needs layout auth).
2. List `app/api/**/route.ts` handlers and confirm each mutating/read endpoint uses:
   - `requireApiAccess` / `requireAnyApiAccess` / `requireAdminApiAccess`, or
   - is intentionally public (only login should be public among sensitive routes).
3. Cross-check `menuKey` values against `MenuKey` union and `navItems`.
4. Confirm `middleware.ts` `matcher` includes all protected page paths (middleware is cookie-presence only — still required for UX gate).
5. Confirm admin UI + `/api/admin/**` cannot be reached as `USER`.
6. Note known gaps from `docs/security.md` (default secret, no rate limit, middleware not verifying HMAC) without “fixing” them unless asked.

## Report format

For each issue:

- File path
- Missing or wrong guard
- Suggested fix (helper + menuKey)
- Severity (high/medium/low)

## References

- `lib/auth.ts`, `lib/menu.ts`, `docs/security.md`, `.grok/rules/10-auth-security.md`
