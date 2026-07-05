import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateFromInput, toInvestmentResponse, investmentSchema } from "./investment-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const investments = await prisma.investment.findMany({
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  return NextResponse.json({
    investments: investments.map(toInvestmentResponse),
  });
}

export async function POST(request: NextRequest) {
  const parsed = investmentSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid investment payload." }, { status: 400 });
  }

  const investment = await prisma.investment.create({
    data: {
      ...parsed.data,
      date: dateFromInput(parsed.data.date),
    },
  });

  return NextResponse.json({ investment: toInvestmentResponse(investment) }, { status: 201 });
}
