import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateFromInput, toTransactionResponse, transactionSchema } from "../transaction-utils";

export const dynamic = "force-dynamic";

function transactionId(params: { id: string }) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = transactionId(params);

  if (!id) {
    return NextResponse.json({ error: "Invalid transaction id." }, { status: 400 });
  }

  const parsed = transactionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid transaction payload." }, { status: 400 });
  }

  try {
    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...parsed.data,
        date: dateFromInput(parsed.data.date),
      },
    });

    return NextResponse.json({ transaction: toTransactionResponse(transaction) });
  } catch {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const id = transactionId(params);

  if (!id) {
    return NextResponse.json({ error: "Invalid transaction id." }, { status: 400 });
  }

  try {
    await prisma.transaction.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }
}
