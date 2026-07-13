import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireApiAccess } from "@/lib/auth";
import { formatDateKey, updatePlanItemSchema } from "../../growth-utils";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireApiAccess(request, "calendar");
  if ("response" in auth) return auth.response;

  const parsed = updatePlanItemSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan item update." }, { status: 400 });
  }

  const existing = await prisma.growthPlanItem.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Plan item not found." }, { status: 404 });
  }

  const item = await prisma.growthPlanItem.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.text !== undefined ? { text: parsed.data.text } : {}),
      ...(parsed.data.isCompleted !== undefined ? { isCompleted: parsed.data.isCompleted } : {}),
      ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      updatedBy: auditUsername(auth.user),
    },
  });

  return NextResponse.json({
    item: {
      id: item.id,
      text: item.text,
      isCompleted: item.isCompleted,
      scope: item.scope,
      month: item.month,
      weekStart: item.weekStart ? formatDateKey(item.weekStart) : null,
    },
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireApiAccess(request, "calendar");
  if ("response" in auth) return auth.response;

  const existing = await prisma.growthPlanItem.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Plan item not found." }, { status: 404 });
  }

  await prisma.growthPlanItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
