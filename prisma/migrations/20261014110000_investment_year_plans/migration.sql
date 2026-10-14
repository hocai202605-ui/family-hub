CREATE TABLE "investment_year_plans" (
    "year" TEXT NOT NULL,
    "totalTargetAmount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_year_plans_pkey" PRIMARY KEY ("year")
);
