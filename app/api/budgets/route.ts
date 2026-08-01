import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { requireApiAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  budgetUpsertSchema,
  DEFAULT_MONTHLY_BUDGET,
  isValidBudgetMonth,
  toBudgetResponse,
} from "./budget-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request, "expenses.monthly");
  if ("response" in auth) return auth.response;

  const month = request.nextUrl.searchParams.get("month");

  if (!month || !isValidBudgetMonth(month)) {
    return NextResponse.json({ error: "Invalid or missing month query parameter (YYYY-MM)." }, { status: 400 });
  }

  const budget = await prisma.monthlyBudget.findUnique({
    where: { month },
  });

  return NextResponse.json({
    budget: toBudgetResponse({
      month,
      amount: budget?.amount ?? DEFAULT_MONTHLY_BUDGET,
    }),
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireApiAccess(request, "expenses.monthly");
  if ("response" in auth) return auth.response;

  const parsed = budgetUpsertSchema.safeParse(await request.json());

  if (!parsed.success || !isValidBudgetMonth(parsed.data.month)) {
    return NextResponse.json({ error: "Invalid budget payload." }, { status: 400 });
  }

  const username = auditUsername(auth.user);
  const { month, amount } = parsed.data;

  const budget = await prisma.monthlyBudget.upsert({
    where: { month },
    create: {
      month,
      amount,
      createdBy: username,
      updatedBy: username,
    },
    update: {
      amount,
      updatedBy: username,
    },
  });

  return NextResponse.json({ budget: toBudgetResponse(budget) });
}
