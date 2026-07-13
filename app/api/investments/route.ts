import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { dateFromInput, toInvestmentResponse, investmentSchema } from "./investment-utils";
import { requireApiAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request, "investments");
  if ("response" in auth) return auth.response;

  const investments = await prisma.investment.findMany({
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  return NextResponse.json({
    investments: investments.map(toInvestmentResponse),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request, "investments");
  if ("response" in auth) return auth.response;

  const parsed = investmentSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid investment payload." }, { status: 400 });
  }

  const username = auditUsername(auth.user);
  const investment = await prisma.investment.create({
    data: {
      ...parsed.data,
      date: dateFromInput(parsed.data.date),
      createdBy: username,
      updatedBy: username,
    },
  });

  return NextResponse.json({ investment: toInvestmentResponse(investment) }, { status: 201 });
}
