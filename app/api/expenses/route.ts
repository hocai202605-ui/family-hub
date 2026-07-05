import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateFromInput, monthRange, toExpenseResponse, expenseSchema, yearRange } from "./expense-utils";
import { requireApiAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request, "expenses.monthly");
  if ("response" in auth) return auth.response;

  const month = request.nextUrl.searchParams.get("month");
  const year = request.nextUrl.searchParams.get("year");

  if (!month && !year) {
    return NextResponse.json({ error: "Missing month or year query parameter." }, { status: 400 });
  }

  const range = year ? yearRange(year) : month ? monthRange(month) : null;

  if (!range) {
    return NextResponse.json({ error: "Invalid month or year format." }, { status: 400 });
  }

  const expenses = await prisma.expense.findMany({
    where: {
      date: {
        gte: range.start,
        lt: range.end,
      },
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  return NextResponse.json({
    expenses: expenses.map(toExpenseResponse),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request, "expenses.monthly");
  if ("response" in auth) return auth.response;

  const parsed = expenseSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid expense payload." }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { 
      id: parsed.data.category,
    },
  });

  if (!category || category.type !== "EXPENSE") {
    return NextResponse.json({ error: "Expense category not found." }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      ...parsed.data,
      date: dateFromInput(parsed.data.date),
    },
  });

  return NextResponse.json({ expense: toExpenseResponse(expense) }, { status: 201 });
}
