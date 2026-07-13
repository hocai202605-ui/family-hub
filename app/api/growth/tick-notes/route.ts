import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireApiAccess } from "@/lib/auth";
import { createTickNoteSchema, dateFromKey, emptyTop5Tasks } from "../growth-utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request, "calendar");
  if ("response" in auth) return auth.response;

  const parsed = createTickNoteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid tick-note payload." }, { status: 400 });
  }

  const username = auditUsername(auth.user);
  const date = dateFromKey(parsed.data.date);

  const dailyLog = await prisma.growthDailyLog.upsert({
    where: {
      member_date: {
        member: parsed.data.member,
        date,
      },
    },
    create: {
      member: parsed.data.member,
      date,
      reflection: "",
      top5Tasks: emptyTop5Tasks(),
      createdBy: username,
      updatedBy: username,
    },
    update: {
      updatedBy: username,
    },
  });

  const count = await prisma.growthTickNote.count({ where: { dailyLogId: dailyLog.id } });

  const note = await prisma.growthTickNote.create({
    data: {
      dailyLogId: dailyLog.id,
      text: parsed.data.text,
      sortOrder: count,
      createdBy: username,
      updatedBy: username,
    },
  });

  return NextResponse.json(
    {
      note: {
        id: note.id,
        text: note.text,
        isCompleted: note.isCompleted,
        dailyLogId: note.dailyLogId,
      },
    },
    { status: 201 },
  );
}
