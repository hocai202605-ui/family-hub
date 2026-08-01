-- Add household-level family member tag for shared expenses.
ALTER TYPE "FamilyMember" ADD VALUE IF NOT EXISTS 'GIA_DINH';
