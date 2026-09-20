import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireAnyApiAccess } from "@/lib/auth";
import { toEventCategoryResponse, updateEventCategorySchema } from "../../growth-utils";

export const dynamic = "force-dynamic";

const CALENDAR_KEYS = ["calendar", "calendar.yearly", "calendar.events"] as const;

type Params = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAnyApiAccess(request, [...CALENDAR_KEYS]);
  if ("response" in auth) return auth.response;

  const parsed = updateEventCategorySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid category update." }, { status: 400 });
  }

  const existing = await prisma.growthEventCategory.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }
  if (existing.isSystem) {
    return NextResponse.json({ error: "Không thể sửa danh mục hệ thống." }, { status: 403 });
  }

  if (parsed.data.label && parsed.data.label !== existing.label) {
    const clash = await prisma.growthEventCategory.findUnique({ where: { label: parsed.data.label } });
    if (clash) {
      return NextResponse.json({ error: "Danh mục này đã tồn tại." }, { status: 409 });
    }
  }

  const category = await prisma.growthEventCategory.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
      ...(parsed.data.color !== undefined ? { color: parsed.data.color.toUpperCase() } : {}),
      updatedBy: auditUsername(auth.user),
    },
  });

  return NextResponse.json({ category: toEventCategoryResponse(category) });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAnyApiAccess(request, [...CALENDAR_KEYS]);
  if ("response" in auth) return auth.response;

  const existing = await prisma.growthEventCategory.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }
  if (existing.isSystem) {
    return NextResponse.json({ error: "Không thể xóa danh mục hệ thống." }, { status: 403 });
  }

  const inUse = await prisma.growthCalendarEvent.count({ where: { categoryId: params.id } });
  if (inUse > 0) {
    return NextResponse.json({ error: "Danh mục đang được dùng. Đổi sự kiện sang danh mục khác trước khi xóa." }, { status: 409 });
  }

  await prisma.growthEventCategory.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
