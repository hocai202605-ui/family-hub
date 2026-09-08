import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { requireApiAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateFromInput, destinationSchema, toDestinationResponse } from "../travel-utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request, "travel.overview");
  if ("response" in auth) return auth.response;

  const parsed = destinationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid destination payload." }, { status: 400 });
  }

  const username = auditUsername(auth.user);
  const destination = await prisma.travelDestination.create({
    data: {
      provinceCode: parsed.data.provinceCode,
      name: parsed.data.name,
      svgX: parsed.data.svgX,
      svgY: parsed.data.svgY,
      visitedOn: dateFromInput(parsed.data.visitedOn),
      note: parsed.data.note,
      createdBy: username,
      updatedBy: username,
    },
  });

  return NextResponse.json({ destination: toDestinationResponse(destination) }, { status: 201 });
}
