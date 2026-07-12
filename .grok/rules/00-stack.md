# Stack conventions

- **Next.js 13.5.11** App Router + **React 18** + **TypeScript 5**.
- Do **not** assume Next.js 14/15 APIs, defaults, or file conventions. Before using unfamiliar Next APIs, read `node_modules/next/dist/docs/`.
- Styling: **Tailwind CSS 3** utility classes. Prefer existing amber/slate dashboard look.
- Data: **Prisma 5** + **PostgreSQL** (`DATABASE_URL`, optional `DIRECT_URL`).
- Validation: **Zod** on API inputs.
- Auth: custom helpers in `lib/auth.ts` (HMAC cookie session + PBKDF2). Not NextAuth/Auth.js unless the user requests a migration.
- Package manager scripts live in root `package.json` (`dev`, `build`, `lint`, `prisma:*`, `db:seed`).
- Dependencies `ai` / `@ai-sdk/openai` exist in package.json but are **unused** — do not wire AI product features unless asked.
