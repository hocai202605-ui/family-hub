Review Family Dashboard security end-to-end.

Focus:

1. Session secret handling (`AUTH_SECRET` / fallback in `lib/auth.ts`)
2. Cookie flags and session token signing/verification
3. Middleware vs real auth gates (`middleware.ts` vs `require*` helpers)
4. Every `app/api/**` route for missing/wrong auth
5. Every dashboard page for `requirePageAccess`
6. Admin isolation (`requireAdminApiAccess`, role checks)
7. Login endpoint validation and brute-force exposure
8. Known gaps documented in `docs/security.md` — report status, do not silently weaken protections

Output a prioritized findings list with file paths and concrete fixes. Do not commit secrets or print `.env` contents.
