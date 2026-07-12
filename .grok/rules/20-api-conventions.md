# API conventions

Pattern reference: `app/api/expenses/route.ts`, `app/api/expenses/expense-utils.ts`.

## Route handler checklist

1. `export const dynamic = "force-dynamic";` on data routes that must not be statically cached incorrectly.
2. Auth first: `const auth = await requireApiAccess(request, "…"); if ("response" in auth) return auth.response;`
3. Parse query/body; validate with **Zod** (`safeParse`).
4. Return JSON errors with appropriate status: `400` invalid input, `401` unauthenticated, `403` forbidden, `404` missing, `201` create.
5. Map Prisma rows through a `to*Response` helper when the client expects formatted dates/fields.

## Utils colocated with resource

Keep schemas and date helpers next to the resource:

- `app/api/expenses/expense-utils.ts`
- `app/api/incomes/income-utils.ts`
- `app/api/investments/investment-utils.ts`

Reuse date range helpers (`monthRange`, `yearRange`, `dateFromInput`) rather than inventing new timezone logic.

## Categories

When creating expense/income, verify category exists and `type` matches (`EXPENSE` / `INCOME`) — see expenses POST.

## Admin APIs

Under `app/api/admin/users/**` always use `requireAdminApiAccess`.

## External fetch

Proxy third-party data through authenticated app routes (e.g. `app/api/market/gold/route.ts`); do not expose unauthenticated open proxies.
