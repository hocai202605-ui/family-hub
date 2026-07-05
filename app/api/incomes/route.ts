import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateFromInput, monthRange, toIncomeResponse, incomeSchema } from "./income-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month");

  if (!month) {
    return NextResponse.json({ error: "Missing month query parameter." }, { status: 400 });
  }

  const range = monthRange(month);

  if (!range) {
    return NextResponse.json({ error: "Month must use YYYY-MM format." }, { status: 400 });
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
