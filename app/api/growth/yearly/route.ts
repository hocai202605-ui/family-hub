import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyApiAccess } from "@/lib/auth";
import { vietnamToday } from "@/lib/vietnam-date";
import {
  daysInUtcMonth,
  familyMemberSchema,
  formatDateKey,
  normalizeTop5,
  yearKeySchema,
  yearRange,
} from "../growth-utils";

export const dynamic = "force-dynamic";

function logHasContent(params: {
  reflection: string;
  top5Tasks: unknown;
  tickNoteCount: number;
}) {
  const hasReflection = params.reflection.trim().length > 0;
  const hasTask = normalizeTop5(params.top5Tasks).some((task) => task.text.trim().length > 0);
  return hasReflection || hasTask || params.tickNoteCount > 0;
}

/**
 * GET /api/growth/yearly?year=YYYY&member=CK
 * Year-wide totals for the calendar yearly report.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAnyApiAccess(request, ["calendar.yearly", "calendar"]);
  if ("response" in auth) return auth.response;

  try {
    const yearRaw = request.nextUrl.searchParams.get("year");
    const memberRaw = request.nextUrl.searchParams.get("member") ?? "CK";

    const yearParsed = yearKeySchema.safeParse(yearRaw);
    const memberParsed = familyMemberSchema.safeParse(memberRaw);

    if (!yearParsed.success) {
      return NextResponse.json({ error: "Invalid or missing year (YYYY)." }, { status: 400 });
    }
    if (!memberParsed.success) {
      return NextResponse.json({ error: "Invalid member." }, { status: 400 });
    }

    const year = yearParsed.data;
    const member = memberParsed.data;
    const range = yearRange(year);
    if (!range) {
      return NextResponse.json({ error: "Invalid year." }, { status: 400 });
    }

    const yearNumber = Number(year);
    const todayKey = vietnamToday();
    const currentYear = todayKey.slice(0, 4);
    const currentMonth = Number(todayKey.slice(5, 7));
    const currentDay = Number(todayKey.slice(8, 10));

    const [habits, planItems, dailyLogs, events] = await Promise.all([
      prisma.growthHabit.findMany({
        where: { member, month: { gte: `${year}-01`, lte: `${year}-12` } },
        include: { checks: true },
        orderBy: [{ month: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.growthPlanItem.findMany({
        where: { member, month: { gte: `${year}-01`, lte: `${year}-12` } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.growthDailyLog.findMany({
        where: { member, date: { gte: range.start, lt: range.end } },
        include: { tickNotes: true },
        orderBy: { date: "asc" },
      }),
      prisma.growthCalendarEvent.findMany({
        where: { member, date: { gte: range.start, lt: range.end } },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    const months = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;
      const daysInMonth = daysInUtcMonth(yearNumber, month);
      let countableDays = 0;
      if (year < currentYear) {
        countableDays = daysInMonth;
      } else if (year === currentYear) {
        if (month < currentMonth) countableDays = daysInMonth;
        else if (month === currentMonth) countableDays = currentDay;
      }

      const monthHabits = habits.filter((habit) => habit.month === monthKey);
      let habitDone = 0;
      for (const habit of monthHabits) {
        for (const check of habit.checks) {
          if (!check.completed) continue;
          const checkDate = new Date(check.weekStart);
          checkDate.setUTCDate(checkDate.getUTCDate() + check.dayIndex);
          if (formatDateKey(checkDate).startsWith(monthKey)) {
            habitDone += 1;
          }
        }
      }

      const monthLogs = dailyLogs.filter((log) => formatDateKey(log.date).startsWith(monthKey));
      const logDays = monthLogs.filter((log) =>
        logHasContent({
          reflection: log.reflection,
          top5Tasks: log.top5Tasks,
          tickNoteCount: log.tickNotes.length,
        }),
      ).length;

      const monthPlans = planItems.filter((item) => item.month === monthKey);

      return {
        month,
        monthKey,
        habitDone,
        habitTotal: monthHabits.length * countableDays,
        eventCount: events.filter((event) => formatDateKey(event.date).startsWith(monthKey)).length,
        logDays,
        planDone: monthPlans.filter((item) => item.isCompleted).length,
        planTotal: monthPlans.length,
      };
    });

    const habitByName = new Map<string, { name: string; color: string; done: number; total: number }>();
    for (const monthRow of months) {
      const monthHabits = habits.filter((habit) => habit.month === monthRow.monthKey);
      const daysPerHabit = monthHabits.length > 0 ? Math.round(monthRow.habitTotal / monthHabits.length) : 0;
      for (const habit of monthHabits) {
        let done = 0;
        for (const check of habit.checks) {
          if (!check.completed) continue;
          const checkDate = new Date(check.weekStart);
          checkDate.setUTCDate(checkDate.getUTCDate() + check.dayIndex);
          if (formatDateKey(checkDate).startsWith(monthRow.monthKey)) {
            done += 1;
          }
        }
        const current = habitByName.get(habit.name) ?? {
          name: habit.name,
          color: habit.color,
          done: 0,
          total: 0,
        };
        current.done += done;
        current.total += daysPerHabit;
        current.color = habit.color;
        habitByName.set(habit.name, current);
      }
    }

    const summary = months.reduce(
      (acc, row) => {
        acc.habitDone += row.habitDone;
        acc.habitTotal += row.habitTotal;
        acc.eventCount += row.eventCount;
        acc.logDays += row.logDays;
        acc.planDone += row.planDone;
        acc.planTotal += row.planTotal;
        return acc;
      },
      { habitDone: 0, habitTotal: 0, eventCount: 0, logDays: 0, planDone: 0, planTotal: 0 },
    );

    return NextResponse.json({
      member,
      year,
      months,
      habits: Array.from(habitByName.values()).sort((a, b) => b.done - a.done || a.name.localeCompare(b.name, "vi")),
      events: events.map((event) => ({
        id: event.id,
        date: formatDateKey(event.date),
        text: event.text,
      })),
      summary,
    });
  } catch (error) {
    console.error("[GET /api/growth/yearly]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load yearly growth data.",
      },
      { status: 500 },
    );
  }
}
