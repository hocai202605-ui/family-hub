import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireAnyApiAccess } from "@/lib/auth";
import { createEventCategorySchema, toEventCategoryResponse } from "../growth-utils";

export const dynamic = "force-dynamic";

const CALENDAR_KEYS = ["calendar", "calendar.yearly", "calendar.events"] as const;

export async function GET(request: NextRequest) {
  const auth = await requireAnyApiAccess(request, [...CALENDAR_KEYS]);
  if ("response" in auth) return auth.response;

  const categories = await prisma.growthEventCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ categories: categories.map(toEventCategoryResponse) });
}

export async function POST(request: NextRequest) {
  const auth = await requireAnyApiAccess(request, [...CALENDAR_KEYS]);
  if ("response" in auth) return auth.response;

  const parsed = createEventCategorySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid category payload." }, { status: 400 });
  }

  const existing = await prisma.growthEventCategory.findUnique({
    where: { label: parsed.data.label },
  });
  if (existing) {
    return NextResponse.json({ error: "Danh mục này đã tồn tại." }, { status: 409 });
  }

  const maxSort = await prisma.growthEventCategory.aggregate({ _max: { sortOrder: true } });
  const username = auditUsername(auth.user);
  const category = await prisma.growthEventCategory.create({
    data: {
      label: parsed.data.label,
      color: parsed.data.color.toUpperCase(),
      isSystem: false,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      createdBy: username,
      updatedBy: username,
    },
  });

  return NextResponse.json({ category: toEventCategoryResponse(category) }, { status: 201 });
}
