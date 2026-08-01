-- CreateTable
CREATE TABLE "monthly_budgets" (
    "id" SERIAL NOT NULL,
    "month" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monthly_budgets_month_key" ON "monthly_budgets"("month");
