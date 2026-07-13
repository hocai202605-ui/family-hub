import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireApiAccess } from "@/lib/auth";
import { updateHabitSchema } from "../../growth-utils";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireApiAccess(request, "calendar");
  if ("response" in auth) return auth.response;

  const parsed = updateHabitSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid habit update." }, { status: 400 });
  }

  const existing = await prisma.growthHabit.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Habit not found." }, { status: 404 });
  }

  const habit = await prisma.growthHabit.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
      ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      updatedBy: auditUsername(auth.user),
    },
  });

  return NextResponse.json({
    habit: {
      id: habit.id,
      name: habit.name,
      color: habit.color,
      member: habit.member,
      month: habit.month,
    },
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireApiAccess(request, "calendar");
  if ("response" in auth) return auth.response;

  const existing = await prisma.growthHabit.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Habit not found." }, { status: 404 });
  }

  await prisma.growthHabit.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
