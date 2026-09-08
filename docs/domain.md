# Domain model

## Actors

| Concept | Meaning |
|---------|---------|
| `User` | Login account (`ADMIN` or `USER`), with optional `MenuPermission` rows |
| `FamilyMember` on transactions | Who the money belongs to / spent by: `CK` (chồng), `VK` (vợ), `CON` (con), `GIA_DINH` (gia đình/shared household) — not the same as `User` |

Transactions are **not** scoped per `User` id; they are household-wide and tagged with `FamilyMember`.

## Enums (Prisma)

**CategoryType:** `INCOME` | `EXPENSE`

**AssetType:** `GOLD` | `STOCK` | `SAVING` | `REAL_ESTATE` | `CRYPTO` | `DEBT` | `LOAN` | `OTHER` | `FUND_DCDS` | `FUND_ETF_VN30` | `DEBT_INTEREST`

**FamilyMember:** `CK` | `VK` | `CON` | `GIA_DINH`

**Role:** `ADMIN` | `USER`

## Core entities

### Category

- `id` (string primary key, e.g. `Food`, `Salary`)
- `label`, `icon`, `badge`, `chart` (UI metadata)
- `type` (`INCOME` | `EXPENSE`)
- Unique on `[label, type]`

### Expense / Income

- `amount` — integer VND
- `category` — **string** category id (not a Prisma relation/FK)
- `member` — `FamilyMember`
- `note` — required non-empty string in Zod schemas
- `date` — `@db.Date`, stored from `YYYY-MM-DD` via UTC midnight helpers

### Investment

- `name`, `type` (`AssetType`)
- `quantity`, `purchasePrice`, `currentPrice` (floats; `currentPrice` may be `0` when unknown)
- Optional `interestRate`, `term`, `note`
- `member`, `date`
- Fund types: `FUND_DCDS` (CCQ CP DCDS, daily NAV), `FUND_ETF_VN30` (E1VFVN30 last price)
- `DEBT_INTEREST` (Trả nợ lãi vay) is not included in net assets or PnL

### Travel (household-wide, menuKey `travel.overview`)

- 34 tỉnh/thành is a **static catalog** (`lib/travel/provinces.ts`, GSO codes) — not a DB table
- `TravelProvinceVisit` — one optional check-in per `provinceCode` (`visitedOn` + `note`)
- `TravelDestination` — flag on the SVG map (`name`, `svgX`/`svgY`, `visitedOn`, `note`)
- A province is “visited” if it has a visit row **or** at least one destination flag
- No `FamilyMember` / user scoping — same shared household model as expenses

### MenuPermission

- Per-user grant of a `menuKey` string
- Unique `[userId, menuKey]`
- Admins ignore this list and see all nav items

## Menu keys

Defined in `lib/menu.ts` as `MenuKey`:

| menuKey | Route |
|---------|--------|
| `overview` | `/overview` |
| `expenses.monthly` | `/expenses` |
| `expenses.yearly` | `/expenses/yearly` |
| `income.monthly` | `/income` |
| `income.yearly` | `/income/yearly` |
| `investments` | `/investments` |
| `calendar` | `/calendar` (thói quen + nhật ký ngày; mock) |
| `goals` | `/goals` |
| `health` | `/health` |
| `parenting` | `/parenting` |
| `travel.overview` | `/travel` (bản đồ 34 tỉnh + cắm cờ) |
| `travel.details` | `/travel/details` (Coming Soon) |
| `admin.users` | `/admin/users` (adminOnly) |

API access should use the same keys (e.g. expenses list → `expenses.monthly`; note yearly income uses `income.yearly` when querying by year — expenses yearly API currently uses monthly key; fix carefully if changing).

## Money & dates

- Display: `Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })`
- Vietnamese amount wording: `app/utils/read-money.ts` / package `read-vietnamese-number` (some dashboards still inline their own helpers)
- API date strings: `^\d{4}-\d{2}-\d{2}$`
- Month filter: `YYYY-MM`; year filter: `YYYY`
- Range helpers live in `app/api/expenses/expense-utils.ts` (and mirrors for income/investment)

## Seed behavior

`prisma/seed.js`:

- Creates/updates admin if `ADMIN_EMAIL` + `ADMIN_PASSWORD` set
- Upserts default categories
- Inserts sample expenses/incomes only when those tables are empty
