import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { requireApiAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { goalSchema, toGoalResponse } from "../goal-utils";

export const dynamic = "force-dynamic";

function goalId(params: { id: string }) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAccess(request, "goals");
  if ("response" in auth) return auth.response;

  const id = goalId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid goal id." }, { status: 400 });
  }

  const parsed = goalSchema.partial().safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid goal payload." }, { status: 400 });
  }

  try {
    const goal = await prisma.goal.update({
      where: { id },
      data: {
        ...parsed.data,
        imageUrl: parsed.data.imageUrl === undefined ? undefined : parsed.data.imageUrl || null,
        note: parsed.data.note === undefined ? undefined : parsed.data.note || null,
        updatedBy: auditUsername(auth.user),
      },
    });

    return NextResponse.json({ goal: toGoalResponse(goal) });
  } catch {
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAccess(request, "goals");
  if ("response" in auth) return auth.response;

  const id = goalId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid goal id." }, { status: 400 });
  }

  try {
    await prisma.goal.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  }
}
