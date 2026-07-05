import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateFromInput, monthRange, toTransactionResponse, transactionSchema } from "./transaction-utils";

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

  const transactions = await prisma.transaction.findMany({
    where: {
      date: {
        gte: range.start,
        lt: range.end,
      },
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  return NextResponse.json({
    transactions: transactions.map(toTransactionResponse),
  });
}

export async function POST(request: NextRequest) {
  const parsed = transactionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid transaction payload." }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      ...parsed.data,
      date: dateFromInput(parsed.data.date),
    },
  });

  return NextResponse.json({ transaction: toTransactionResponse(transaction) }, { status: 201 });
}
