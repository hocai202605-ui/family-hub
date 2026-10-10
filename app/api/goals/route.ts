import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { requireApiAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { goalSchema, toGoalResponse } from "./goal-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request, "goals");
  if ("response" in auth) return auth.response;

  const goals = await prisma.goal.findMany({
    orderBy: [{ targetYear: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
  });

  return NextResponse.json({
    goals: goals.map(toGoalResponse),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request, "goals");
  if ("response" in auth) return auth.response;

  const parsed = goalSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid goal payload." }, { status: 400 });
  }

  const username = auditUsername(auth.user);
  const goal = await prisma.goal.create({
    data: {
      ...parsed.data,
      imageUrl: parsed.data.imageUrl || null,
      note: parsed.data.note || null,
      createdBy: username,
      updatedBy: username,
    },
  });

  return NextResponse.json({ goal: toGoalResponse(goal) }, { status: 201 });
}
