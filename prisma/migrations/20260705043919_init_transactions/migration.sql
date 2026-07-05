-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('income', 'expense');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('Food', 'Utilities', 'Transport', 'Shopping', 'Entertainment', 'Others');

-- CreateEnum
CREATE TYPE "FamilyMember" AS ENUM ('CK', 'VK', 'CON');

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "category" "Category" NOT NULL,
    "member" "FamilyMember" NOT NULL,
    "note" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transactions_date_idx" ON "transactions"("date");
