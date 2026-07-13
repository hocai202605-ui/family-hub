-- Convert growth audit columns from Int FK → String username (User.name)
-- and add createdBy/updatedBy username to all domain tables.

-- Drop growth FK constraints to users (if present from prior design)
ALTER TABLE "growth_habits" DROP CONSTRAINT IF EXISTS "growth_habits_createdBy_fkey";
ALTER TABLE "growth_habits" DROP CONSTRAINT IF EXISTS "growth_habits_updatedBy_fkey";
ALTER TABLE "growth_habit_checks" DROP CONSTRAINT IF EXISTS "growth_habit_checks_createdBy_fkey";
ALTER TABLE "growth_habit_checks" DROP CONSTRAINT IF EXISTS "growth_habit_checks_updatedBy_fkey";
ALTER TABLE "growth_plan_items" DROP CONSTRAINT IF EXISTS "growth_plan_items_createdBy_fkey";
ALTER TABLE "growth_plan_items" DROP CONSTRAINT IF EXISTS "growth_plan_items_updatedBy_fkey";
ALTER TABLE "growth_daily_logs" DROP CONSTRAINT IF EXISTS "growth_daily_logs_createdBy_fkey";
ALTER TABLE "growth_daily_logs" DROP CONSTRAINT IF EXISTS "growth_daily_logs_updatedBy_fkey";
ALTER TABLE "growth_tick_notes" DROP CONSTRAINT IF EXISTS "growth_tick_notes_createdBy_fkey";
ALTER TABLE "growth_tick_notes" DROP CONSTRAINT IF EXISTS "growth_tick_notes_updatedBy_fkey";
ALTER TABLE "growth_calendar_events" DROP CONSTRAINT IF EXISTS "growth_calendar_events_createdBy_fkey";
ALTER TABLE "growth_calendar_events" DROP CONSTRAINT IF EXISTS "growth_calendar_events_updatedBy_fkey";

DROP INDEX IF EXISTS "growth_habits_createdBy_idx";
DROP INDEX IF EXISTS "growth_habits_updatedBy_idx";
DROP INDEX IF EXISTS "growth_habit_checks_createdBy_idx";
DROP INDEX IF EXISTS "growth_habit_checks_updatedBy_idx";
DROP INDEX IF EXISTS "growth_plan_items_createdBy_idx";
DROP INDEX IF EXISTS "growth_plan_items_updatedBy_idx";
DROP INDEX IF EXISTS "growth_daily_logs_createdBy_idx";
DROP INDEX IF EXISTS "growth_daily_logs_updatedBy_idx";
DROP INDEX IF EXISTS "growth_tick_notes_createdBy_idx";
DROP INDEX IF EXISTS "growth_tick_notes_updatedBy_idx";
DROP INDEX IF EXISTS "growth_calendar_events_createdBy_idx";
DROP INDEX IF EXISTS "growth_calendar_events_updatedBy_idx";

-- Re-type growth audit columns to TEXT (username)
ALTER TABLE "growth_habits" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "growth_habits" ALTER COLUMN "updatedBy" DROP NOT NULL;
ALTER TABLE "growth_habits" ALTER COLUMN "createdBy" TYPE TEXT USING (
  COALESCE((SELECT u."name" FROM "users" u WHERE u."id" = NULLIF("createdBy"::text, '')::int LIMIT 1), 'system')
);
ALTER TABLE "growth_habits" ALTER COLUMN "updatedBy" TYPE TEXT USING (
  COALESCE((SELECT u."name" FROM "users" u WHERE u."id" = NULLIF("updatedBy"::text, '')::int LIMIT 1), 'system')
);
UPDATE "growth_habits" SET "createdBy" = 'system' WHERE "createdBy" IS NULL OR "createdBy" = '';
UPDATE "growth_habits" SET "updatedBy" = 'system' WHERE "updatedBy" IS NULL OR "updatedBy" = '';
ALTER TABLE "growth_habits" ALTER COLUMN "createdBy" SET NOT NULL;
ALTER TABLE "growth_habits" ALTER COLUMN "updatedBy" SET NOT NULL;

ALTER TABLE "growth_habit_checks" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "growth_habit_checks" ALTER COLUMN "updatedBy" DROP NOT NULL;
ALTER TABLE "growth_habit_checks" ALTER COLUMN "createdBy" TYPE TEXT USING (
  COALESCE((SELECT u."name" FROM "users" u WHERE u."id" = NULLIF("createdBy"::text, '')::int LIMIT 1), 'system')
);
ALTER TABLE "growth_habit_checks" ALTER COLUMN "updatedBy" TYPE TEXT USING (
  COALESCE((SELECT u."name" FROM "users" u WHERE u."id" = NULLIF("updatedBy"::text, '')::int LIMIT 1), 'system')
);
UPDATE "growth_habit_checks" SET "createdBy" = 'system' WHERE "createdBy" IS NULL OR "createdBy" = '';
UPDATE "growth_habit_checks" SET "updatedBy" = 'system' WHERE "updatedBy" IS NULL OR "updatedBy" = '';
ALTER TABLE "growth_habit_checks" ALTER COLUMN "createdBy" SET NOT NULL;
ALTER TABLE "growth_habit_checks" ALTER COLUMN "updatedBy" SET NOT NULL;

