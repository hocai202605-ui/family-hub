import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireApiAccess } from "@/lib/auth";
import { createPlanItemSchema, dateFromKey, formatDateKey } from "../growth-utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request, "calendar");
  if ("response" in auth) return auth.response;

  const parsed = createPlanItemSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan item payload." }, { status: 400 });
  }

  if (parsed.data.scope === "week" && !parsed.data.weekStart) {
    return NextResponse.json({ error: "weekStart is required for weekly plan items." }, { status: 400 });
  }

  const count = await prisma.growthPlanItem.count({
    where: {
      member: parsed.data.member,
      month: parsed.data.month,
      scope: parsed.data.scope,
      ...(parsed.data.scope === "week" && parsed.data.weekStart
        ? { weekStart: dateFromKey(parsed.data.weekStart) }
        : { scope: "month" }),
    },
  });

  const username = auditUsername(auth.user);

  const item = await prisma.growthPlanItem.create({
    data: {
      member: parsed.data.member,
      scope: parsed.data.scope,
      month: parsed.data.month,
      weekStart: parsed.data.weekStart ? dateFromKey(parsed.data.weekStart) : null,
      text: parsed.data.text,
      sortOrder: count,
      createdBy: username,
      updatedBy: username,
    },
  });

  return NextResponse.json(
    {
      item: {
        id: item.id,
        text: item.text,
        isCompleted: item.isCompleted,
        scope: item.scope,
        month: item.month,
        weekStart: item.weekStart ? formatDateKey(item.weekStart) : null,
      },
    },
    { status: 201 },
  );
}
