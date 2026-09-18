import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEFAULT_MONTHLY_BUDGET } from "@/app/api/budgets/budget-utils";

export const JAR_IDS = ["NEC", "LTSS", "EDU", "PLAY", "FFA", "GIVE"] as const;
export type JarId = (typeof JAR_IDS)[number];

export const jarIdSchema = z.enum(JAR_IDS);

export const jarPatchSchema = z
  .object({
    label: z.string().trim().min(1).max(40).optional(),
    targetPercent: z.number().int().min(0).max(100).optional(),
    limitAmount: z.number().int().nonnegative().max(1_000_000_000_000).optional(),
    categoryIds: z.array(z.string().trim().min(1)).optional(),
  })
  .refine(
    (value) =>
      value.label !== undefined ||
      value.targetPercent !== undefined ||
      value.limitAmount !== undefined ||
      value.categoryIds !== undefined,
    {
      message: "Provide label, targetPercent, limitAmount and/or categoryIds.",
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

export const LTSS_JAR_ID: JarId = "LTSS";
export const FFA_JAR_ID: JarId = "FFA";

export const INVESTMENT_JAR_COPY: Record<
  string,
  { hint: string; dialog: string; note: string }
> = {
  LTSS: {
    hint: "Sổ tiết kiệm − nợ",
    dialog: "Đổi tên và hạn mức. Số thực tế lấy từ sổ tiết kiệm trừ nợ và trả lãi vay trong năm đang xem.",
    note: "Số đã dùng = tiền gửi sổ tiết kiệm − (nợ + trả nợ lãi vay) theo năm báo cáo. Không gán danh mục chi.",
  },
  FFA: {
    hint: "Vàng + CCQ",
    dialog: "Đổi tên và hạn mức. Số thực tế lấy từ đầu tư vàng và chứng chỉ quỹ trong năm đang xem.",
    note: "Số đã dùng = giá trị vàng + chứng chỉ quỹ (DCDS, ETF VN30) theo năm báo cáo. Không gán danh mục chi.",
  },
};

function investmentPrincipal(item: { quantity: number; purchasePrice: number }) {
  return item.purchasePrice * item.quantity;
}

function debtOutstanding(item: { quantity: number; purchasePrice: number; currentPrice: number }) {
  const unit = item.currentPrice > 0 ? item.currentPrice : item.purchasePrice;
  return unit * item.quantity;
}

/** SAVING deposits minus DEBT and DEBT_INTEREST in the given year. */
export async function ltssNetForYear(range: { start: Date; end: Date }) {
  const rows = await prisma.investment.findMany({
    where: {
      type: { in: ["SAVING", "DEBT", "DEBT_INTEREST"] },
      date: { gte: range.start, lt: range.end },
    },
    select: {
      type: true,
      quantity: true,
      purchasePrice: true,
      currentPrice: true,
    },
  });

  let saving = 0;
  let debt = 0;
  let debtInterest = 0;

  for (const row of rows) {
    if (row.type === "SAVING") {
      saving += investmentPrincipal(row);
    } else if (row.type === "DEBT") {
      debt += debtOutstanding(row);
    } else if (row.type === "DEBT_INTEREST") {
      debtInterest += investmentPrincipal(row);
    }
  }

  return Math.round(saving - debt - debtInterest);
}

function marketValue(item: { quantity: number; purchasePrice: number; currentPrice: number }) {
  const unit = item.currentPrice > 0 ? item.currentPrice : item.purchasePrice;
  return unit * item.quantity;
}

/** GOLD + fund certificates (DCDS, ETF VN30) recorded in the given year. */
export async function ffaValueForYear(range: { start: Date; end: Date }) {
  const rows = await prisma.investment.findMany({
    where: {
      type: { in: ["GOLD", "FUND_DCDS", "FUND_ETF_VN30"] },
      date: { gte: range.start, lt: range.end },
    },
    select: {
      quantity: true,
      purchasePrice: true,
      currentPrice: true,
    },
  });

  const total = rows.reduce((sum, row) => sum + marketValue(row), 0);
  return Math.round(total);
}

export function toJarResponse(jar: {
  id: string;
  label: string;
  targetPercent: number;
  limitAmount: number;
  sortOrder: number;
  categories: Array<{ categoryId: string }>;
  spent: number;
  spentSource?: "expenses" | "investments";
  syncHint?: string;
  syncDialog?: string;
  syncNote?: string;
}) {
  const copy = INVESTMENT_JAR_COPY[jar.id];
  return {
    id: jar.id,
    label: jar.label,
    targetPercent: jar.targetPercent,
    limitAmount: jar.limitAmount,
    sortOrder: jar.sortOrder,
    categoryIds: jar.categories.map((item) => item.categoryId),
    spent: jar.spent,
    spentSource: jar.spentSource ?? "expenses",
    syncHint: jar.syncHint ?? copy?.hint,
    syncDialog: jar.syncDialog ?? copy?.dialog,
    syncNote: jar.syncNote ?? copy?.note,
  };
}