ALTER TABLE "growth_plan_items" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "growth_plan_items" ALTER COLUMN "updatedBy" DROP NOT NULL;
ALTER TABLE "growth_plan_items" ALTER COLUMN "createdBy" TYPE TEXT USING (
  COALESCE((SELECT u."name" FROM "users" u WHERE u."id" = NULLIF("createdBy"::text, '')::int LIMIT 1), 'system')
);
ALTER TABLE "growth_plan_items" ALTER COLUMN "updatedBy" TYPE TEXT USING (
  COALESCE((SELECT u."name" FROM "users" u WHERE u."id" = NULLIF("updatedBy"::text, '')::int LIMIT 1), 'system')
);
UPDATE "growth_plan_items" SET "createdBy" = 'system' WHERE "createdBy" IS NULL OR "createdBy" = '';
UPDATE "growth_plan_items" SET "updatedBy" = 'system' WHERE "updatedBy" IS NULL OR "updatedBy" = '';
ALTER TABLE "growth_plan_items" ALTER COLUMN "createdBy" SET NOT NULL;
ALTER TABLE "growth_plan_items" ALTER COLUMN "updatedBy" SET NOT NULL;

ALTER TABLE "growth_daily_logs" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "growth_daily_logs" ALTER COLUMN "updatedBy" DROP NOT NULL;
ALTER TABLE "growth_daily_logs" ALTER COLUMN "createdBy" TYPE TEXT USING (
  COALESCE((SELECT u."name" FROM "users" u WHERE u."id" = NULLIF("createdBy"::text, '')::int LIMIT 1), 'system')
);
ALTER TABLE "growth_daily_logs" ALTER COLUMN "updatedBy" TYPE TEXT USING (
  COALESCE((SELECT u."name" FROM "users" u WHERE u."id" = NULLIF("updatedBy"::text, '')::int LIMIT 1), 'system')
);
UPDATE "growth_daily_logs" SET "createdBy" = 'system' WHERE "createdBy" IS NULL OR "createdBy" = '';
UPDATE "growth_daily_logs" SET "updatedBy" = 'system' WHERE "updatedBy" IS NULL OR "updatedBy" = '';
ALTER TABLE "growth_daily_logs" ALTER COLUMN "createdBy" SET NOT NULL;
ALTER TABLE "growth_daily_logs" ALTER COLUMN "updatedBy" SET NOT NULL;

ALTER TABLE "growth_tick_notes" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "growth_tick_notes" ALTER COLUMN "updatedBy" DROP NOT NULL;
ALTER TABLE "growth_tick_notes" ALTER COLUMN "createdBy" TYPE TEXT USING (
  COALESCE((SELECT u."name" FROM "users" u WHERE u."id" = NULLIF("createdBy"::text, '')::int LIMIT 1), 'system')
);
ALTER TABLE "growth_tick_notes" ALTER COLUMN "updatedBy" TYPE TEXT USING (
  COALESCE((SELECT u."name" FROM "users" u WHERE u."id" = NULLIF("updatedBy"::text, '')::int LIMIT 1), 'system')
);
UPDATE "growth_tick_notes" SET "createdBy" = 'system' WHERE "createdBy" IS NULL OR "createdBy" = '';
UPDATE "growth_tick_notes" SET "updatedBy" = 'system' WHERE "updatedBy" IS NULL OR "updatedBy" = '';
ALTER TABLE "growth_tick_notes" ALTER COLUMN "createdBy" SET NOT NULL;
ALTER TABLE "growth_tick_notes" ALTER COLUMN "updatedBy" SET NOT NULL;

ALTER TABLE "growth_calendar_events" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "growth_calendar_events" ALTER COLUMN "updatedBy" DROP NOT NULL;
ALTER TABLE "growth_calendar_events" ALTER COLUMN "createdBy" TYPE TEXT USING (
  COALESCE((SELECT u."name" FROM "users" u WHERE u."id" = NULLIF("createdBy"::text, '')::int LIMIT 1), 'system')
);
ALTER TABLE "growth_calendar_events" ALTER COLUMN "updatedBy" TYPE TEXT USING (
  COALESCE((SELECT u."name" FROM "users" u WHERE u."id" = NULLIF("updatedBy"::text, '')::int LIMIT 1), 'system')
);
UPDATE "growth_calendar_events" SET "createdBy" = 'system' WHERE "createdBy" IS NULL OR "createdBy" = '';
UPDATE "growth_calendar_events" SET "updatedBy" = 'system' WHERE "updatedBy" IS NULL OR "updatedBy" = '';
ALTER TABLE "growth_calendar_events" ALTER COLUMN "createdBy" SET NOT NULL;
ALTER TABLE "growth_calendar_events" ALTER COLUMN "updatedBy" SET NOT NULL;

-- Domain tables: add username audit columns
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updatedBy" TEXT;

ALTER TABLE "menu_permissions" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
ALTER TABLE "menu_permissions" ADD COLUMN IF NOT EXISTS "updatedBy" TEXT;
ALTER TABLE "menu_permissions" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "updatedBy" TEXT;

ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "updatedBy" TEXT;

ALTER TABLE "incomes" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
ALTER TABLE "incomes" ADD COLUMN IF NOT EXISTS "updatedBy" TEXT;

ALTER TABLE "investments" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
ALTER TABLE "investments" ADD COLUMN IF NOT EXISTS "updatedBy" TEXT;
