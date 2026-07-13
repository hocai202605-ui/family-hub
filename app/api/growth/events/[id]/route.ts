import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireApiAccess(request, "calendar");
  if ("response" in auth) return auth.response;

  const existing = await prisma.growthCalendarEvent.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  await prisma.growthCalendarEvent.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
