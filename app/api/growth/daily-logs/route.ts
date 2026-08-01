import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireApiAccess } from "@/lib/auth";
import {
  dateFromKey,
  dayLabelForDateKey,
  emptyTop5Tasks,
  formatDateKey,
  normalizeTop5,
  upsertDailyLogSchema,
} from "../growth-utils";

export const dynamic = "force-dynamic";

/** Upsert daily log (reflection / top5). */
export async function PUT(request: NextRequest) {
  const auth = await requireApiAccess(request, "calendar");
  if ("response" in auth) return auth.response;

  try {
    const parsed = upsertDailyLogSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid daily log payload." }, { status: 400 });
    }

    const username = auditUsername(auth.user);
    const date = dateFromKey(parsed.data.date);
    const existing = await prisma.growthDailyLog.findUnique({
      where: {
        member_date: {
          member: parsed.data.member,
          date,
        },
      },
    });

    const top5Tasks = parsed.data.top5Tasks
      ? normalizeTop5(parsed.data.top5Tasks)
      : existing
        ? normalizeTop5(existing.top5Tasks)
        : emptyTop5Tasks();

    const log = await prisma.growthDailyLog.upsert({
      where: {
        member_date: {
          member: parsed.data.member,
          date,
        },
      },
      create: {
        member: parsed.data.member,
        date,
        reflection: parsed.data.reflection ?? "",
        top5Tasks,
        createdBy: username,
        updatedBy: username,
      },
      update: {
        ...(parsed.data.reflection !== undefined ? { reflection: parsed.data.reflection } : {}),
        ...(parsed.data.top5Tasks !== undefined ? { top5Tasks } : {}),
        updatedBy: username,
      },
      include: { tickNotes: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    });

    return NextResponse.json({
      dailyLog: {
        id: log.id,
        date: formatDateKey(log.date),
        dayLabel: dayLabelForDateKey(formatDateKey(log.date)),
        reflection: log.reflection,
        top5Tasks: normalizeTop5(log.top5Tasks),
        tickNotes: log.tickNotes.map((note) => ({
          id: note.id,
          text: note.text,
          isCompleted: note.isCompleted,
        })),
      },
    });
  } catch (error) {
    console.error("[PUT /api/growth/daily-logs]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save daily log." },
      { status: 500 },
    );
  }
}
