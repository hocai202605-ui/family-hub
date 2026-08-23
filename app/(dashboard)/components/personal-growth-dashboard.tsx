"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiCreateEvent,
  apiCreateHabit,
  apiCreatePlanItem,
  apiCreateTickNote,
  apiDeleteEvent,
  apiDeleteHabit,
  apiDeletePlanItem,
  apiDeleteTickNote,
  apiPutHabitCheck,
  apiUpdateHabit,
  apiUpdatePlanItem,
  apiUpdateTickNote,
  apiUpsertDailyLog,
  fetchGrowthMonth,
} from "@/lib/growth-api";
import { lunarFullLabelFromDateKey, lunarLabelFromDateKey } from "@/lib/lunar-date";
import { holidaysByDateInMonth, holidaysOnDate } from "@/lib/vietnam-holidays";
import { vietnamCurrentMonth, vietnamToday } from "@/lib/vietnam-date";
import { Icon } from "./icons";

export type FamilyMember = "CK" | "VK" | "CON";
type HabitColor = "amber" | "emerald" | "sky" | "violet" | "rose" | "slate";
type PlanTab = "week" | "month";

type CalendarEvent = {
  id: string;
  date: string;
  text: string;
};

type UpcomingNotice = {
  id: string;
  eventId: string;
  date: string;
  text: string;
  daysLeft: number;
};

/** Habit definition — shared for the whole month. */
type HabitDef = {
  id: string;
  name: string;
  color: HabitColor | string;
};

/** Habit row in the week table (definition + that week's checks). */
type HabitRow = HabitDef & {
  checks: boolean[];
};

type Top5Task = {
  id: string;
  text: string;
  isCompleted: boolean;
};

type TickNote = {
  id: string;
  text: string;
  isCompleted: boolean;
};

type PlanItem = {
  id: string;
  text: string;
  isCompleted: boolean;
};

type DailyLog = {
  date: string;
  dayLabel: string;
  top5Tasks: Top5Task[];
  tickNotes: TickNote[];
  reflection: string;
};

/** Local draft for one day (Top5 + tick-notes + reflection) before batch save. */
type DayDraft = {
  top5Tasks: Top5Task[];
  tickNotes: TickNote[];
  deletedTickNoteIds: string[];
  reflection: string;
};

type WeekData = {
  weekStart: string;
  weeklyPlan: PlanItem[];
  /** Checks for the selected week, keyed by month-level habit id. */
  habitChecks: Record<string, boolean[]>;
  weeklyLog: DailyLog[];
};

type MonthData = {
  monthlyPlan: PlanItem[];
  /** Habit list for the whole month (not per-week). */
  habits: HabitDef[];
  weeks: Record<string, WeekData>;
};

type MemberGrowth = {
  months: Record<string, MonthData>;
  events: CalendarEvent[];
};

export type MockGrowthFile = {
  activeMember: FamilyMember;
  byMember: Record<FamilyMember, MemberGrowth>;
};

const DAY_HEADERS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;
const DAY_LABELS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"] as const;

const DEFAULT_HABITS: HabitDef[] = [
  { id: "h1", name: "Đọc sách", color: "amber" },
  { id: "h2", name: "Tập thể dục", color: "emerald" },
  { id: "h3", name: "Dậy sớm", color: "sky" },
  { id: "h4", name: "Uống đủ nước", color: "violet" },
];

const EMPTY_CHECKS = [false, false, false, false, false, false, false];

const memberMeta: Record<FamilyMember, { role: string; badge: string }> = {
  CK: { role: "Chồng", badge: "bg-blue-50 text-blue-700 ring-blue-100" },
  VK: { role: "Vợ", badge: "bg-pink-50 text-pink-700 ring-pink-100" },
  CON: { role: "Con", badge: "bg-lime-50 text-lime-700 ring-lime-100" },
};

const habitDot: Record<HabitColor, string> = {
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  slate: "bg-slate-500",
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseDateKey(key: string) {
  return new Date(`${key}T12:00:00`);
}

function toMonthKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function shiftMonth(monthKey: string, delta: number) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1, 12, 0, 0);
  return toMonthKey(d);
}

function formatMonthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  return `Tháng ${m}/${y}`;
}

