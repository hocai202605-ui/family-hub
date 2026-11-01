import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { requireApiAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { goalSchema, toGoalResponse } from "../goal-utils";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAccess(request, "goals");
  if ("response" in auth) return auth.response;

  const id = params.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Mã mục tiêu không hợp lệ." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = goalSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dữ liệu cập nhật không hợp lệ.", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const username = auditUsername(auth.user);

  try {
    const goal = await prisma.goal.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
        ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
        ...(parsed.data.timelineType !== undefined ? { timelineType: parsed.data.timelineType } : {}),
        ...(parsed.data.targetYear !== undefined ? { targetYear: parsed.data.targetYear } : {}),
        ...(parsed.data.targetAmount !== undefined ? { targetAmount: BigInt(Math.round(parsed.data.targetAmount)) } : {}),
        ...(parsed.data.currentAmount !== undefined ? { currentAmount: BigInt(Math.round(parsed.data.currentAmount)) } : {}),
        ...(parsed.data.images !== undefined ? { images: parsed.data.images } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
        updatedBy: username,
      },
    });

    return NextResponse.json({ goal: toGoalResponse(goal) });
  } catch (error) {
    console.error("PATCH /api/goals/[id] error:", error);
    return NextResponse.json({ error: "Không tìm thấy hoặc không thể cập nhật mục tiêu." }, { status: 404 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAccess(request, "goals");
  if ("response" in auth) return auth.response;

  const id = params.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Mã mục tiêu không hợp lệ." }, { status: 400 });
  }

  try {
    await prisma.goal.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/goals/[id] error:", error);
    return NextResponse.json({ error: "Không tìm thấy hoặc không thể xóa mục tiêu." }, { status: 404 });
  }
}
