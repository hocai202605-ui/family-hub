-- Add created_by / updated_by audit columns linked to users

-- growth_habits
ALTER TABLE "growth_habits" ADD COLUMN "createdBy" INTEGER;
ALTER TABLE "growth_habits" ADD COLUMN "updatedBy" INTEGER;

-- Backfill from first admin/user if any rows exist (dev/mock data)
UPDATE "growth_habits"
SET
  "createdBy" = COALESCE((SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1), 1),
  "updatedBy" = COALESCE((SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1), 1)
WHERE "createdBy" IS NULL OR "updatedBy" IS NULL;

ALTER TABLE "growth_habits" ALTER COLUMN "createdBy" SET NOT NULL;
ALTER TABLE "growth_habits" ALTER COLUMN "updatedBy" SET NOT NULL;

CREATE INDEX "growth_habits_createdBy_idx" ON "growth_habits"("createdBy");
CREATE INDEX "growth_habits_updatedBy_idx" ON "growth_habits"("updatedBy");

ALTER TABLE "growth_habits" ADD CONSTRAINT "growth_habits_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "growth_habits" ADD CONSTRAINT "growth_habits_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- growth_habit_checks
ALTER TABLE "growth_habit_checks" ADD COLUMN "createdBy" INTEGER;
ALTER TABLE "growth_habit_checks" ADD COLUMN "updatedBy" INTEGER;
ALTER TABLE "growth_habit_checks" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "growth_habit_checks" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "growth_habit_checks"
SET
  "createdBy" = COALESCE((SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1), 1),
  "updatedBy" = COALESCE((SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1), 1)
WHERE "createdBy" IS NULL OR "updatedBy" IS NULL;

ALTER TABLE "growth_habit_checks" ALTER COLUMN "createdBy" SET NOT NULL;
ALTER TABLE "growth_habit_checks" ALTER COLUMN "updatedBy" SET NOT NULL;

CREATE INDEX "growth_habit_checks_createdBy_idx" ON "growth_habit_checks"("createdBy");
CREATE INDEX "growth_habit_checks_updatedBy_idx" ON "growth_habit_checks"("updatedBy");

ALTER TABLE "growth_habit_checks" ADD CONSTRAINT "growth_habit_checks_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "growth_habit_checks" ADD CONSTRAINT "growth_habit_checks_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- growth_plan_items
ALTER TABLE "growth_plan_items" ADD COLUMN "createdBy" INTEGER;
ALTER TABLE "growth_plan_items" ADD COLUMN "updatedBy" INTEGER;

UPDATE "growth_plan_items"
SET
  "createdBy" = COALESCE((SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1), 1),
  "updatedBy" = COALESCE((SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1), 1)
WHERE "createdBy" IS NULL OR "updatedBy" IS NULL;

ALTER TABLE "growth_plan_items" ALTER COLUMN "createdBy" SET NOT NULL;
ALTER TABLE "growth_plan_items" ALTER COLUMN "updatedBy" SET NOT NULL;

CREATE INDEX "growth_plan_items_createdBy_idx" ON "growth_plan_items"("createdBy");
CREATE INDEX "growth_plan_items_updatedBy_idx" ON "growth_plan_items"("updatedBy");

ALTER TABLE "growth_plan_items" ADD CONSTRAINT "growth_plan_items_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "growth_plan_items" ADD CONSTRAINT "growth_plan_items_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- growth_daily_logs
ALTER TABLE "growth_daily_logs" ADD COLUMN "createdBy" INTEGER;
ALTER TABLE "growth_daily_logs" ADD COLUMN "updatedBy" INTEGER;

UPDATE "growth_daily_logs"
SET
  "createdBy" = COALESCE((SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1), 1),
  "updatedBy" = COALESCE((SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1), 1)
WHERE "createdBy" IS NULL OR "updatedBy" IS NULL;

ALTER TABLE "growth_daily_logs" ALTER COLUMN "createdBy" SET NOT NULL;
ALTER TABLE "growth_daily_logs" ALTER COLUMN "updatedBy" SET NOT NULL;

CREATE INDEX "growth_daily_logs_createdBy_idx" ON "growth_daily_logs"("createdBy");
CREATE INDEX "growth_daily_logs_updatedBy_idx" ON "growth_daily_logs"("updatedBy");

ALTER TABLE "growth_daily_logs" ADD CONSTRAINT "growth_daily_logs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "growth_daily_logs" ADD CONSTRAINT "growth_daily_logs_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- growth_tick_notes
ALTER TABLE "growth_tick_notes" ADD COLUMN "createdBy" INTEGER;
ALTER TABLE "growth_tick_notes" ADD COLUMN "updatedBy" INTEGER;

UPDATE "growth_tick_notes"
SET
  "createdBy" = COALESCE((SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1), 1),
  "updatedBy" = COALESCE((SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1), 1)
WHERE "createdBy" IS NULL OR "updatedBy" IS NULL;

ALTER TABLE "growth_tick_notes" ALTER COLUMN "createdBy" SET NOT NULL;
ALTER TABLE "growth_tick_notes" ALTER COLUMN "updatedBy" SET NOT NULL;

CREATE INDEX "growth_tick_notes_createdBy_idx" ON "growth_tick_notes"("createdBy");
CREATE INDEX "growth_tick_notes_updatedBy_idx" ON "growth_tick_notes"("updatedBy");

ALTER TABLE "growth_tick_notes" ADD CONSTRAINT "growth_tick_notes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "growth_tick_notes" ADD CONSTRAINT "growth_tick_notes_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- growth_calendar_events
ALTER TABLE "growth_calendar_events" ADD COLUMN "createdBy" INTEGER;
ALTER TABLE "growth_calendar_events" ADD COLUMN "updatedBy" INTEGER;

UPDATE "growth_calendar_events"
SET
  "createdBy" = COALESCE((SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1), 1),
  "updatedBy" = COALESCE((SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1), 1)
WHERE "createdBy" IS NULL OR "updatedBy" IS NULL;

ALTER TABLE "growth_calendar_events" ALTER COLUMN "createdBy" SET NOT NULL;
ALTER TABLE "growth_calendar_events" ALTER COLUMN "updatedBy" SET NOT NULL;

CREATE INDEX "growth_calendar_events_createdBy_idx" ON "growth_calendar_events"("createdBy");
CREATE INDEX "growth_calendar_events_updatedBy_idx" ON "growth_calendar_events"("updatedBy");

ALTER TABLE "growth_calendar_events" ADD CONSTRAINT "growth_calendar_events_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "growth_calendar_events" ADD CONSTRAINT "growth_calendar_events_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
