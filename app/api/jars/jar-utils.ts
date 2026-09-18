import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEFAULT_MONTHLY_BUDGET } from "@/app/api/budgets/budget-utils";

export const JAR_IDS = ["NEC", "LTSS", "EDU", "PLAY", "FFA", "GIVE"] as const;
export type JarId = (typeof JAR_IDS)[number];

export const jarIdSchema = z.enum(JAR_IDS);

export const jarPatchSchema = z
  .object({
    label: z.string().trim().min(1).max(40).optional(),
    limitAmount: z.number().int().nonnegative().max(1_000_000_000_000).optional(),
    categoryIds: z.array(z.string().trim().min(1)).optional(),
  })
  .refine(
    (value) =>
      value.label !== undefined || value.limitAmount !== undefined || value.categoryIds !== undefined,
    {
      message: "Provide label, limitAmount and/or categoryIds.",
    },
  );

const YEARLY_BUDGET_BASE = DEFAULT_MONTHLY_BUDGET * 12;

export const DEFAULT_JARS: Array<{
  id: JarId;
  label: string;
  targetPercent: number;
  sortOrder: number;
  defaultCategoryIds: string[];
}> = [
  {
    id: "NEC",
    label: "Thiết yếu",
    targetPercent: 55,
    sortOrder: 1,
    defaultCategoryIds: ["Food", "Utilities", "Transport"],
  },
  {
    id: "LTSS",
    label: "Tiết kiệm dài hạn",
    targetPercent: 10,
    sortOrder: 2,
    defaultCategoryIds: [],
  },
  {
    id: "EDU",
    label: "Giáo dục",
    targetPercent: 10,
    sortOrder: 3,
    defaultCategoryIds: [],
  },
  {
    id: "PLAY",
    label: "Hưởng thụ",
    targetPercent: 10,
    sortOrder: 4,
    defaultCategoryIds: ["Shopping", "Entertainment"],
  },
  {
    id: "FFA",
    label: "Tự do tài chính",
    targetPercent: 10,
    sortOrder: 5,
    defaultCategoryIds: [],
  },
  {
    id: "GIVE",
    label: "Cho đi / Hiếu hỉ",
    targetPercent: 5,
    sortOrder: 6,
    defaultCategoryIds: [],
  },
];

export function defaultLimitForPercent(targetPercent: number) {
  return Math.round((YEARLY_BUDGET_BASE * targetPercent) / 100);
}

export async function ensureDefaultJars(actor: string) {
  for (const jar of DEFAULT_JARS) {
    await prisma.expenseJar.upsert({
      where: { id: jar.id },
      create: {
        id: jar.id,
        label: jar.label,
        targetPercent: jar.targetPercent,
        limitAmount: defaultLimitForPercent(jar.targetPercent),
        sortOrder: jar.sortOrder,
        createdBy: actor,
        updatedBy: actor,
      },
      update: {},
    });
  }

  const assignmentCount = await prisma.expenseJarCategory.count();
  if (assignmentCount > 0) {
    return;
  }

  const expenseCategories = await prisma.category.findMany({
    where: { type: "EXPENSE" },
    select: { id: true },
  });
  const existingIds = new Set(expenseCategories.map((category) => category.id));

  for (const jar of DEFAULT_JARS) {
    const ids = jar.defaultCategoryIds.filter((id) => existingIds.has(id));
    if (ids.length === 0) {
      continue;
    }

    await prisma.expenseJarCategory.createMany({
      data: ids.map((categoryId) => ({ jarId: jar.id, categoryId })),
      skipDuplicates: true,
    });
  }
}

export function toJarResponse(jar: {
  id: string;
  label: string;
  targetPercent: number;
  limitAmount: number;
  sortOrder: number;
  categories: Array<{ categoryId: string }>;
  spent: number;
}) {
  return {
    id: jar.id,
    label: jar.label,
    targetPercent: jar.targetPercent,
    limitAmount: jar.limitAmount,
    sortOrder: jar.sortOrder,
    categoryIds: jar.categories.map((item) => item.categoryId),
    spent: jar.spent,
  };
}
