import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { requireAnyApiAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { yearRange } from "@/app/api/expenses/expense-utils";
import { ensureDefaultJars, toJarResponse } from "./jar-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAnyApiAccess(request, ["expenses.yearly", "expenses.monthly"]);
  if ("response" in auth) return auth.response;

  const year = request.nextUrl.searchParams.get("year");
  const range = year ? yearRange(year) : null;

  if (!range) {
    return NextResponse.json({ error: "Invalid or missing year query parameter." }, { status: 400 });
  }

  await ensureDefaultJars(auditUsername(auth.user));

  const [jars, expenseCategories, spentGroups] = await Promise.all([
    prisma.expenseJar.findMany({
      include: { categories: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.category.findMany({
      where: { type: "EXPENSE" },
      select: { id: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: {
        date: {
          gte: range.start,
          lt: range.end,
        },
      },
      _sum: { amount: true },
    }),
  ]);

  const spentByCategory = new Map(
    spentGroups.map((row) => [row.category, row._sum.amount ?? 0]),
  );
  const assigned = new Set(jars.flatMap((jar) => jar.categories.map((item) => item.categoryId)));

  return NextResponse.json({
    jars: jars.map((jar) =>
      toJarResponse({
        ...jar,
        spent: jar.categories.reduce(
          (sum, item) => sum + (spentByCategory.get(item.categoryId) ?? 0),
          0,
        ),
      }),
    ),
    unassignedCategoryIds: expenseCategories
      .map((category) => category.id)
      .filter((id) => !assigned.has(id)),
  });
}
