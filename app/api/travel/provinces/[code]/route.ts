import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { requireApiAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProvinceCode } from "@/lib/travel/provinces";
import { dateFromInput, toVisitResponse, visitSchema } from "../../travel-utils";

export const dynamic = "force-dynamic";

type Params = { params: { code: string } };

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireApiAccess(request, "travel.overview");
  if ("response" in auth) return auth.response;

  const code = params.code;
  if (!isProvinceCode(code)) {
    return NextResponse.json({ error: "Unknown province code." }, { status: 400 });
  }

  const parsed = visitSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid province visit payload." }, { status: 400 });
  }

  const username = auditUsername(auth.user);
  const visit = await prisma.travelProvinceVisit.upsert({
    where: { provinceCode: code },
    create: {
      provinceCode: code,
      visitedOn: dateFromInput(parsed.data.visitedOn),
      note: parsed.data.note,
      createdBy: username,
      updatedBy: username,
    },
    update: {
      visitedOn: dateFromInput(parsed.data.visitedOn),
      note: parsed.data.note,
      updatedBy: username,
    },
  });

  return NextResponse.json({ visit: toVisitResponse(visit) });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireApiAccess(request, "travel.overview");
  if ("response" in auth) return auth.response;

  const code = params.code;
  if (!isProvinceCode(code)) {
    return NextResponse.json({ error: "Unknown province code." }, { status: 400 });
  }

  const existing = await prisma.travelProvinceVisit.findUnique({ where: { provinceCode: code } });
  if (!existing) {
    return NextResponse.json({ error: "Province visit not found." }, { status: 404 });
  }

  await prisma.travelProvinceVisit.delete({ where: { provinceCode: code } });
  return NextResponse.json({ ok: true });
}
