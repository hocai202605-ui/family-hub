import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireApiAccess } from "@/lib/auth";
import { createHabitSchema } from "../growth-utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request, "calendar");
  if ("response" in auth) return auth.response;

  const parsed = createHabitSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid habit payload." }, { status: 400 });
  }

  const count = await prisma.growthHabit.count({
    where: { member: parsed.data.member, month: parsed.data.month },
  });

  const username = auditUsername(auth.user);

  const habit = await prisma.growthHabit.create({
    data: {
      member: parsed.data.member,
      month: parsed.data.month,
      name: parsed.data.name,
      color: parsed.data.color ?? "amber",
      sortOrder: count,
      createdBy: username,
      updatedBy: username,
    },
  });

  return NextResponse.json(
    {
      habit: {
        id: habit.id,
        name: habit.name,
        color: habit.color,
        member: habit.member,
        month: habit.month,
      },
    },
    { status: 201 },
  );
}
