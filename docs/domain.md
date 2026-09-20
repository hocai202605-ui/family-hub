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

### Six jars (chi tiêu năm)

Household-global `ExpenseJar` rows (`NEC` 55%, `LTSS` 10%, `EDU` 10%, `PLAY` 10%, `FFA` 10%, `GIVE` 5%) with a yearly `limitAmount` (VND). `ExpenseJarCategory` maps each expense category to **at most one** jar. Users assign categories and edit limits from the yearly report widget. Unassigned categories still appear in the donut, not in a jar. `LTSS` spent is **not** from expense categories: for the selected year it is `SAVING` principal − `DEBT` outstanding − `DEBT_INTEREST` payments (investment rows dated in that year). `FFA` spent is gold + fund certificates (`GOLD` + `FUND_DCDS` + `FUND_ETF_VN30`) market value for rows dated in that year.

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
| `investments` | `/investments` (danh mục tài sản) |
| `investments.yearly` | `/investments/yearly` (báo cáo năm: cơ cấu tháng + mục tiêu kiểu 6 lọ) |
| `calendar` | `/calendar` (lịch hằng ngày: thói quen + nhật ký + sự kiện tháng) |
| `calendar.yearly` | `/calendar/yearly` (báo cáo thói quen / nhật ký / kế hoạch theo năm) |
| `calendar.events` | `/calendar/events` (sự kiện gia đình, lịch 12 tháng) |
| `goals` | `/goals` |
| `health` | `/health` |
| `parenting` | `/parenting` |
| `travel.overview` | `/travel` (bản đồ 34 tỉnh + cắm cờ) |
| `travel.details` | `/travel/details` (Coming Soon) |
| `admin.users` | `/admin/users` (adminOnly) |

API access should use the same keys (e.g. monthly expenses list → `expenses.monthly`; `GET /api/expenses?year=` accepts `expenses.yearly` or `expenses.monthly`; `GET /api/incomes?year=` accepts `income.yearly`, `income.monthly`, `expenses.yearly`, or `investments.yearly` so yearly reports can show total income). `GET /api/investments?year=` accepts `investments.yearly` or `investments`. Yearly investment targets: `GET/PUT /api/investments/targets` (per year + `AssetType`; GOLD = chỉ, fund = CCQ, others = VND). Growth events/categories accept `calendar`, `calendar.yearly`, or `calendar.events`. Event categories live in `GrowthEventCategory` (not finance `Category`); existing events backfill to system category `other` (Khác).

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
