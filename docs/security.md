# Security

## Authentication model

Custom session auth in `lib/auth.ts` (not NextAuth).

| Piece | Behavior |
|-------|----------|
| Password storage | PBKDF2-SHA512, 210000 iterations, random salt, format `pbkdf2$iter$salt$hash` |
| Compare | `crypto.timingSafeEqual` via length-checked buffers |
| Session token | `base64url(JSON payload).hmac_sha256` with secret |
| Cookie name | `family_session` (`SESSION_COOKIE`) |
| Cookie flags | `httpOnly`, `sameSite: "lax"`, `path: "/"`, `secure` when `NODE_ENV === "production"`, maxAge 7 days |
| Secret source | `AUTH_SECRET` or `NEXTAUTH_SECRET`, with a **dev-only default** fallback string |

**Production requirement:** set a strong `AUTH_SECRET`. Do not ship the default fallback.

## Authorization model

| Helper | Use |
|--------|-----|
| `getCurrentUser()` | Server components / layouts (cookies()) |
| `getCurrentUserFromRequest(request)` | Route handlers |
| `canAccessMenu(user, menuKey)` | ADMIN → true; USER → menu permission list |
| `requirePageAccess(menuKey)` | Pages; missing user → `/login`; missing permission → currently `/login` (prefer `/forbidden` for UX fixes) |
| `requireApiAccess(request, menuKey?)` | APIs → 401 / 403 JSON |
| `requireAnyApiAccess(request, menuKeys)` | Any of listed keys or ADMIN |
| `requireAdminApiAccess(request)` | Role must be `ADMIN` |

Inactive users (`isActive: false`) fail session resolution.

## Middleware vs real gates

`middleware.ts` only checks that the session **cookie exists**, not signature validity. Real protection is:

1. Dashboard layout + `requirePageAccess`
2. Per-route API `require*` helpers

When adding routes:

- Include new page paths in `middleware.config.matcher`
- Always still call `requirePageAccess` / API auth helpers

`/api/*` is **not** covered by middleware matcher; each handler must self-protect.

## Admin surface

- `/admin/users` and `/api/admin/users/**` are admin-only
- Admin can set password, toggle active, assign `menuKey`s
- Do not allow non-admin to escalate role or edit other users

## Known gaps (do not regress; fix carefully)

1. **Default session secret** if env missing — force-fail in production when improving.
2. **Middleware does not verify HMAC** — cookie presence only.
3. **No login rate limiting** — brute force risk if exposed publicly.
4. **No CSRF token** — mitigated partly by `SameSite=lax`; be careful with cookie-based state-changing APIs.
5. **No session store / revocation** — changing secret invalidates all sessions; no per-session logout list beyond cookie clear.
6. **Permission denied on pages redirects to `/login`** instead of `/forbidden`.
7. **Shared household data** — any user with expense permission sees all expenses (by design for single family).

## Agent rules when touching security

- Never weaken `require*` checks to “make it work”
- Never log `password`, `passwordHash`, or raw session tokens
- Prefer extending `lib/auth.ts` helpers over ad-hoc cookie parsing in routes
- Keep Zod validation on login and mutating endpoints
- When changing auth, update this doc and `.grok/rules/10-auth-security.md`
