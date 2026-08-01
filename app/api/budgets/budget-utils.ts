import { z } from "zod";

/** Default monthly spending limit (VND) when no row exists for the month. */
export const DEFAULT_MONTHLY_BUDGET = 20_000_000;

export const monthKeyRegex = /^\d{4}-\d{2}$/;

export const budgetMonthSchema = z.string().regex(monthKeyRegex);

export const budgetUpsertSchema = z.object({
  month: budgetMonthSchema,
  amount: z.number().int().positive().max(1_000_000_000_000),
});

export function isValidBudgetMonth(month: string) {
  if (!monthKeyRegex.test(month)) {
    return false;
  }

  const monthNumber = Number(month.slice(5, 7));
  return monthNumber >= 1 && monthNumber <= 12;
}

export function toBudgetResponse(budget: { month: string; amount: number }) {
  return {
    month: budget.month,
    amount: budget.amount,
  };
}
