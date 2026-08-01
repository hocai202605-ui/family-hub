import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireApiAccess } from "@/lib/auth";
import { dateFromKey, habitCheckSchema } from "../growth-utils";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  const auth = await requireApiAccess(request, "calendar");
  if ("response" in auth) return auth.response;

  try {
    const parsed = habitCheckSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid habit check payload." }, { status: 400 });
    }

    const habit = await prisma.growthHabit.findUnique({ where: { id: parsed.data.habitId } });
    if (!habit) {
      return NextResponse.json({ error: "Habit not found." }, { status: 404 });
    }

    const weekStart = dateFromKey(parsed.data.weekStart);

    const username = auditUsername(auth.user);

    const check = await prisma.growthHabitCheck.upsert({
      where: {
        habitId_weekStart_dayIndex: {
          habitId: parsed.data.habitId,
          weekStart,
          dayIndex: parsed.data.dayIndex,
        },
      },
      create: {
        habitId: parsed.data.habitId,
        weekStart,
        dayIndex: parsed.data.dayIndex,
        completed: parsed.data.completed,
        createdBy: username,
        updatedBy: username,
      },
      update: {
        completed: parsed.data.completed,
        updatedBy: username,
      },
    });

    return NextResponse.json({
      check: {
        id: check.id,
        habitId: check.habitId,
        weekStart: parsed.data.weekStart,
        dayIndex: check.dayIndex,
        completed: check.completed,
      },
    });
  } catch (error) {
    console.error("[PUT /api/growth/habit-checks]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save habit check." },
      { status: 500 },
    );
  }
}
