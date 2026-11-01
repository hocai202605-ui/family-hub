import { z } from "zod";

export const goalCategories = [
  "Phát triển bản thân",
  "An cư",
  "Phương tiện",
  "Giáo dục",
  "Tài sản",
  "Khác",
] as const;

export const timelineTypes = ["Ngắn hạn", "Trung hạn", "Dài hạn"] as const;

export const familyMembers = ["Gia đình", "Chồng", "Vợ", "Con"] as const;

export const goalSchema = z.object({
  title: z.string().trim().min(1, "Tên mục tiêu không được để trống").max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  category: z.string().trim().min(1, "Danh mục không được để trống").max(50).default("Khác"),
  timelineType: z.string().trim().min(1, "Kỳ hạn không được để trống").max(50).default("Trung hạn"),
  member: z.string().trim().min(1).max(50).default("Gia đình"),
  targetYear: z.number().int().min(2024).max(2100),
  targetAmount: z.number().nonnegative(),
  currentAmount: z.number().nonnegative().default(0),
  images: z.array(z.string().url().or(z.string().startsWith("/"))).max(5).default([]),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export type GoalInput = z.infer<typeof goalSchema>;

export function toGoalResponse(goal: {
  id: string;
  title: string;
  description: string | null;
  category: string;
  timelineType: string;
  member?: string | null;
  targetYear: number;
  targetAmount: bigint | number;
  currentAmount: bigint | number;
  images: string[];
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description ?? "",
    category: goal.category,
    timeline_type: goal.timelineType,
    member: goal.member ?? "Gia đình",
    target_year: goal.targetYear,
    target_amount: Number(goal.targetAmount),
    current_amount: Number(goal.currentAmount),
    images: goal.images ?? [],
    sort_order: goal.sortOrder,
    created_at: goal.createdAt.toISOString(),
    updated_at: goal.updatedAt.toISOString(),
  };
}
