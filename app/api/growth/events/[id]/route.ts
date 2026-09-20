import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireAnyApiAccess } from "@/lib/auth";
import { dateFromKey, toEventResponse, updateEventSchema } from "../../growth-utils";

export const dynamic = "force-dynamic";

const CALENDAR_KEYS = ["calendar", "calendar.yearly", "calendar.events"] as const;

type Params = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAnyApiAccess(request, [...CALENDAR_KEYS]);
  if ("response" in auth) return auth.response;

  const parsed = updateEventSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event update." }, { status: 400 });
  }

  const existing = await prisma.growthCalendarEvent.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  if (parsed.data.categoryId) {
    const category = await prisma.growthEventCategory.findUnique({ where: { id: parsed.data.categoryId } });
    if (!category) {
      return NextResponse.json({ error: "Event category not found." }, { status: 400 });
    }
  }

  const event = await prisma.growthCalendarEvent.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.date !== undefined ? { date: dateFromKey(parsed.data.date) } : {}),
      ...(parsed.data.text !== undefined ? { text: parsed.data.text } : {}),
      ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
      ...(parsed.data.budgetAmount !== undefined ? { budgetAmount: parsed.data.budgetAmount } : {}),
      ...(parsed.data.categoryId !== undefined ? { categoryId: parsed.data.categoryId } : {}),
      ...(parsed.data.member !== undefined ? { member: parsed.data.member } : {}),
      updatedBy: auditUsername(auth.user),
    },
    include: { category: true },
  });

  return NextResponse.json({ event: toEventResponse(event) });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAnyApiAccess(request, [...CALENDAR_KEYS]);
  if ("response" in auth) return auth.response;

  const existing = await prisma.growthCalendarEvent.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  await prisma.growthCalendarEvent.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
