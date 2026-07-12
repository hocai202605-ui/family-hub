# Auth & security rules

Source of truth: `lib/auth.ts`, `docs/security.md`.

## Must do

- Server pages under the dashboard: `await requirePageAccess("<menuKey>")`.
- API route handlers: `requireApiAccess(request, menuKey)`, `requireAnyApiAccess`, or `requireAdminApiAccess` **before** Prisma or external calls.
- Cookie name: `family_session` (`SESSION_COOKIE`). Do not invent a second session cookie.
- Passwords: only via `hashPassword` / `verifyPassword`. Never store plaintext.
- Production: rely on `AUTH_SECRET` (or `NEXTAUTH_SECRET`). Do not introduce new hard-coded secrets.

## Must not

- Skip auth “temporarily” on new routes.
- Log passwords, hashes, or full session tokens.
- Treat middleware as sufficient auth — it only checks cookie presence.
- Grant `ADMIN` or menu permissions from non-admin APIs.

## Permission keys

Use `MenuKey` values from `lib/menu.ts`. New screens need a key + nav entry + matcher path when applicable.

## UX note

`requirePageAccess` currently redirects denied users to `/login`. Prefer `/forbidden` only if changing deliberately and updating callers/docs.
