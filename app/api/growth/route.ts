import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAccess } from "@/lib/auth";
import {
  dateFromKey,
  dayLabelForDateKey,
  familyMemberSchema,
  formatDateKey,
  mondaysInMonthKeys,
  monthKeySchema,
  normalizeTop5,
} from "./growth-utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/growth?month=YYYY-MM&member=CK
 * Full month snapshot for the Personal Growth / calendar UI.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request, "calendar");
  if ("response" in auth) return auth.response;

  try {
  const monthRaw = request.nextUrl.searchParams.get("month");
  const memberRaw = request.nextUrl.searchParams.get("member") ?? "CK";

  const monthParsed = monthKeySchema.safeParse(monthRaw);
  const memberParsed = familyMemberSchema.safeParse(memberRaw);

  if (!monthParsed.success) {
    return NextResponse.json({ error: "Invalid or missing month (YYYY-MM)." }, { status: 400 });
  }
  if (!memberParsed.success) {
    return NextResponse.json({ error: "Invalid member." }, { status: 400 });
  }

  const month = monthParsed.data;
  const member = memberParsed.data;
  const [y, m] = month.split("-").map(Number);
  const monthStart = dateFromKey(`${month}-01`);
  const monthEnd = new Date(Date.UTC(y, m, 1)); // exclusive

  const weekStarts = mondaysInMonthKeys(month);

  const [habits, planItems, dailyLogs, events] = await Promise.all([
    prisma.growthHabit.findMany({
      where: { member, month },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { checks: true },
    }),
    prisma.growthPlanItem.findMany({
      where: { member, month },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.growthDailyLog.findMany({
      where: {
        member,
        date: { gte: monthStart, lt: monthEnd },
      },
      include: { tickNotes: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
      orderBy: { date: "asc" },
    }),
    prisma.growthCalendarEvent.findMany({
      where: {
        member,
        date: { gte: monthStart, lt: monthEnd },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const habitDefs = habits.map((habit) => ({
    id: habit.id,
    name: habit.name,
    color: habit.color,
  }));

  const weeks: Record<
    string,
    {
      weekStart: string;
      habitChecks: Record<string, boolean[]>;
      weeklyPlan: Array<{ id: string; text: string; isCompleted: boolean }>;
      weeklyLog: Array<{
        date: string;
        dayLabel: string;
        top5Tasks: Array<{ id: string; text: string; isCompleted: boolean }>;
        tickNotes: Array<{ id: string; text: string; isCompleted: boolean }>;
        reflection: string;
      }>;
    }
  > = {};

  for (const weekStart of weekStarts) {
    const habitChecks: Record<string, boolean[]> = {};
    for (const habit of habits) {
      const checks = [false, false, false, false, false, false, false];
      for (const row of habit.checks) {
        if (formatDateKey(row.weekStart) !== weekStart) continue;
        if (row.dayIndex >= 0 && row.dayIndex <= 6) {
          checks[row.dayIndex] = row.completed;
        }
      }
      habitChecks[habit.id] = checks;
    }

    const weeklyPlan = planItems
      .filter((item) => item.scope === "week" && item.weekStart && formatDateKey(item.weekStart) === weekStart)
      .map((item) => ({
        id: item.id,
        text: item.text,
        isCompleted: item.isCompleted,
      }));

    const start = dateFromKey(weekStart);
    const weeklyLog = Array.from({ length: 7 }, (_, index) => {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + index);
      const dateKey = formatDateKey(d);
      const log = dailyLogs.find((row) => formatDateKey(row.date) === dateKey);
      return {
        date: dateKey,
        dayLabel: dayLabelForDateKey(dateKey),
        top5Tasks: normalizeTop5(log?.top5Tasks),
        tickNotes: (log?.tickNotes ?? []).map((note) => ({
          id: note.id,
          text: note.text,
          isCompleted: note.isCompleted,
        })),
        reflection: log?.reflection ?? "",
      };
    });

    weeks[weekStart] = {
      weekStart,
      habitChecks,
      weeklyPlan,
      weeklyLog,
    };
  }

  const monthlyPlan = planItems
    .filter((item) => item.scope === "month")
    .map((item) => ({
      id: item.id,
      text: item.text,
      isCompleted: item.isCompleted,
    }));

  return NextResponse.json({
    member,
    month,
    habits: habitDefs,
    months: {
      [month]: {
        monthlyPlan,
        habits: habitDefs,
        weeks,
      },
    },
    events: events.map((event) => ({
      id: event.id,
      date: formatDateKey(event.date),
      text: event.text,
    })),
  });
  } catch (error) {
    console.error("[GET /api/growth]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load growth data.",
      },
      { status: 500 },
    );
  }
}
