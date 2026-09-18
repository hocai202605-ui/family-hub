-- CreateTable
CREATE TABLE "expense_jars" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "targetPercent" INTEGER NOT NULL,
    "limitAmount" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_jars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_jar_categories" (
    "jarId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "expense_jar_categories_pkey" PRIMARY KEY ("jarId","categoryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_jar_categories_categoryId_key" ON "expense_jar_categories"("categoryId");

-- CreateIndex
CREATE INDEX "expense_jar_categories_categoryId_idx" ON "expense_jar_categories"("categoryId");

-- AddForeignKey
ALTER TABLE "expense_jar_categories" ADD CONSTRAINT "expense_jar_categories_jarId_fkey" FOREIGN KEY ("jarId") REFERENCES "expense_jars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
