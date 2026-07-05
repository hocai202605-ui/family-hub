import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateFromInput, toIncomeResponse, incomeSchema } from "../income-utils";
import { requireApiAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

function incomeId(params: { id: string }) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAccess(request, "income.monthly");
  if ("response" in auth) return auth.response;

  const id = incomeId(params);

  if (!id) {
    return NextResponse.json({ error: "Invalid income id." }, { status: 400 });
  }

  const parsed = incomeSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid income payload." }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.category },
  });

  if (!category || category.type !== "INCOME") {
    return NextResponse.json({ error: "Income category not found." }, { status: 400 });
  }

  try {
    const income = await prisma.income.update({
      where: { id },
      data: {
        ...parsed.data,
        date: dateFromInput(parsed.data.date),
      },
    });

    return NextResponse.json({ income: toIncomeResponse(income) });
  } catch {
    return NextResponse.json({ error: "Income not found." }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAccess(_request, "income.monthly");
  if ("response" in auth) return auth.response;

  const id = incomeId(params);

  if (!id) {
    return NextResponse.json({ error: "Invalid income id." }, { status: 400 });
  }

  try {
    await prisma.income.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Income not found." }, { status: 404 });
  }
}
