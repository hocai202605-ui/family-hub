CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'banknote',
    "badge" TEXT NOT NULL DEFAULT 'bg-slate-100 text-slate-700 ring-slate-200',
    "chart" TEXT NOT NULL DEFAULT '#64748b',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "expense_categories_label_key" ON "expense_categories"("label");

INSERT INTO "expense_categories" ("id", "label", "icon", "badge", "chart")
VALUES
    ('Food', 'Ăn uống', 'utensils', 'bg-emerald-50 text-emerald-700 ring-emerald-100', '#10b981'),
    ('Utilities', 'Điện nước', 'home', 'bg-sky-50 text-sky-700 ring-sky-100', '#0ea5e9'),
    ('Transport', 'Di chuyển', 'trendingUp', 'bg-amber-50 text-amber-700 ring-amber-100', '#f59e0b'),
    ('Shopping', 'Mua sắm', 'wallet', 'bg-rose-50 text-rose-700 ring-rose-100', '#f43f5e'),
    ('Entertainment', 'Giải trí', 'sparkles', 'bg-violet-50 text-violet-700 ring-violet-100', '#8b5cf6'),
    ('Others', 'Khác', 'banknote', 'bg-slate-100 text-slate-700 ring-slate-200', '#64748b')
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "transactions" ALTER COLUMN "category" TYPE TEXT USING "category"::text;

CREATE INDEX "transactions_category_idx" ON "transactions"("category");

DROP TYPE IF EXISTS "Category";
