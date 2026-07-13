-- Personal growth / daily calendar tables

CREATE TABLE "growth_habits" (
    "id" TEXT NOT NULL,
    "member" "FamilyMember" NOT NULL,
    "month" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'amber',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_habits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "growth_habit_checks" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "growth_habit_checks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "growth_plan_items" (
    "id" TEXT NOT NULL,
    "member" "FamilyMember" NOT NULL,
    "scope" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "weekStart" DATE,
    "text" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_plan_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "growth_daily_logs" (
    "id" TEXT NOT NULL,
    "member" "FamilyMember" NOT NULL,
    "date" DATE NOT NULL,
    "reflection" TEXT NOT NULL DEFAULT '',
    "top5Tasks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_daily_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "growth_tick_notes" (
    "id" TEXT NOT NULL,
    "dailyLogId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_tick_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "growth_calendar_events" (
    "id" TEXT NOT NULL,
    "member" "FamilyMember" NOT NULL,
    "date" DATE NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_calendar_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "growth_habits_member_month_idx" ON "growth_habits"("member", "month");

CREATE INDEX "growth_habit_checks_weekStart_idx" ON "growth_habit_checks"("weekStart");

CREATE UNIQUE INDEX "growth_habit_checks_habitId_weekStart_dayIndex_key" ON "growth_habit_checks"("habitId", "weekStart", "dayIndex");

CREATE INDEX "growth_plan_items_member_month_idx" ON "growth_plan_items"("member", "month");

CREATE INDEX "growth_plan_items_member_weekStart_idx" ON "growth_plan_items"("member", "weekStart");

CREATE UNIQUE INDEX "growth_daily_logs_member_date_key" ON "growth_daily_logs"("member", "date");

CREATE INDEX "growth_daily_logs_date_idx" ON "growth_daily_logs"("date");

CREATE INDEX "growth_tick_notes_dailyLogId_idx" ON "growth_tick_notes"("dailyLogId");

CREATE INDEX "growth_calendar_events_member_date_idx" ON "growth_calendar_events"("member", "date");

ALTER TABLE "growth_habit_checks" ADD CONSTRAINT "growth_habit_checks_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "growth_habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "growth_tick_notes" ADD CONSTRAINT "growth_tick_notes_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "growth_daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
