import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireApiAccess } from "@/lib/auth";
import { createEventSchema, dateFromKey, formatDateKey } from "../growth-utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request, "calendar");
  if ("response" in auth) return auth.response;

  const parsed = createEventSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event payload." }, { status: 400 });
  }

  const username = auditUsername(auth.user);

  const event = await prisma.growthCalendarEvent.create({
    data: {
      member: parsed.data.member,
      date: dateFromKey(parsed.data.date),
      text: parsed.data.text,
      createdBy: username,
      updatedBy: username,
    },
  });

  return NextResponse.json(
    {
      event: {
        id: event.id,
        date: formatDateKey(event.date),
        text: event.text,
      },
    },
    { status: 201 },
  );
}