/** Monday of the ISO-style week containing date (Mon–Sun). */
function mondayOf(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatWeekRange(weekStart: string) {
  const start = parseDateKey(weekStart);
  const end = addDays(start, 6);
  const fmt = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

/** Week index within month (1-based). Uses first day of the week that falls in the month. */
function weekOfMonth(weekStart: string, monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const start = parseDateKey(weekStart);
  let ref = start;
  for (let i = 0; i < 7; i += 1) {
    const d = addDays(start, i);
    if (d.getFullYear() === y && d.getMonth() === m - 1) {
      ref = d;
      break;
    }
  }
  return Math.ceil(ref.getDate() / 7);
}

/** Mondays for weeks that touch the given month (YYYY-MM). */
function mondaysInMonth(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const first = new Date(y, m - 1, 1, 12, 0, 0);
  const last = new Date(y, m, 0, 12, 0, 0);
  let cursor = mondayOf(first);
  const list: string[] = [];
  const stop = addDays(last, 7);

  while (cursor <= stop) {
    const weekEnd = addDays(cursor, 6);
    const touchesMonth = cursor <= last && weekEnd >= first;
    if (touchesMonth) {
      list.push(toDateKey(cursor));
    }
    cursor = addDays(cursor, 7);
    if (list.length >= 6) break;
  }

  return list;
}

function isToday(date: string) {
  return date === toDateKey(new Date());
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyDailyLog(date: string, dayLabel: string): DailyLog {
  return {
    date,
    dayLabel,
    top5Tasks: Array.from({ length: 5 }, (_, index) => ({
      id: createId(`t-${date}-${index}`),
      text: "",
      isCompleted: false,
    })),
    tickNotes: [],
    reflection: "",
  };
}

function emptyWeek(weekStart: string, habitIds: string[] = []): WeekData {
  const habitChecks: Record<string, boolean[]> = {};
  for (const id of habitIds) {
    habitChecks[id] = [...EMPTY_CHECKS];
  }
  return {
    weekStart,
    weeklyPlan: [],
    habitChecks,
    weeklyLog: [],
  };
}

function emptyMonth(): MonthData {
  return {
    monthlyPlan: [],
    habits: [],
    weeks: {},
  };
}

function monthHabitDefs(month: MonthData): HabitDef[] {
  if (month.habits?.length) return month.habits;
  return [];
}

function weekChecksForHabits(week: WeekData, habits: HabitDef[]): Record<string, boolean[]> {
  const next: Record<string, boolean[]> = { ...(week.habitChecks ?? {}) };
  // Legacy: habits with checks on week
  const legacy = (week as WeekData & { habits?: HabitRow[] }).habits;
  if (legacy?.length) {
    for (const habit of legacy) {
      next[habit.id] = ensureSevenChecks(habit.checks);
    }
  }
  for (const habit of habits) {
    if (!next[habit.id]) next[habit.id] = [...EMPTY_CHECKS];
    else next[habit.id] = ensureSevenChecks(next[habit.id]);
  }
  return next;
}

function habitRowsForWeek(month: MonthData, week: WeekData): HabitRow[] {
  const habits = monthHabitDefs(month);
  const checks = weekChecksForHabits(week, habits);
  return habits.map((habit) => ({
    ...habit,
    checks: checks[habit.id] ?? [...EMPTY_CHECKS],
  }));
}

function clonePlanItems(items: PlanItem[] | undefined) {
  return (items ?? []).map((item) => ({ ...item }));
}

function cloneHabitChecks(checks: Record<string, boolean[]> | undefined) {
  const next: Record<string, boolean[]> = {};
  for (const [id, value] of Object.entries(checks ?? {})) {
    next[id] = ensureSevenChecks(value ?? []);
  }
  return next;
}

function cloneWeek(week: WeekData): WeekData {
  return {
    weekStart: week.weekStart,
    weeklyPlan: clonePlanItems(week.weeklyPlan),
    habitChecks: cloneHabitChecks(week.habitChecks),
    weeklyLog: week.weeklyLog.map((day) => ({
      ...day,
      top5Tasks: day.top5Tasks.map((task) => ({ ...task })),
      tickNotes: day.tickNotes.map((note) => ({ ...note })),
    })),
  };
}

function cloneMember(source: MemberGrowth): MemberGrowth {
  const months: Record<string, MonthData> = {};
  for (const [monthKey, month] of Object.entries(source.months ?? {})) {
    const weeks: Record<string, WeekData> = {};
    for (const [weekKey, week] of Object.entries(month.weeks ?? {})) {
      weeks[weekKey] = cloneWeek(week as WeekData);
    }
    // Support legacy mock shape: habits nested under weeks.
    let habits: HabitDef[] = (month.habits ?? []).map((habit) => ({ ...habit }));
    if (habits.length === 0) {
      for (const week of Object.values(month.weeks ?? {})) {
        const legacy = (week as WeekData & { habits?: HabitRow[] }).habits;
        if (legacy?.length) {
          habits = legacy.map((h) => ({ id: h.id, name: h.name, color: h.color }));
          break;
        }
      }
    }
    months[monthKey] = {
      monthlyPlan: clonePlanItems(month.monthlyPlan),
      habits,
      weeks,
    };
  }
  return {
    months,
    events: (source.events ?? []).map((event) => ({ ...event })),
  };
}

function daysBetween(fromKey: string, toKey: string) {
  const from = parseDateKey(fromKey).getTime();
  const to = parseDateKey(toKey).getTime();
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

function buildMonthCells(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const first = new Date(y, m - 1, 1, 12, 0, 0);
  const start = mondayOf(first);
  const cells: Array<{ dateKey: string; inMonth: boolean; solarDay: number; lunarLabel: string }> = [];
  let cursor = new Date(start);
  for (let i = 0; i < 42; i += 1) {
    const dateKey = toDateKey(cursor);
    cells.push({
      dateKey,
      inMonth: cursor.getMonth() === m - 1 && cursor.getFullYear() === y,
      solarDay: cursor.getDate(),
      lunarLabel: lunarLabelFromDateKey(dateKey),
    });
    cursor = addDays(cursor, 1);
  }
  // Drop trailing week if entirely outside month
  const lastWeek = cells.slice(35);
  if (lastWeek.every((cell) => !cell.inMonth)) {
    return cells.slice(0, 35);
  }
  return cells;
}

function ensureSevenChecks(checks: boolean[]): boolean[] {
  const next = checks.slice(0, 7);
  while (next.length < 7) next.push(false);
  return next;
}

function emptyTop5Slots(): Top5Task[] {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `slot-${index + 1}`,
    text: "",
    isCompleted: false,
  }));
}

function normalizeDayTop5(tasks: Top5Task[] | undefined): Top5Task[] {
  const base = emptyTop5Slots();
  if (!tasks?.length) return base;
  return base.map((slot, index) => {
    const task = tasks[index];
    if (!task) return slot;
    return {
      id: task.id || slot.id,
      text: task.text ?? "",
      isCompleted: Boolean(task.isCompleted),
    };
  });
}

function buildDayDraft(log: DailyLog | undefined): DayDraft {
  return {
    top5Tasks: normalizeDayTop5(log?.top5Tasks),
    tickNotes: (log?.tickNotes ?? []).map((note) => ({ ...note })),
    deletedTickNoteIds: [],
    reflection: log?.reflection ?? "",
  };
}

function dayDraftFingerprint(draft: DayDraft): string {
  return JSON.stringify({
    top5Tasks: draft.top5Tasks.map((task) => ({
      id: task.id,
      text: task.text,
      isCompleted: task.isCompleted,
    })),
    tickNotes: draft.tickNotes.map((note) => ({
      id: note.id,
      text: note.text,
      isCompleted: note.isCompleted,
    })),
    deletedTickNoteIds: [...draft.deletedTickNoteIds].sort(),
    reflection: draft.reflection,
  });
}

function isDayDraftDirty(draft: DayDraft, server: DailyLog | undefined): boolean {
  return dayDraftFingerprint(draft) !== dayDraftFingerprint(buildDayDraft(server));
}

function isTempId(id: string) {
  return id.startsWith("temp-");
}

function isLegacyDefaultHabitId(id: string) {
  return DEFAULT_HABITS.some((habit) => habit.id === id);
}

function planItemsFingerprint(items: PlanItem[]): string {
  return JSON.stringify(
    items.map((item) => ({ id: item.id, text: item.text, isCompleted: item.isCompleted })),
  );
}

function planProgressOf(items: PlanItem[]) {
  const total = items.length;
  const done = items.filter((item) => item.isCompleted).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  return { done, total, percent };
}

function scaffoldDailyLog(weekStart: string): DailyLog[] {
  const start = parseDateKey(weekStart);
  return DAY_LABELS.map((dayLabel, index) => {
    const d = addDays(start, index);
    return emptyDailyLog(toDateKey(d), dayLabel);
  });
}

function pickInitialMonth(member: MemberGrowth) {
  const keys = Object.keys(member.months ?? {}).sort();
  if (keys.length === 0) return toMonthKey(new Date());
  const current = toMonthKey(new Date());
  if (keys.includes(current)) return current;
  return keys[keys.length - 1];
}

function pickInitialWeek(member: MemberGrowth, monthKey: string) {
  const mondays = mondaysInMonth(monthKey);
  const todayMonday = toDateKey(mondayOf(new Date()));
  if (mondays.includes(todayMonday)) return todayMonday;
  const weekKeys = Object.keys(member.months?.[monthKey]?.weeks ?? {}).sort();
  if (weekKeys.length > 0) {
    const preferred = weekKeys.find((k) => mondays.includes(k));
    if (preferred) return preferred;
  }
  return mondays[0] ?? todayMonday;
}

export function PersonalGrowthDashboard({ defaultMember }: { defaultMember: FamilyMember }) {
  const [member] = useState<FamilyMember>(defaultMember);
  const [store, setStore] = useState<MemberGrowth>({ months: {}, events: [] });
  const [selectedMonth, setSelectedMonth] = useState(() => vietnamCurrentMonth());
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const month = vietnamCurrentMonth();
    const mondays = mondaysInMonth(month);
    const todayMonday = toDateKey(mondayOf(new Date()));
    return mondays.includes(todayMonday) ? todayMonday : mondays[0] ?? todayMonday;
  });
  const [planTab, setPlanTab] = useState<PlanTab>("week");
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState<Record<string, string>>({});
  const [draftPlan, setDraftPlan] = useState("");
  const [calendarDay, setCalendarDay] = useState<string | null>(null);
  const [draftEvent, setDraftEvent] = useState("");
  const [notices, setNotices] = useState<UpcomingNotice[]>([]);
  const [noticeDismissed, setNoticeDismissed] = useState<Record<string, boolean>>({});
  const [bellOpen, setBellOpen] = useState(false);
  const [editingHabits, setEditingHabits] = useState(false);
  const [draftHabitName, setDraftHabitName] = useState("");
  const [habitNameDrafts, setHabitNameDrafts] = useState<Record<string, string>>({});
  /** Pending habit checks: key = weekStart:habitId:dayIndex */
  const [habitCheckDrafts, setHabitCheckDrafts] = useState<Record<string, boolean>>({});
  /** Plan item drafts keyed by week:YYYY-MM-DD or month:YYYY-MM */
  const [planItemDrafts, setPlanItemDrafts] = useState<Record<string, PlanItem[]>>({});
  const [planDeletedIds, setPlanDeletedIds] = useState<Record<string, string[]>>({});
  /** Day log drafts keyed by date YYYY-MM-DD */
  const [dayDrafts, setDayDrafts] = useState<Record<string, DayDraft>>({});
  const [isBusy, setIsBusy] = useState(false);
  const [isLoadingMonth, setIsLoadingMonth] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [flashNotice, setFlashNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: "danger" | "default";
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const reloadMonth = useCallback(
    async (monthKey: string) => {
      const data = await fetchGrowthMonth(monthKey, member);
      const monthBundle = data.months[monthKey] ?? {
        monthlyPlan: [],
        habits: data.habits ?? [],
        weeks: {},
      };
      setStore((current) => {
        const otherEvents = (current.events ?? []).filter((event) => event.date.slice(0, 7) !== monthKey);
        return {
          months: {
            ...current.months,
            [monthKey]: {
              monthlyPlan: monthBundle.monthlyPlan ?? [],
              habits: monthBundle.habits ?? data.habits ?? [],
              weeks: monthBundle.weeks ?? {},
            },
          },
          events: [...otherEvents, ...(data.events ?? [])],
        };
      });
    },
    [member],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingMonth(true);
      setLoadError(null);
      try {
        await reloadMonth(selectedMonth);
        const currentMonth = vietnamCurrentMonth();
        if (currentMonth !== selectedMonth) {
          await reloadMonth(currentMonth);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Không tải được dữ liệu.");
        }
      } finally {
        if (!cancelled) setIsLoadingMonth(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedMonth, reloadMonth]);

  const monthMondays = useMemo(() => mondaysInMonth(selectedMonth), [selectedMonth]);

  // Keep week inside selected month when month changes.
  const activeWeekStart = monthMondays.includes(selectedWeekStart)
    ? selectedWeekStart
    : monthMondays[0] ?? selectedWeekStart;

  const monthData = store.months[selectedMonth] ?? emptyMonth();
  const monthHabits = monthHabitDefs(monthData);
  const weekData =
    monthData.weeks[activeWeekStart] ??
    emptyWeek(
      activeWeekStart,
      monthHabits.map((habit) => habit.id),
    );
  const weekNumber = weekOfMonth(activeWeekStart, selectedMonth);

  const habits = habitRowsForWeek(monthData, weekData);
  const weeklyPlan = weekData.weeklyPlan ?? [];
  const monthlyPlan = monthData.monthlyPlan ?? [];
  const planScopeKeyValue =
    planTab === "week" ? `week:${activeWeekStart}` : `month:${selectedMonth}`;
  const serverActivePlan = planTab === "week" ? weeklyPlan : monthlyPlan;
  const activePlan = planItemDrafts[planScopeKeyValue] ?? serverActivePlan;
  const planProgress = useMemo(() => planProgressOf(activePlan), [activePlan]);
  const planDirty = useMemo(() => {
    const draftItems = planItemDrafts[planScopeKeyValue];
    if (!draftItems) return false;
    return planItemsFingerprint(draftItems) !== planItemsFingerprint(serverActivePlan);
  }, [planItemDrafts, planScopeKeyValue, serverActivePlan]);

  const habitProgress = useMemo(() => {
    const checks = habits.flatMap((habit) =>
      ensureSevenChecks(habit.checks).map((checked, dayIndex) => {
        const key = `${activeWeekStart}:${habit.id}:${dayIndex}`;
        return key in habitCheckDrafts ? habitCheckDrafts[key] : checked;
      }),
    );
    const total = checks.length;
    const done = checks.filter(Boolean).length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    return { done, total, percent };
  }, [habits, habitCheckDrafts, activeWeekStart]);

  const weeklyLog = useMemo(() => {
    if (weekData.weeklyLog.length > 0) return weekData.weeklyLog;
    return scaffoldDailyLog(activeWeekStart);
  }, [weekData.weeklyLog, activeWeekStart]);

  const resolvedOpenDate = openDate && weeklyLog.some((d) => d.date === openDate)
    ? openDate
    : weeklyLog.find((d) => isToday(d.date))?.date ?? weeklyLog[0]?.date ?? null;

  const allEvents = store.events ?? [];
  const todayKey = vietnamToday();

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of allEvents) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [allEvents]);

  const monthEventList = useMemo(() => {
    return allEvents
      .filter((event) => event.date.slice(0, 7) === selectedMonth)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.text.localeCompare(b.text));
  }, [allEvents, selectedMonth]);

  const monthCells = useMemo(() => buildMonthCells(selectedMonth), [selectedMonth]);

  const holidaysByDate = useMemo(() => holidaysByDateInMonth(selectedMonth), [selectedMonth]);

  // Notify remaining events in the current calendar month (skip dates already past).
  const currentMonthKey = todayKey.slice(0, 7);
  const upcomingEvents = useMemo(() => {
    return allEvents
      .map((event) => ({
        ...event,
        daysLeft: daysBetween(todayKey, event.date),
      }))
      .filter(
        (event) =>
          event.daysLeft >= 0 && event.date.slice(0, 7) === currentMonthKey,
      )
      .sort((a, b) => a.daysLeft - b.daysLeft || a.date.localeCompare(b.date));
  }, [allEvents, todayKey, currentMonthKey]);

  const upcomingDateSet = useMemo(
    () => new Set(upcomingEvents.map((event) => event.date)),
    [upcomingEvents],
  );

  // Bell notices: remaining events this month.
  useEffect(() => {
    setNotices(
      upcomingEvents.map((event) => ({
        id: `notice-${event.id}`,
        eventId: event.id,
        date: event.date,
        text: event.text,
        daysLeft: event.daysLeft,
      })),
    );
  }, [upcomingEvents]);

  const visibleNotices = notices.filter((notice) => !noticeDismissed[notice.id]);
  const dayEvents = calendarDay ? eventsByDate.get(calendarDay) ?? [] : [];
  const dayHolidays = calendarDay ? holidaysOnDate(calendarDay) : [];

  function updateMonth(updater: (month: MonthData) => MonthData) {
    setStore((current) => {
      const prev = current.months[selectedMonth] ?? emptyMonth();
      return {
        ...current,
        months: {
          ...current.months,
          [selectedMonth]: updater(prev),
        },
      };
    });
  }

  function updateWeek(updater: (week: WeekData) => WeekData) {
    updateMonth((month) => {
      const defs = monthHabitDefs(month);
      const prev =
        month.weeks[activeWeekStart] ??
        emptyWeek(
          activeWeekStart,
          defs.map((habit) => habit.id),
        );
      return {
        ...month,
        weeks: {
          ...month.weeks,
          [activeWeekStart]: updater(prev),
        },
      };
    });
  }

  function goMonth(delta: number) {
    const next = shiftMonth(selectedMonth, delta);
    setSelectedMonth(next);
    const mondays = mondaysInMonth(next);
    setSelectedWeekStart(mondays[0] ?? selectedWeekStart);
    setOpenDate(null);
    setDraftPlan("");
  }

  function selectWeek(weekStart: string) {
    setSelectedWeekStart(weekStart);
    setOpenDate(null);
    setDraftPlan("");
  }

  useEffect(() => {
    if (!flashNotice) return;
    const timer = window.setTimeout(() => setFlashNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [flashNotice]);

  function showFlash(type: "success" | "error", message: string) {
    setFlashNotice({ type, message });
  }


  async function runSave(action: () => Promise<void>, successMessage: string) {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await action();
      showFlash("success", successMessage);
    } catch (error) {
      showFlash("error", error instanceof Error ? error.message : "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setIsBusy(false);
    }
  }

  function askConfirm(options: {
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: "danger" | "default";
    successMessage: string;
    action: () => void | Promise<void>;
  }) {
    if (isBusy) return;
    setConfirmDialog({
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel,
      tone: options.tone,
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsBusy(true);
        try {
          await options.action();
          showFlash("success", options.successMessage);
        } catch (error) {
          showFlash("error", error instanceof Error ? error.message : "Có lỗi xảy ra. Vui lòng thử lại.");
        } finally {
          setIsBusy(false);
        }
      },
    });
  }

  function habitCheckKey(weekStart: string, habitId: string, dayIndex: number) {
    return `${weekStart}:${habitId}:${dayIndex}`;
  }

  function getHabitChecked(habitId: string, dayIndex: number, serverChecked: boolean) {
    const key = habitCheckKey(activeWeekStart, habitId, dayIndex);
    return key in habitCheckDrafts ? habitCheckDrafts[key] : serverChecked;
  }

  function habitChecksDirtyForWeek(weekStart: string) {
    const prefix = `${weekStart}:`;
    return Object.keys(habitCheckDrafts).some((key) => key.startsWith(prefix));
  }

  function toggleHabitCheckLocal(habitId: string, dayIndex: number, serverChecked: boolean) {
    if (isBusy || editingHabits) return;
    const key = habitCheckKey(activeWeekStart, habitId, dayIndex);
    const currentlyChecked = getHabitChecked(habitId, dayIndex, serverChecked);
    const next = !currentlyChecked;
    setHabitCheckDrafts((current) => {
      const copy = { ...current };
      if (next === serverChecked) delete copy[key];
      else copy[key] = next;
      return copy;
    });
  }

  function clearHabitDraftsForWeek(weekStart: string) {
    const prefix = `${weekStart}:`;
    setHabitCheckDrafts((current) => {
      const next: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(current)) {
        if (!key.startsWith(prefix)) next[key] = value;
      }
      return next;
    });
  }

  function saveHabitChecks() {
    if (!habitChecksDirtyForWeek(activeWeekStart)) return;
    void runSave(async () => {
      const prefix = `${activeWeekStart}:`;
      const ops: Promise<unknown>[] = [];
      for (const [key, completed] of Object.entries(habitCheckDrafts)) {
        if (!key.startsWith(prefix)) continue;
        // key = "YYYY-MM-DD:habitId:dayIndex" (date uses dashes, separators are colons)
        const parts = key.split(":");
        const weekStartKey = parts[0];
        const dayIndex = Number(parts[parts.length - 1]);
        const habitIdKey = parts.slice(1, -1).join(":");
        if (isLegacyDefaultHabitId(habitIdKey)) {
          clearHabitDraftsForWeek(activeWeekStart);
          await reloadMonth(selectedMonth);
          throw new Error("Đã đồng bộ thói quen thật. Vui lòng tick lại rồi lưu.");
        }
        ops.push(
          apiPutHabitCheck({
            habitId: habitIdKey,
            weekStart: weekStartKey,
            dayIndex,
            completed,
          }),
        );
      }
      await Promise.all(ops);
      clearHabitDraftsForWeek(activeWeekStart);
      await reloadMonth(selectedMonth);
    }, "Đã lưu thói quen tuần.");
  }

  function addHabit() {
    const name = draftHabitName.trim() || "Thói quen mới";
    const colors: HabitColor[] = ["amber", "emerald", "sky", "violet", "rose", "slate"];
    const color = colors[monthHabits.length % colors.length];
    askConfirm({
      title: "Thêm thói quen",
      message: `Thêm thói quen "${name}" cho cả tháng ${formatMonthLabel(selectedMonth)}?`,
      confirmLabel: "Thêm",
      successMessage: "Đã thêm thói quen thành công.",
      action: async () => {
        await apiCreateHabit({
          member,
          month: selectedMonth,
          name,
          color,
        });
        setDraftHabitName("");
        setEditingHabits(true);
        await reloadMonth(selectedMonth);
      },
    });
  }

  function commitHabitRename(habitId: string, previousName: string) {
    const nextName = (habitNameDrafts[habitId] ?? previousName).trim();
    if (!nextName || nextName === previousName) {
      setHabitNameDrafts((current) => {
        const copy = { ...current };
        delete copy[habitId];
        return copy;
      });
      return;
    }
    askConfirm({
      title: "Sửa thói quen",
      message: `Đổi tên thói quen thành "${nextName}"?`,
      confirmLabel: "Lưu",
      successMessage: "Đã cập nhật tên thói quen.",
      action: async () => {
        if (isLegacyDefaultHabitId(habitId)) {
          await reloadMonth(selectedMonth);
          throw new Error("Đã đồng bộ thói quen thật. Vui lòng sửa lại.");
        }
        await apiUpdateHabit(habitId, { name: nextName });
        setHabitNameDrafts((current) => {
          const copy = { ...current };
          delete copy[habitId];
          return copy;
        });
        await reloadMonth(selectedMonth);
      },
    });
  }

  function removeHabit(habitId: string, habitName: string) {
    askConfirm({
      title: "Xóa thói quen",
      message: `Xóa thói quen "${habitName}" khỏi cả tháng? Dữ liệu tick các tuần sẽ mất.`,
      confirmLabel: "Xóa",
      tone: "danger",
      successMessage: "Đã xóa thói quen.",
      action: async () => {
        if (isLegacyDefaultHabitId(habitId)) {
          await reloadMonth(selectedMonth);
          throw new Error("Đã đồng bộ thói quen thật. Vui lòng xóa lại.");
        }
        await apiDeleteHabit(habitId);
        await reloadMonth(selectedMonth);
      },
    });
  }

  function setHabitColor(habitId: string, color: HabitColor, habitName: string) {
    askConfirm({
      title: "Sửa màu thói quen",
      message: `Đổi màu hiển thị cho "${habitName}"?`,
      confirmLabel: "Đổi màu",
      successMessage: "Đã cập nhật màu thói quen.",
      action: async () => {
        if (isLegacyDefaultHabitId(habitId)) {
          await reloadMonth(selectedMonth);
          throw new Error("Đã đồng bộ thói quen thật. Vui lòng đổi màu lại.");
        }
        await apiUpdateHabit(habitId, { color });
        await reloadMonth(selectedMonth);
      },
    });
  }

  function serverDayLog(date: string): DailyLog | undefined {
    return weeklyLog.find((day) => day.date === date);
  }

  function getDayDraft(date: string): DayDraft {
    return dayDrafts[date] ?? buildDayDraft(serverDayLog(date));
  }

  function ensureDayDraft(date: string) {
    setDayDrafts((current) => {
      if (current[date]) return current;
      return { ...current, [date]: buildDayDraft(serverDayLog(date)) };
    });
  }

  function updateDayDraft(date: string, updater: (draft: DayDraft) => DayDraft) {
    setDayDrafts((current) => {
      const base = current[date] ?? buildDayDraft(serverDayLog(date));
      return { ...current, [date]: updater(base) };
    });
  }

  function isDayDirty(date: string) {
    const draft = dayDrafts[date];
    if (!draft) return false;
    return isDayDraftDirty(draft, serverDayLog(date));
  }

  function setTop5Text(date: string, taskId: string, text: string) {
    updateDayDraft(date, (draft) => ({
      ...draft,
      top5Tasks: draft.top5Tasks.map((task) => (task.id === taskId ? { ...task, text } : task)),
    }));
  }

  function toggleTop5Local(date: string, taskId: string) {
    updateDayDraft(date, (draft) => ({
      ...draft,
      top5Tasks: draft.top5Tasks.map((task) =>
        task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task,
      ),
    }));
  }

  function toggleTickNoteLocal(date: string, noteId: string) {
    updateDayDraft(date, (draft) => ({
      ...draft,
      tickNotes: draft.tickNotes.map((note) =>
        note.id === noteId ? { ...note, isCompleted: !note.isCompleted } : note,
      ),
    }));
  }

  function removeTickNoteLocal(date: string, noteId: string) {
    updateDayDraft(date, (draft) => {
      const nextDeleted = isTempId(noteId)
        ? draft.deletedTickNoteIds
        : draft.deletedTickNoteIds.includes(noteId)
          ? draft.deletedTickNoteIds
          : [...draft.deletedTickNoteIds, noteId];
      return {
        ...draft,
        tickNotes: draft.tickNotes.filter((note) => note.id !== noteId),
        deletedTickNoteIds: nextDeleted,
      };
    });
  }

  function addTickNoteLocal(date: string) {
    const text = (draftNote[date] ?? "").trim();
    if (!text) return;
    updateDayDraft(date, (draft) => ({
      ...draft,
      tickNotes: [
        ...draft.tickNotes,
        { id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text, isCompleted: false },
      ],
    }));
    setDraftNote((current) => ({ ...current, [date]: "" }));
  }

  function setReflectionLocal(date: string, reflection: string) {
    updateDayDraft(date, (draft) => ({ ...draft, reflection }));
  }

  function saveDayLog(date: string) {
    const draft = getDayDraft(date);
    if (!isDayDraftDirty(draft, serverDayLog(date))) return;
    void runSave(async () => {
      await apiUpsertDailyLog({
        member,
        date,
        top5Tasks: draft.top5Tasks,
        reflection: draft.reflection,
      });

      const serverNotes = serverDayLog(date)?.tickNotes ?? [];
      const serverById = new Map(serverNotes.map((note) => [note.id, note]));

      for (const id of draft.deletedTickNoteIds) {
        if (!isTempId(id)) await apiDeleteTickNote(id);
      }

      for (const note of draft.tickNotes) {
        if (isTempId(note.id)) {
          const created = await apiCreateTickNote({ member, date, text: note.text });
          if (note.isCompleted) {
            await apiUpdateTickNote(created.note.id, { isCompleted: true });
          }
        } else {
          const prev = serverById.get(note.id);
          if (prev && prev.isCompleted !== note.isCompleted) {
            await apiUpdateTickNote(note.id, { isCompleted: note.isCompleted });
          }
        }
      }

      setDayDrafts((current) => {
        const copy = { ...current };
        delete copy[date];
        return copy;
      });
      await reloadMonth(selectedMonth);
    }, "Đã lưu nhật ký ngày.");
  }

  function planScopeKey() {
    return planTab === "week" ? `week:${activeWeekStart}` : `month:${selectedMonth}`;
  }

  function serverPlanItems(): PlanItem[] {
    return planTab === "week" ? weeklyPlan : monthlyPlan;
  }

  function getPlanDraftItems(): PlanItem[] {
    const key = planScopeKey();
    return planItemDrafts[key] ?? serverPlanItems().map((item) => ({ ...item }));
  }

  function isPlanDirty() {
    const key = planScopeKey();
    const draftItems = planItemDrafts[key];
    const deleted = planDeletedIds[key] ?? [];
    if (!draftItems && deleted.length === 0) return false;
    const items = draftItems ?? serverPlanItems();
    if (deleted.length > 0) return true;
    // Compare to server items that are not deleted (deleted already removed from draft)
    return planItemsFingerprint(items) !== planItemsFingerprint(serverPlanItems());
  }

  function updatePlanDraft(updater: (items: PlanItem[]) => PlanItem[]) {
    const key = planScopeKey();
    setPlanItemDrafts((current) => {
      const base = current[key] ?? serverPlanItems().map((item) => ({ ...item }));
      return { ...current, [key]: updater(base) };
    });
  }

  function togglePlanItemLocal(itemId: string) {
    updatePlanDraft((items) =>
      items.map((item) => (item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item)),
    );
  }

  function setPlanItemTextLocal(itemId: string, text: string) {
    updatePlanDraft((items) => items.map((item) => (item.id === itemId ? { ...item, text } : item)));
  }

  function addPlanItemLocal() {
    const text = draftPlan.trim();
    if (!text) return;
    updatePlanDraft((items) => [
      ...items,
      {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text,
        isCompleted: false,
      },
    ]);
    setDraftPlan("");
  }

  function removePlanItemLocal(itemId: string, itemText: string) {
    // Destructive: confirm then either drop temp or mark server id deleted + remove from draft
    if (isTempId(itemId)) {
      updatePlanDraft((items) => items.filter((item) => item.id !== itemId));
      return;
    }
    askConfirm({
      title: "Xóa mục kế hoạch",
      message: `Xóa "${itemText || "mục kế hoạch"}"?`,
      confirmLabel: "Xóa",
      tone: "danger",
      successMessage: "Đã xóa mục kế hoạch.",
      action: async () => {
        await apiDeletePlanItem(itemId);
        const key = planScopeKey();
        setPlanItemDrafts((current) => {
          if (!current[key]) return current;
          return { ...current, [key]: current[key].filter((item) => item.id !== itemId) };
        });
        await reloadMonth(selectedMonth);
      },
    });
  }

  function savePlan() {
    if (!isPlanDirty()) return;
    const key = planScopeKey();
    const draftItems = getPlanDraftItems();
    const serverItems = serverPlanItems();
    const serverById = new Map(serverItems.map((item) => [item.id, item]));

    void runSave(async () => {
      for (const item of draftItems) {
        if (isTempId(item.id)) {
          const text = item.text.trim();
          if (!text) continue;
          const created = await apiCreatePlanItem({
            member,
            scope: planTab,
            month: selectedMonth,
            weekStart: planTab === "week" ? activeWeekStart : null,
            text,
          });
          if (item.isCompleted) {
            await apiUpdatePlanItem(created.item.id, { isCompleted: true });
          }
        } else {
          const prev = serverById.get(item.id);
          if (!prev) continue;
          const patch: { text?: string; isCompleted?: boolean } = {};
          if (item.text !== prev.text) patch.text = item.text;
          if (item.isCompleted !== prev.isCompleted) patch.isCompleted = item.isCompleted;
          if (Object.keys(patch).length > 0) {
            await apiUpdatePlanItem(item.id, patch);
          }
        }
      }
      setPlanItemDrafts((current) => {
        const copy = { ...current };
        delete copy[key];
        return copy;
      });
      setPlanDeletedIds((current) => {
        const copy = { ...current };
        delete copy[key];
        return copy;
      });
      await reloadMonth(selectedMonth);
    }, "Đã lưu kế hoạch.");
  }


  function openCalendarDay(dateKey: string) {
    setCalendarDay(dateKey);
    setDraftEvent("");
    const monday = toDateKey(mondayOf(parseDateKey(dateKey)));
    if (monthMondays.includes(monday)) {
      setSelectedWeekStart(monday);
    }
  }

  function addCalendarEvent() {
    if (!calendarDay) return;
    const text = draftEvent.trim();
    if (!text) return;
    askConfirm({
      title: "Thêm sự kiện",
      message: `Thêm sự kiện "${text}" vào ngày ${calendarDay}?`,
      confirmLabel: "Thêm",
      successMessage: "Đã thêm sự kiện.",
      action: async () => {
        await apiCreateEvent({ member, date: calendarDay, text });
        setDraftEvent("");
        await reloadMonth(selectedMonth);
      },
    });
  }

  function removeCalendarEvent(eventId: string, eventText: string) {
    askConfirm({
      title: "Xóa sự kiện",
      message: `Xóa sự kiện "${eventText}"?`,
      confirmLabel: "Xóa",
      tone: "danger",
      successMessage: "Đã xóa sự kiện.",
      action: async () => {
        await apiDeleteEvent(eventId);
        await reloadMonth(selectedMonth);
      },
    });
  }

  function dismissNotice(noticeId: string) {
    setNoticeDismissed((current) => ({ ...current, [noticeId]: true }));
  }

  function daysLeftLabel(daysLeft: number) {
    if (daysLeft === 0) return "Hôm nay";
    if (daysLeft === 1) return "Còn 1 ngày";
    return `Còn ${daysLeft} ngày`;
  }

  const unreadNoticeCount = visibleNotices.length;

  return (
    <div className="relative flex w-full flex-col gap-6 px-2.5 py-4 sm:py-5">
      <header className="rounded-lg border border-amber-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-700">Lịch hằng ngày</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950">Thói quen & nhật ký ngày</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Chọn tháng / tuần để theo dõi thói quen, nhật ký ngày và kế hoạch. Nhập / tích xong rồi bấm Lưu từng khối.
            </p>
            {loadError ? (
              <p className="mt-2 text-sm font-semibold text-rose-600">{loadError}</p>
            ) : null}
            {isLoadingMonth ? (
              <p className="mt-2 text-sm font-medium text-slate-500">Đang tải dữ liệu tháng…</p>
            ) : null}
          </div>

          <div className="relative flex w-fit items-center gap-2 self-start sm:self-auto">
            <span
              className={cn(
                "inline-flex w-fit items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ring-1 ring-inset",
                memberMeta[member].badge,
              )}
            >
              <span className="h-2 w-2 rounded-full bg-current opacity-70" />
              {member} · {memberMeta[member].role}
            </span>

            {/* Notification bell — to the right of member chip */}
            <div className="relative">
              <button
                aria-expanded={bellOpen}
                aria-label={
                  unreadNoticeCount > 0
                    ? `Thông báo: ${unreadNoticeCount} sự kiện sắp tới`
                    : "Thông báo sự kiện"
                }
                className={cn(
                  "relative grid h-10 w-10 place-items-center rounded-md border transition",
                  bellOpen
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800",
                )}
                onClick={() => setBellOpen((open) => !open)}
                type="button"
              >
                <Icon className="h-5 w-5" name="bell" />
                {unreadNoticeCount > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                    {unreadNoticeCount > 9 ? "9+" : unreadNoticeCount}
                  </span>
                ) : null}
              </button>

              {bellOpen ? (
                <>
                  <button
                    aria-label="Đóng thông báo"
                    className="fixed inset-0 z-40 cursor-default bg-transparent"
                    onClick={() => setBellOpen(false)}
                    type="button"
                  />
                  <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl ring-1 ring-slate-100">
                    <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                      <p className="text-sm font-bold text-slate-900">Thông báo sự kiện</p>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {formatMonthLabel(currentMonthKey)}
                      </span>
                    </div>

                    {visibleNotices.length === 0 ? (
                      <p className="px-3 py-6 text-center text-xs text-slate-500">
                        Không còn sự kiện nào trong tháng này.
                      </p>
                    ) : (
                      <ul className="max-h-72 overflow-y-auto py-1">
                        {visibleNotices.map((notice) => (
                          <li className="border-b border-slate-50 last:border-0" key={notice.id}>
                            <div
                              className={cn(
                                "flex items-start gap-2 px-3 py-2.5",
                                notice.daysLeft <= 1
                                  ? "bg-rose-50"
                                  : notice.daysLeft <= 3
                                    ? "bg-orange-50"
                                    : "bg-amber-50/70",
                              )}
                            >
                              <button
                                className="min-w-0 flex-1 text-left"
                                onClick={() => {
                                  openCalendarDay(notice.date);
                                  setBellOpen(false);
                                  dismissNotice(notice.id);
                                }}
                                type="button"
                              >
                                <p
                                  className={cn(
                                    "inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold text-white",
                                    notice.daysLeft <= 1
                                      ? "bg-rose-500"
                                      : notice.daysLeft <= 3
                                        ? "bg-orange-500"
                                        : "bg-amber-500",
                                  )}
                                >
                                  {daysLeftLabel(notice.daysLeft)}
                                </p>
                                <p className="mt-1 text-sm font-bold text-slate-900">{notice.text}</p>
                                <p className="mt-0.5 text-xs font-medium text-slate-600">{notice.date}</p>
                              </button>
                              <button
                                aria-label="Đánh dấu đã đọc"
                                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-white/80 hover:text-slate-700"
                                onClick={() => dismissNotice(notice.id)}
                                type="button"
                              >
                                <Icon className="h-3.5 w-3.5" name="x" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {visibleNotices.length > 0 ? (
                      <div className="border-t border-slate-100 bg-slate-50 px-3 py-2">
                        <button
                          className="w-full text-center text-xs font-semibold text-amber-800 hover:text-amber-950"
                          onClick={() => {
                            setBellOpen(false);
                            setNoticeDismissed((current) => {
                              const next = { ...current };
                              for (const notice of visibleNotices) next[notice.id] = true;
                              return next;
                            });
                          }}
                          type="button"
                        >
                          Đánh dấu đã xem tất cả
                        </button>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Habits 2/3 + month calendar 1/3 */}
      <section className="grid gap-3 lg:grid-cols-3 lg:items-stretch">
        <div className="flex flex-col rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-white p-5 shadow-sm ring-1 ring-inset ring-emerald-100 lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  <Icon className="h-4 w-4" name="check" />
                </span>
                <h2 className="text-xl font-bold text-emerald-950">Theo dõi thói quen</h2>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800/70">
                <span className="sr-only">Tuần trong tháng</span>
                <select
                  className="rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-800 outline-none ring-emerald-200 focus:ring-2"
                  onChange={(event) => selectWeek(event.target.value)}
                  value={activeWeekStart}
                >
                  {monthMondays.map((monday) => {
                    const n = weekOfMonth(monday, selectedMonth);
                    return (
                      <option key={monday} value={monday}>
                        Tuần {n} · {formatWeekRange(monday)}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <button
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-semibold transition",
                  habitChecksDirtyForWeek(activeWeekStart)
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border border-emerald-200 bg-white text-emerald-400",
                )}
                disabled={!habitChecksDirtyForWeek(activeWeekStart) || isBusy}
                onClick={saveHabitChecks}
                type="button"
              >
                Lưu thói quen
                {habitChecksDirtyForWeek(activeWeekStart) ? (
                  <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">Chưa lưu</span>
                ) : null}
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                onClick={() => {
                  setEditingHabits((open) => !open);
                  setDraftHabitName("");
                }}
                type="button"
              >
                <Icon className="h-3.5 w-3.5" name="edit" />
                {editingHabits ? "Xong" : "Sửa"}
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-md bg-emerald-800 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900"
                onClick={() => {
                  setEditingHabits(true);
                  addHabit();
                }}
                type="button"
              >
                <Icon className="h-3.5 w-3.5" name="plus" />
                Thêm
              </button>
            </div>
          </div>

          {/* Progress under title: e.g. Tuần 2 · 15/28 ô */}
          <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-emerald-800">
              <span>
                Tuần {weekNumber}: {habitProgress.done}/{habitProgress.total} ô · {habitProgress.percent}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${habitProgress.percent}%` }}
              />
            </div>
          </div>

          {editingHabits ? (
            <div className="mt-3 flex gap-2">
              <input
                className="w-full max-w-sm rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-amber-200 placeholder:text-slate-400 focus:ring-2"
                onChange={(event) => setDraftHabitName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addHabit();
                  }
                }}
                placeholder="Tên thói quen mới (theo cả tháng)…"
                type="text"
                value={draftHabitName}
              />
              <button
                className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                onClick={addHabit}
                type="button"
              >
                Thêm
              </button>
            </div>
          ) : null}

          <div className="mt-4 min-h-0 flex-1 overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-base">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="py-2.5 pr-3 text-base font-semibold text-slate-700">Thói quen</th>
                  {DAY_HEADERS.map((day) => (
                    <th className="px-1 py-2.5 text-center text-sm font-semibold text-slate-600" key={day}>
                      {day}
                    </th>
                  ))}
                  {editingHabits ? <th className="py-2.5 pl-2 text-right font-semibold text-slate-700"> </th> : null}
                </tr>
              </thead>
              <tbody>
                {habits.length === 0 ? (
                  <tr>
                    <td className="py-6 text-center text-base text-slate-500" colSpan={editingHabits ? 9 : 8}>
                      Chưa có thói quen. Bấm <span className="font-semibold">Thêm</span> để tạo.
                    </td>
                  </tr>
                ) : (
                  habits.map((habit) => {
                    const checks = ensureSevenChecks(habit.checks);
                    return (
                      <tr className="border-b border-slate-50 last:border-0" key={habit.id}>
                        <td className="py-3 pr-3">
                          {editingHabits ? (
                            <div className="flex min-w-[11rem] flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "h-2.5 w-2.5 shrink-0 rounded-full",
                                    habitDot[habit.color as HabitColor] ?? habitDot.slate,
                                  )}
                                />
                                <input
                                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-base font-medium text-slate-900 outline-none ring-amber-200 focus:ring-2"
                                  onBlur={() => commitHabitRename(habit.id, habit.name)}
                                  onChange={(event) =>
                                    setHabitNameDrafts((current) => ({
                                      ...current,
                                      [habit.id]: event.target.value,
                                    }))
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      (event.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  type="text"
                                  value={habitNameDrafts[habit.id] ?? habit.name}
                                />
                              </div>
                              <div className="flex flex-wrap gap-1 pl-4">
                                {(["amber", "emerald", "sky", "violet", "rose", "slate"] as HabitColor[]).map(
                                  (color) => (
                                    <button
                                      aria-label={`Màu ${color}`}
                                      className={cn(
                                        "h-4 w-4 rounded-full ring-offset-1",
                                        habitDot[color],
                                        habit.color === color ? "ring-2 ring-slate-400" : "opacity-60 hover:opacity-100",
                                      )}
                                      key={color}
                                      onClick={() => setHabitColor(habit.id, color, habit.name)}
                                      type="button"
                                    />
                                  ),
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-base font-semibold text-slate-800">
                              <span
                                className={cn(
                                  "h-2.5 w-2.5 shrink-0 rounded-full",
                                  habitDot[habit.color as HabitColor] ?? habitDot.slate,
                                )}
                              />
                              {habit.name}
                            </div>
                          )}
                        </td>
                        {checks.map((serverChecked, dayIndex) => {
                          const checked = getHabitChecked(habit.id, dayIndex, serverChecked);
                          return (
                          <td className="px-1 py-2.5 text-center" key={`${habit.id}-${dayIndex}`}>
                            <button
                              aria-label={`${habit.name} ${DAY_HEADERS[dayIndex]}: ${checked ? "đã xong" : "chưa xong"}`}
                              aria-pressed={checked}
                              className={cn(
                                "mx-auto grid h-9 w-9 place-items-center rounded-md border transition",
                                checked
                                  ? "border-amber-300 bg-amber-50 text-amber-700 shadow-sm"
                                  : "border-slate-200 bg-white text-slate-300 hover:border-slate-300 hover:bg-slate-50",
                                editingHabits && "opacity-60",
                              )}
                              disabled={editingHabits || isBusy}
                              onClick={() => toggleHabitCheckLocal(habit.id, dayIndex, serverChecked)}
                              type="button"
                            >
                              <Icon className="h-4 w-4" name="check" />
                            </button>
                          </td>
                          );
                        })}
                        {editingHabits ? (
                          <td className="py-2.5 pl-2 text-right">
                            <button
                              aria-label={`Xóa ${habit.name}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => removeHabit(habit.id, habit.name)}
                              type="button"
                            >
                              <Icon className="h-4 w-4" name="trash" />
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Month calendar — 1/3 */}
        <aside className="flex flex-col rounded-lg border border-sky-200 bg-gradient-to-br from-sky-50/90 via-white to-white p-4 shadow-sm ring-1 ring-inset ring-sky-100 lg:col-span-1">
          <div className="mb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-200">
                  <Icon className="h-4 w-4" name="calendar" />
                </span>
                <h2 className="text-base font-bold text-sky-950">Lịch tháng</h2>
              </div>
            </div>
            <p className="mt-0.5 text-[11px] text-sky-800/70">Click ngày để ghi chú</p>

            <div className="mt-2 inline-flex w-full items-center justify-between gap-1 rounded-md border border-sky-200 bg-sky-50/80 p-0.5">
              <button
                aria-label="Tháng trước"
                className="grid h-8 w-8 place-items-center rounded-md text-sky-700 hover:bg-white hover:text-sky-950"
                onClick={() => goMonth(-1)}
                type="button"
              >
                <Icon className="h-3.5 w-3.5 rotate-180" name="chevronRight" />
              </button>
              <span className="text-xs font-bold text-sky-950">{formatMonthLabel(selectedMonth)}</span>
              <button
                aria-label="Tháng sau"
                className="grid h-8 w-8 place-items-center rounded-md text-sky-700 hover:bg-white hover:text-sky-950"
                onClick={() => goMonth(1)}
                type="button"
              >
                <Icon className="h-3.5 w-3.5" name="chevronRight" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-500">
            {DAY_HEADERS.map((day) => (
              <div className="py-0.5" key={day}>
                {day}
              </div>
            ))}
          </div>

          <div className="mt-0.5 grid grid-cols-7 gap-1">
            {monthCells.map((cell) => {
              const events = eventsByDate.get(cell.dateKey) ?? [];
              const holidays = holidaysByDate.get(cell.dateKey) ?? [];
              const hasMarker = events.length > 0 || holidays.length > 0;
              const isSelected = calendarDay === cell.dateKey;
              const isTodayCell = cell.dateKey === todayKey;
              const isUpcoming = upcomingDateSet.has(cell.dateKey);
              const isHoliday = holidays.length > 0;

              return (
                <button
                  className={cn(
                    "relative flex min-h-[2.75rem] flex-col items-center justify-center rounded-md border px-0.5 py-1 transition",
                    !cell.inMonth && "opacity-35",
                    isSelected
                      ? "border-amber-400 bg-amber-100 ring-1 ring-amber-200"
                      : isUpcoming
                        ? "border-orange-300 bg-orange-50 ring-1 ring-orange-200"
                        : isHoliday
                          ? "border-rose-200 bg-rose-50/80"
                          : isTodayCell
                            ? "border-sky-200 bg-sky-50"
                            : "border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white",
                  )}
                  key={cell.dateKey}
                  onClick={() => openCalendarDay(cell.dateKey)}
                  title={[...holidays.map((h) => h.name), ...events.map((e) => e.text)].join(" · ") || undefined}
                  type="button"
                >
                  <span
                    className={cn(
                      "text-xs font-semibold leading-none",
                      isUpcoming
                        ? "text-orange-900"
                        : isHoliday
                          ? "text-rose-800"
                          : isTodayCell
                            ? "text-sky-800"
                            : "text-slate-800",
                    )}
                  >
                    {cell.solarDay}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 text-[9px] leading-none",
                      isHoliday || isUpcoming ? "text-rose-500" : "text-slate-400",
                    )}
                  >
                    {cell.lunarLabel}
                  </span>
                  {hasMarker ? (
                    <span className="mt-0.5 flex gap-0.5">
                      {isHoliday ? <span className="h-1 w-1 rounded-full bg-rose-500" /> : null}
                      {events.slice(0, isHoliday ? 2 : 3).map((event) => (
                        <span
                          className={cn(
                            "h-1 w-1 rounded-full",
                            isUpcoming ? "bg-orange-500" : "bg-rose-500",
                          )}
                          key={event.id}
                        />
                      ))}
                    </span>
                  ) : (
                    <span className="mt-0.5 h-1" />
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-[10px] leading-4 text-slate-500">
            Dương / âm · <span className="text-rose-600">chấm đỏ</span> = lễ/sự kiện ·{" "}
            <span className="rounded bg-orange-100 px-1 font-semibold text-orange-800">cam</span> = còn trong tháng
          </p>

          <div className="mt-3 border-t border-sky-100 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-sky-700/80">Sự kiện tháng</p>
            {monthEventList.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">Chưa có sự kiện tháng này.</p>
            ) : (
              <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto pr-0.5">
                {monthEventList.map((event) => {
                  const daysLeft = daysBetween(todayKey, event.date);
                  const upcoming = daysLeft >= 0;
                  return (
                    <li key={event.id}>
                      <button
                        className={cn(
                          "flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left transition",
                          calendarDay === event.date
                            ? "border-amber-300 bg-amber-50"
                            : upcoming
                              ? "border-orange-100 bg-orange-50/60 hover:border-orange-200"
                              : "border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white",
                        )}
                        onClick={() => openCalendarDay(event.date)}
                        type="button"
                      >
                        <span
                          className={cn(
                            "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                            upcoming ? "bg-orange-100 text-orange-800" : "bg-slate-200 text-slate-600",
                          )}
                        >
                          {event.date.slice(8)}
                        </span>
                        <span className="min-w-0 flex-1 text-xs font-medium leading-4 text-slate-800">
                          {event.text}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </section>

      {/* Daily log (2/3) + plan panel (1/3) */}
      <section className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <div className="rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50/80 via-white to-white p-5 shadow-sm ring-1 ring-inset ring-violet-100 lg:col-span-2">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-violet-100 text-violet-700 ring-1 ring-inset ring-violet-200">
                <Icon className="h-4 w-4" name="sparkles" />
              </span>
              <h2 className="text-lg font-bold text-violet-950">Nhật ký & đánh giá hằng ngày</h2>
            </div>
            <p className="mt-1 text-sm text-violet-900/70">
              Tuần {weekNumber} · {formatMonthLabel(selectedMonth)} · chỉnh xong bấm Lưu ngày.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {weeklyLog.map((day) => {
              const open = resolvedOpenDate === day.date;
              const view = open || dayDrafts[day.date] ? getDayDraft(day.date) : buildDayDraft(day);
              const dirty = isDayDirty(day.date);
              const topDone = view.top5Tasks.filter((task) => task.text.trim() && task.isCompleted).length;
              const topFilled = view.top5Tasks.filter((task) => task.text.trim()).length;
              const notesDone = view.tickNotes.filter((note) => note.isCompleted).length;

              return (
                <div
                  className={cn(
                    "overflow-hidden rounded-lg border transition",
                    open ? "border-violet-300 bg-violet-50/40 shadow-sm" : "border-violet-100 bg-white",
                    isToday(day.date) && !open && "ring-1 ring-violet-200",
                  )}
                  key={day.date}
                >
                  <button
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    onClick={() => {
                      if (open) {
                        setOpenDate(null);
                      } else {
                        ensureDayDraft(day.date);
                        setOpenDate(day.date);
                      }
                    }}
                    type="button"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "grid h-8 w-8 shrink-0 place-items-center rounded-md text-xs font-bold",
                          open ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-600",
                        )}
                      >
                        {day.dayLabel.replace("Thứ ", "T").replace("Chủ nhật", "CN")}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {day.dayLabel}
                          {isToday(day.date) ? (
                            <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-xs font-semibold text-violet-800">
                              Hôm nay
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {day.date} · Top 5: {topDone}/{topFilled || 0} · Việc vặt: {notesDone}/
                          {view.tickNotes.length}
                          {(view.reflection ?? "").trim() ? " · Đã có reflection" : ""}
                          {dirty ? " · Chưa lưu" : ""}
                        </p>
                      </div>
                    </div>
                    <Icon
                      className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-90 text-violet-700")}
                      name="chevronRight"
                    />
                  </button>

                  {open ? (
                    <div className="border-t border-violet-100 bg-white px-4 py-4">
                      {/* Left: Top 5 + tick-notes · Right: Daily reflection */}
                      <div className="grid gap-4 md:grid-cols-2 md:items-start">
                        <div className="min-w-0 space-y-4">
                          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 ring-1 ring-inset ring-amber-100">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <h3 className="text-sm font-bold text-amber-950">Top 5 việc quan trọng</h3>
                              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                Tối đa 5
                              </span>
                            </div>
                            <ul className="space-y-2">
                              {view.top5Tasks.map((task, index) => (
                                  <li className="flex items-center gap-2" key={task.id}>
                                    <button
                                      aria-label={`Đánh dấu việc ${index + 1}`}
                                      aria-pressed={task.isCompleted}
                                      className={cn(
                                        "grid h-9 w-9 shrink-0 place-items-center rounded-md border transition",
                                        task.isCompleted
                                          ? "border-amber-400 bg-amber-100 text-amber-800"
                                          : "border-amber-200 bg-white text-amber-300 hover:bg-amber-50",
                                      )}
                                      disabled={isBusy}
                                      onClick={() => toggleTop5Local(day.date, task.id)}
                                      type="button"
                                    >
                                      <Icon className="h-4 w-4" name="check" />
                                    </button>
                                    <span className="w-5 shrink-0 text-center text-xs font-semibold text-amber-600">
                                      {index + 1}
                                    </span>
                                    <input
                                      className={cn(
                                        "w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-amber-200 placeholder:text-slate-400 focus:ring-2",
                                        task.isCompleted && task.text.trim() && "text-slate-500 line-through",
                                      )}
                                      onChange={(event) => setTop5Text(day.date, task.id, event.target.value)}
                                      placeholder={`Việc ưu tiên #${index + 1}`}
                                      type="text"
                                      value={task.text}
                                    />
                                  </li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-3 ring-1 ring-inset ring-teal-100">
                            <h3 className="mb-2 text-sm font-bold text-teal-950">Tick-notes · Việc vặt</h3>
                            <ul className="space-y-2">
                              {view.tickNotes.length === 0 ? (
                                <li className="rounded-md border border-dashed border-teal-200 bg-white/70 px-3 py-3 text-xs text-teal-800/70">
                                  Chưa có việc vặt. Thêm nhanh bên dưới.
                                </li>
                              ) : (
                                view.tickNotes.map((note) => (
                                  <li className="flex items-center gap-2" key={note.id}>
                                    <button
                                      aria-label={note.isCompleted ? "Bỏ đánh dấu" : "Đánh dấu xong"}
                                      aria-pressed={note.isCompleted}
                                      className={cn(
                                        "grid h-8 w-8 shrink-0 place-items-center rounded-md border transition",
                                        note.isCompleted
                                          ? "border-teal-400 bg-teal-100 text-teal-800"
                                          : "border-teal-200 bg-white text-teal-300 hover:bg-teal-50",
                                      )}
                                      disabled={isBusy}
                                      onClick={() => toggleTickNoteLocal(day.date, note.id)}
                                      type="button"
                                    >
                                      <Icon className="h-4 w-4" name="check" />
                                    </button>
                                    <span
                                      className={cn(
                                        "min-w-0 flex-1 text-sm text-slate-800",
                                        note.isCompleted && "text-slate-500 line-through",
                                      )}
                                    >
                                      {note.text}
                                    </span>
                                    <button
                                      aria-label="Xóa ghi chú"
                                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                      disabled={isBusy}
                                      onClick={() => removeTickNoteLocal(day.date, note.id)}
                                      type="button"
                                    >
                                      <Icon className="h-4 w-4" name="trash" />
                                    </button>
                                  </li>
                                ))
                              )}
                            </ul>
                            <div className="mt-2 flex gap-2">
                              <input
                                className="w-full rounded-md border border-teal-200 bg-white px-3 py-2 text-sm outline-none ring-teal-200 placeholder:text-slate-400 focus:ring-2"
                                onChange={(event) =>
                                  setDraftNote((current) => ({ ...current, [day.date]: event.target.value }))
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    addTickNoteLocal(day.date);
                                  }
                                }}
                                placeholder="Thêm việc vặt (Enter để thêm vào nháp)…"
                                type="text"
                                value={draftNote[day.date] ?? ""}
                              />
                              <button
                                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                                disabled={isBusy}
                                onClick={() => addTickNoteLocal(day.date)}
                                type="button"
                              >
                                <Icon className="h-4 w-4" name="plus" />
                                Thêm
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="min-w-0 rounded-lg border border-rose-200 bg-rose-50/50 p-3 ring-1 ring-inset ring-rose-100 md:sticky md:top-2">
                          <h3 className="mb-2 text-sm font-bold text-rose-950">Daily reflection</h3>
                          <textarea
                            className="min-h-[16rem] w-full resize-y rounded-md border border-rose-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-rose-200 placeholder:text-slate-400 focus:ring-2 md:min-h-[22rem]"
                            onChange={(event) => setReflectionLocal(day.date, event.target.value)}
                            placeholder="1–2 câu: cảm xúc, bài học, hoặc điều biết ơn hôm nay…"
                            value={view.reflection}
                          />
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-semibold transition",
                                dirty
                                  ? "bg-violet-600 text-white hover:bg-violet-700"
                                  : "border border-violet-200 bg-white text-violet-300",
                              )}
                              disabled={!dirty || isBusy}
                              onClick={() => saveDayLog(day.date)}
                              type="button"
                            >
                              Lưu ngày
                              {dirty ? (
                                <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">Chưa lưu</span>
                              ) : null}
                            </button>
                            <span className="text-[11px] text-rose-800/70">
                              Nhập / tích xong rồi bấm Lưu một lần
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Plan panel with week / month tabs */}
        <aside className="rounded-lg border border-orange-200 bg-gradient-to-br from-orange-50/90 via-white to-white p-5 shadow-sm ring-1 ring-inset ring-orange-100 lg:sticky lg:top-4 lg:col-span-1 lg:self-start">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-orange-100 text-orange-700 ring-1 ring-inset ring-orange-200">
              <Icon className="h-4 w-4" name="target" />
            </span>
            <h2 className="text-base font-bold text-orange-950">Kế hoạch</h2>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg border border-orange-100 bg-orange-50/80 p-1">
            <button
              className={cn(
                "rounded-md px-2 py-2 text-xs font-semibold transition",
                planTab === "week" ? "bg-white text-orange-950 shadow-sm ring-1 ring-orange-200" : "text-orange-800/70 hover:text-orange-950",
              )}
              onClick={() => {
                setPlanTab("week");
                setDraftPlan("");
              }}
              type="button"
            >
              Tuần {weekNumber}
            </button>
            <button
              className={cn(
                "rounded-md px-2 py-2 text-xs font-semibold transition",
                planTab === "month" ? "bg-white text-orange-950 shadow-sm ring-1 ring-orange-200" : "text-orange-800/70 hover:text-orange-950",
              )}
              onClick={() => {
                setPlanTab("month");
                setDraftPlan("");
              }}
              type="button"
            >
              Tháng
            </button>
          </div>

          <div className="mb-3">
            <h3 className="text-sm font-bold text-orange-950">
              {planTab === "week" ? `Kế hoạch tuần ${weekNumber}` : `Kế hoạch ${formatMonthLabel(selectedMonth)}`}
            </h3>
            <p className="mt-1 text-xs text-orange-900/70">
              {planTab === "week"
                ? `${formatWeekRange(activeWeekStart)} · tick / sửa nháp, bấm Lưu kế hoạch`
                : `Cả ${formatMonthLabel(selectedMonth).toLowerCase()} · tick / sửa nháp, bấm Lưu kế hoạch`}
            </p>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-orange-900/80">
              <span>
                {planProgress.done}/{planProgress.total} hoàn thành
              </span>
              <span>{planProgress.percent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-orange-100">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  planTab === "week" ? "bg-orange-500" : "bg-amber-500",
                )}
                style={{ width: `${planProgress.percent}%` }}
              />
            </div>
          </div>

          <ul className="space-y-2">
            {activePlan.length === 0 ? (
              <li className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                {planTab === "week"
                  ? "Chưa có mục tuần. Thêm kế hoạch bên dưới."
                  : "Chưa có mục tháng. Thêm kế hoạch bên dưới."}
              </li>
            ) : (
              activePlan.map((item) => (
                <li
                  className="flex items-start gap-2 rounded-md border border-orange-100 bg-orange-50/70 p-2"
                  key={item.id}
                >
                  <button
                    aria-label={item.isCompleted ? "Bỏ đánh dấu" : "Đánh dấu xong"}
                    aria-pressed={item.isCompleted}
                    className={cn(
                      "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border transition",
                      item.isCompleted
                        ? "border-orange-400 bg-orange-100 text-orange-800"
                        : "border-orange-200 bg-white text-orange-300 hover:bg-white",
                    )}
                    disabled={isBusy}
                    onClick={() => togglePlanItemLocal(item.id)}
                    type="button"
                  >
                    <Icon className="h-4 w-4" name="check" />
                  </button>
                  <input
                    className={cn(
                      "min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-1.5 text-sm text-slate-900 outline-none ring-orange-200 focus:border-orange-200 focus:bg-white focus:ring-2",
                      item.isCompleted && "text-slate-500 line-through",
                    )}
                    onChange={(event) => setPlanItemTextLocal(item.id, event.target.value)}
                    type="text"
                    value={item.text}
                  />
                  <button
                    aria-label="Xóa mục kế hoạch"
                    className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    disabled={isBusy}
                    onClick={() => removePlanItemLocal(item.id, item.text)}
                    type="button"
                  >
                    <Icon className="h-4 w-4" name="trash" />
                  </button>
                </li>
              ))
            )}
          </ul>

          <div className="mt-3 flex flex-col gap-2">
            <input
              className="w-full rounded-md border border-orange-200 bg-white px-3 py-2 text-sm outline-none ring-orange-200 placeholder:text-slate-400 focus:ring-2"
              onChange={(event) => setDraftPlan(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addPlanItemLocal();
                }
              }}
              placeholder={planTab === "week" ? "Thêm mục kế hoạch tuần…" : "Thêm mục kế hoạch tháng…"}
              type="text"
              value={draftPlan}
            />
            <button
              className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-orange-700 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-800"
              disabled={isBusy}
              onClick={addPlanItemLocal}
              type="button"
            >
              <Icon className="h-4 w-4" name="plus" />
              {planTab === "week" ? `Thêm vào tuần ${weekNumber}` : "Thêm vào kế hoạch tháng"}
            </button>
            <button
              className={cn(
                "inline-flex w-full items-center justify-center gap-1 rounded-md px-3 py-2 text-sm font-semibold transition",
                planDirty
                  ? "bg-orange-500 text-white hover:bg-orange-600"
                  : "border border-orange-200 bg-white text-orange-300",
              )}
              disabled={!planDirty || isBusy}
              onClick={savePlan}
              type="button"
            >
              Lưu kế hoạch
              {planDirty ? (
                <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">Chưa lưu</span>
              ) : null}
            </button>
          </div>
        </aside>
      </section>

      <p className="px-1 text-center text-xs text-slate-400">
        Lịch tháng + âm lịch · API `/api/growth` · member {member}
      </p>

      {/* Day detail modal for calendar notes */}
      {calendarDay ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
          <button
            aria-label="Đóng chi tiết ngày"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setCalendarDay(null)}
            type="button"
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Chi tiết ngày</p>
                <h3 className="mt-1 text-lg font-bold text-slate-950">{calendarDay}</h3>
                <p className="mt-1 text-xs text-slate-500">{lunarFullLabelFromDateKey(calendarDay)}</p>
              </div>
              <button
                aria-label="Đóng"
                className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                onClick={() => setCalendarDay(null)}
                type="button"
              >
                <Icon className="h-4 w-4" name="x" />
              </button>
            </div>

            {dayHolidays.length > 0 ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-rose-800">Ngày lễ Việt Nam</p>
                <ul className="mt-1.5 space-y-1">
                  {dayHolidays.map((holiday) => (
                    <li className="text-sm font-semibold text-rose-900" key={`${holiday.date}-${holiday.name}`}>
                      {holiday.name}
                      <span className="ml-1 text-xs font-medium text-rose-600">
                        ({holiday.kind === "lunar" ? "âm lịch" : "dương lịch"})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-4">
              <h4 className="text-sm font-bold text-slate-900">Ghi chú / sự kiện</h4>
              <ul className="mt-2 space-y-2">
                {dayEvents.length === 0 ? (
                  <li className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                    Chưa có ghi chú. Ví dụ: Về quê, Đám cưới, Sinh nhật…
                  </li>
                ) : (
                  dayEvents.map((event) => {
                    const daysLeft = daysBetween(todayKey, event.date);
                    const isRemainingThisMonth =
                      daysLeft >= 0 && event.date.slice(0, 7) === currentMonthKey;
                    return (
                      <li
                        className={cn(
                          "flex items-start gap-2 rounded-md border px-3 py-2",
                          isRemainingThisMonth
                            ? daysLeft <= 1
                              ? "border-rose-300 bg-rose-50"
                              : daysLeft <= 7
                                ? "border-orange-300 bg-orange-50"
                                : "border-amber-300 bg-amber-50"
                            : "border-slate-100 bg-slate-50",
                        )}
                        key={event.id}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900">{event.text}</p>
                          {isRemainingThisMonth ? (
                            <p
                              className={cn(
                                "mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold text-white",
                                daysLeft <= 1
                                  ? "bg-rose-500"
                                  : daysLeft <= 7
                                    ? "bg-orange-500"
                                    : "bg-amber-500",
                              )}
                            >
                              {daysLeftLabel(daysLeft)}
                            </p>
                          ) : daysLeft < 0 ? (
                            <p className="mt-0.5 text-xs text-slate-400">Đã qua</p>
                          ) : (
                            <p className="mt-0.5 text-xs text-slate-400">Còn {daysLeft} ngày</p>
                          )}
                        </div>
                        <button
                          aria-label="Xóa sự kiện"
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => removeCalendarEvent(event.id, event.text)}
                          type="button"
                        >
                          <Icon className="h-4 w-4" name="trash" />
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>

              <div className="mt-3 flex flex-col gap-2">
                <input
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-amber-200 placeholder:text-slate-400 focus:ring-2"
                  onChange={(event) => setDraftEvent(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCalendarEvent();
                    }
                  }}
                  placeholder="Thêm ghi chú (vd: Về quê, Đám cưới…)"
                  type="text"
                  value={draftEvent}
                />
                <button
                  className="inline-flex items-center justify-center gap-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  onClick={addCalendarEvent}
                  type="button"
                >
                  <Icon className="h-4 w-4" name="plus" />
                  Lưu ghi chú
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Confirm dialog */}
      {confirmDialog ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            aria-label="Đóng hộp thoại"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => !isBusy && setConfirmDialog(null)}
            type="button"
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-950">{confirmDialog.title}</h3>
            <p className="mt-3 text-base leading-7 text-slate-600">{confirmDialog.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                disabled={isBusy}
                onClick={() => setConfirmDialog(null)}
                type="button"
              >
                Hủy
              </button>
              <button
                className={cn(
                  "rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50",
                  confirmDialog.tone === "danger"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-slate-900 hover:bg-slate-800",
                )}
                disabled={isBusy}
                onClick={() => void confirmDialog.onConfirm()}
                type="button"
              >
                {confirmDialog.confirmLabel ?? "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Loading overlay */}
      {isBusy ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/25 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-xl">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <p className="text-sm font-semibold text-slate-800">Đang xử lý…</p>
          </div>
        </div>
      ) : null}

      {/* Success / error result popup (large) */}
      {flashNotice ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            aria-label="Đóng thông báo"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setFlashNotice(null)}
            type="button"
          />
          <div
            className={cn(
              "relative z-10 w-full max-w-md rounded-2xl border-2 bg-white p-6 text-center shadow-2xl",
              flashNotice.type === "success" ? "border-emerald-200" : "border-rose-200",
            )}
            role="alertdialog"
            aria-modal="true"
          >
            <div
              className={cn(
                "mx-auto grid h-14 w-14 place-items-center rounded-full",
                flashNotice.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
              )}
            >
              <Icon className="h-7 w-7" name={flashNotice.type === "success" ? "check" : "x"} />
            </div>
            <h3
              className={cn(
                "mt-4 text-xl font-bold",
                flashNotice.type === "success" ? "text-emerald-900" : "text-rose-900",
              )}
            >
              {flashNotice.type === "success" ? "Thành công" : "Thất bại"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{flashNotice.message}</p>
            <button
              className={cn(
                "mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white",
                flashNotice.type === "success" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700",
              )}
              onClick={() => setFlashNotice(null)}
              type="button"
            >
              Đóng
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
