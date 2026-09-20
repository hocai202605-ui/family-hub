-- CreateTable
CREATE TABLE "growth_event_categories" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_event_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "growth_event_categories_label_key" ON "growth_event_categories"("label");

-- Seed system categories before attaching events
INSERT INTO "growth_event_categories" ("id", "label", "color", "isSystem", "sortOrder", "createdBy", "updatedBy", "createdAt", "updatedAt")
VALUES
    ('wedding', 'Cưới / Hỉ', '#EF4444', true, 1, 'seed', 'seed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('memorial', 'Giỗ chạp / Lễ tết', '#8B5CF6', true, 2, 'seed', 'seed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('birthday', 'Sinh nhật / Kỷ niệm', '#F59E0B', true, 3, 'seed', 'seed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('maintenance', 'Bảo dưỡng định kỳ', '#3B82F6', true, 4, 'seed', 'seed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('other', 'Khác', '#6B7280', true, 5, 'seed', 'seed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "growth_calendar_events" ADD COLUMN "note" TEXT NOT NULL DEFAULT '';
ALTER TABLE "growth_calendar_events" ADD COLUMN "budgetAmount" INTEGER;
ALTER TABLE "growth_calendar_events" ADD COLUMN "categoryId" TEXT;

-- Backfill existing events to system category "Khác"
UPDATE "growth_calendar_events" SET "categoryId" = 'other' WHERE "categoryId" IS NULL;

ALTER TABLE "growth_calendar_events" ALTER COLUMN "categoryId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "growth_calendar_events_date_idx" ON "growth_calendar_events"("date");

-- CreateIndex
CREATE INDEX "growth_calendar_events_categoryId_idx" ON "growth_calendar_events"("categoryId");

-- AddForeignKey
ALTER TABLE "growth_calendar_events" ADD CONSTRAINT "growth_calendar_events_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "growth_event_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
