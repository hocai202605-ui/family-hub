Help set up local development for Family Dashboard.

Steps to guide or run (with user approval for destructive DB ops):

1. Confirm Node `>=18.5` (`package.json` engines).
2. Ensure dependencies: `npm install` (runs `postinstall` → `prisma generate`).
3. Create `.env` from `.env.example` and fill:
   - `DATABASE_URL` (and `DIRECT_URL` if using pooled host like Neon)
   - `AUTH_SECRET` (long random string)
   - Optional seed admin: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`
4. Run migrations: `npm run prisma:migrate`
5. Seed: `npm run db:seed`
6. Start: `npm run dev` → http://localhost:3000
7. Smoke-check: login, open expenses, confirm API 401 when logged out

Do not commit `.env`. Do not use production credentials in local seed unless the user explicitly wants that.
