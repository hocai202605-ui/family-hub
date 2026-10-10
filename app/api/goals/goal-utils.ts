import { z } from "zod";

export const goalTypes = ["HOME", "CAR", "EDUCATION", "TRAVEL", "OTHER"] as const;

export const goalSchema = z.object({
  title: z.string().trim().min(1).max(120),
  goalType: z.enum(goalTypes).default("OTHER"),
  targetYear: z.number().int().min(2024).max(2100),
  targetAmount: z.number().int().nonnegative(),
  currentAmount: z.number().int().nonnegative().default(0),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export function toGoalResponse(goal: {
  id: number;
  title: string;
  goalType: string;
  targetYear: number;
  targetAmount: number;
  currentAmount: number;
  imageUrl: string | null;
  note: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: goal.id,
    title: goal.title,
    goalType: goal.goalType,
    targetYear: goal.targetYear,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    imageUrl: goal.imageUrl ?? "",
    note: goal.note ?? "",
    sortOrder: goal.sortOrder,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}
