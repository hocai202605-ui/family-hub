-- CreateTable
CREATE TABLE "investment_year_targets" (
    "id" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_year_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "investment_year_targets_year_type_key" ON "investment_year_targets"("year", "type");

-- CreateIndex
CREATE INDEX "investment_year_targets_year_idx" ON "investment_year_targets"("year");
