import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireApiAccess } from "@/lib/auth";
import { updateTickNoteSchema } from "../../growth-utils";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireApiAccess(request, "calendar");
  if ("response" in auth) return auth.response;

  const parsed = updateTickNoteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid tick-note update." }, { status: 400 });
  }

  const existing = await prisma.growthTickNote.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Tick note not found." }, { status: 404 });
  }

  const note = await prisma.growthTickNote.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.text !== undefined ? { text: parsed.data.text } : {}),
      ...(parsed.data.isCompleted !== undefined ? { isCompleted: parsed.data.isCompleted } : {}),
      updatedBy: auditUsername(auth.user),
    },
  });

  return NextResponse.json({
    note: {
      id: note.id,
      text: note.text,
      isCompleted: note.isCompleted,
      dailyLogId: note.dailyLogId,
    },
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireApiAccess(request, "calendar");
  if ("response" in auth) return auth.response;

  const existing = await prisma.growthTickNote.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Tick note not found." }, { status: 404 });
  }

  await prisma.growthTickNote.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
