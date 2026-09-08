import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { requireApiAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateFromInput, destinationPatchSchema, toDestinationResponse } from "../../travel-utils";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireApiAccess(request, "travel.overview");
  if ("response" in auth) return auth.response;

  const parsed = destinationPatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid destination update." }, { status: 400 });
  }

  const existing = await prisma.travelDestination.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Destination not found." }, { status: 404 });
  }

  const destination = await prisma.travelDestination.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.provinceCode !== undefined ? { provinceCode: parsed.data.provinceCode } : {}),
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.svgX !== undefined ? { svgX: parsed.data.svgX } : {}),
      ...(parsed.data.svgY !== undefined ? { svgY: parsed.data.svgY } : {}),
      ...(parsed.data.visitedOn !== undefined ? { visitedOn: dateFromInput(parsed.data.visitedOn) } : {}),
      ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
      updatedBy: auditUsername(auth.user),
    },
  });

  return NextResponse.json({ destination: toDestinationResponse(destination) });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireApiAccess(request, "travel.overview");
  if ("response" in auth) return auth.response;

  const existing = await prisma.travelDestination.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Destination not found." }, { status: 404 });
  }

  await prisma.travelDestination.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
