import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateFromInput, toExpenseResponse, expenseSchema } from "../expense-utils";

export const dynamic = "force-dynamic";

function expenseId(params: { id: string }) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = expenseId(params);

  if (!id) {
    return NextResponse.json({ error: "Invalid expense id." }, { status: 400 });
  }

  const parsed = expenseSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid expense payload." }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.category },
  });

  if (!category || category.type !== "EXPENSE") {
    return NextResponse.json({ error: "Expense category not found." }, { status: 400 });
  }

  try {
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...parsed.data,
        date: dateFromInput(parsed.data.date),
      },
    });

    return NextResponse.json({ expense: toExpenseResponse(expense) });
  } catch {
    return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const id = expenseId(params);

  if (!id) {
    return NextResponse.json({ error: "Invalid expense id." }, { status: 400 });
  }

  try {
    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  }
}
