-- Preserve time-of-day on expense transactions (date + hour + minute).
ALTER TABLE "expenses" ALTER COLUMN "date" TYPE TIMESTAMP(3)
USING ("date"::timestamp);

-- Ensure expense category "Khác" exists for the form dropdown.
INSERT INTO "categories" ("id", "label", "icon", "badge", "chart", "type", "createdAt", "updatedAt")
VALUES (
  'Others',
  'Khác',
  'banknote',
  'bg-slate-100 text-slate-700 ring-slate-200',
  '#64748b',
  'EXPENSE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE SET
  "label" = EXCLUDED."label",
  "type" = EXCLUDED."type",
  "updatedAt" = CURRENT_TIMESTAMP;
