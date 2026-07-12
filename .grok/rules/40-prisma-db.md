# Prisma / database rules

Source: `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.js`, `lib/prisma.ts`.

## Client

- Import `prisma` only from `@/lib/prisma` (singleton; avoids hot-reload connection explosion in dev).

## Schema changes

1. Edit `prisma/schema.prisma`.
2. Create a **new** migration via `npm run prisma:migrate` (or `prisma migrate dev`) — do **not** rewrite old migration SQL that may already be applied.
3. Keep indexes that support list filters (`date`, `category` on expenses/incomes).

## Domain constraints agents must respect

- `Expense.category` / `Income.category` are strings, not FK relations. Validate against `Category` in API code.
- Expense/income `amount` is `Int` (VND whole units). Investment prices/qty use `Float`.
- `FamilyMember` enum is fixed to CK/VK/CON unless a migration deliberately expands it.
- No multi-tenant `familyId` — all rows are household-global.

## Seed

- Admin user created only when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set.
- Sample expenses/incomes inserted only if tables are empty.
- Categories upserted by id.

## Safety

- Never point migrate/seed at production without explicit user instruction.
- Do not delete migration history to “fix” schema drift; diagnose first.
