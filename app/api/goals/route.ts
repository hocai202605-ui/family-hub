import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { requireApiAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { goalSchema, toGoalResponse } from "./goal-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request, "goals");
  if ("response" in auth) return auth.response;

  try {
    const goals = await prisma.goal.findMany({
      orderBy: [{ targetYear: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      goals: goals.map(toGoalResponse),
    });
  } catch (error) {
    console.error("GET /api/goals error:", error);
    return NextResponse.json(
      { error: "Không thể lấy danh sách mục tiêu từ cơ sở dữ liệu." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request, "goals");
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = goalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dữ liệu mục tiêu không hợp lệ.", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const username = auditUsername(auth.user);

  try {
    const goal = await prisma.goal.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        category: parsed.data.category,
        timelineType: parsed.data.timelineType,
        targetYear: parsed.data.targetYear,
        targetAmount: BigInt(Math.round(parsed.data.targetAmount)),
        currentAmount: BigInt(Math.round(parsed.data.currentAmount)),
        images: parsed.data.images,
        sortOrder: parsed.data.sortOrder,
        createdBy: username,
        updatedBy: username,
      },
    });

    return NextResponse.json({ goal: toGoalResponse(goal) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/goals error:", error);
    return NextResponse.json(
      { error: "Không thể lưu mục tiêu vào cơ sở dữ liệu." },
      { status: 500 }
    );
  }
}
