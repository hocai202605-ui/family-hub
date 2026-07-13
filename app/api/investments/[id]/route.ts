import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { dateFromInput, toInvestmentResponse, investmentSchema } from "../investment-utils";
import { requireApiAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

function investmentId(params: { id: string }) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAccess(request, "investments");
  if ("response" in auth) return auth.response;

  const id = investmentId(params);

  if (!id) {
    return NextResponse.json({ error: "Invalid investment id." }, { status: 400 });
  }

  const parsed = investmentSchema.partial().safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid investment payload." }, { status: 400 });
  }

  try {
    const dataToUpdate: any = { ...parsed.data, updatedBy: auditUsername(auth.user) };
    if (parsed.data.date) {
      dataToUpdate.date = dateFromInput(parsed.data.date);
    }

    const investment = await prisma.investment.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ investment: toInvestmentResponse(investment) });
  } catch {
    return NextResponse.json({ error: "Investment not found." }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAccess(_request, "investments");
  if ("response" in auth) return auth.response;

  const id = investmentId(params);

  if (!id) {
    return NextResponse.json({ error: "Invalid investment id." }, { status: 400 });
  }

  try {
    await prisma.investment.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Investment not found." }, { status: 404 });
  }
}
