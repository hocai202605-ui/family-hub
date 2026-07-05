import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateFromInput, monthRange, toIncomeResponse, incomeSchema, yearRange } from "./income-utils";
import { requireApiAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month");
  const year = request.nextUrl.searchParams.get("year");
  const auth = await requireApiAccess(request, year ? "income.yearly" : "income.monthly");
  if ("response" in auth) return auth.response;

  if (!month && !year) {
    return NextResponse.json({ error: "Missing month or year query parameter." }, { status: 400 });
  }

  const range = year ? yearRange(year) : month ? monthRange(month) : null;

  if (!range) {
    return NextResponse.json({ error: "Invalid month or year format." }, { status: 400 });
  }

  const incomes = await prisma.income.findMany({
    where: {
      date: {
        gte: range.start,
        lt: range.end,
      },
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  return NextResponse.json({
    incomes: incomes.map(toIncomeResponse),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request, "income.monthly");
  if ("response" in auth) return auth.response;

  const parsed = incomeSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid income payload." }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { 
      id: parsed.data.category,
    },
  });

  if (!category || category.type !== "INCOME") {
    return NextResponse.json({ error: "Income category not found." }, { status: 400 });
  }

  const income = await prisma.income.create({
    data: {
      ...parsed.data,
      date: dateFromInput(parsed.data.date),
    },
  });

  return NextResponse.json({ income: toIncomeResponse(income) }, { status: 201 });
}
