import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireAnyApiAccess } from "@/lib/auth";
import {
  createEventSchema,
  dateFromKey,
  DEFAULT_EVENT_CATEGORY_ID,
  toEventResponse,
  yearKeySchema,
  yearRange,
} from "../growth-utils";

export const dynamic = "force-dynamic";

const CALENDAR_KEYS = ["calendar", "calendar.yearly", "calendar.events"] as const;

export async function GET(request: NextRequest) {
  const auth = await requireAnyApiAccess(request, [...CALENDAR_KEYS]);
  if ("response" in auth) return auth.response;

  const yearRaw = request.nextUrl.searchParams.get("year");
  const yearParsed = yearKeySchema.safeParse(yearRaw);
  if (!yearParsed.success) {
    return NextResponse.json({ error: "Invalid or missing year (YYYY)." }, { status: 400 });
  }

  const range = yearRange(yearParsed.data);
  if (!range) {
    return NextResponse.json({ error: "Invalid year." }, { status: 400 });
  }

  const [categories, events] = await Promise.all([
    prisma.growthEventCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.growthCalendarEvent.findMany({
      where: { date: { gte: range.start, lt: range.end } },
      include: { category: true },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return NextResponse.json({
    year: yearParsed.data,
    categories: categories.map((row) => ({
      id: row.id,
      label: row.label,
      color: row.color,
      isSystem: row.isSystem,
      sortOrder: row.sortOrder,
    })),
    events: events.map(toEventResponse),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAnyApiAccess(request, [...CALENDAR_KEYS]);
  if ("response" in auth) return auth.response;

  const parsed = createEventSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event payload." }, { status: 400 });
  }

  const categoryId = parsed.data.categoryId ?? DEFAULT_EVENT_CATEGORY_ID;
  const category = await prisma.growthEventCategory.findUnique({ where: { id: categoryId } });
  if (!category) {
    return NextResponse.json({ error: "Event category not found." }, { status: 400 });
  }

  const username = auditUsername(auth.user);
  const event = await prisma.growthCalendarEvent.create({
    data: {
      member: parsed.data.member ?? "GIA_DINH",
      date: dateFromKey(parsed.data.date),
      text: parsed.data.text,
      note: parsed.data.note?.trim() ?? "",
      budgetAmount: parsed.data.budgetAmount ?? null,
      categoryId,
      createdBy: username,
      updatedBy: username,
    },
    include: { category: true },
  });

  return NextResponse.json({ event: toEventResponse(event) }, { status: 201 });
}
