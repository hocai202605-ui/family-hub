import { z } from "zod";

export const familyMemberSchema = z.enum(["CK", "VK", "CON"]);
export const monthKeySchema = z.string().regex(/^\d{4}-\d{2}$/);
export const yearKeySchema = z.string().regex(/^\d{4}$/);
export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const planScopeSchema = z.enum(["week", "month"]);
export const habitColorSchema = z.enum(["amber", "emerald", "sky", "violet", "rose", "slate"]);

export const top5TaskSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  isCompleted: z.boolean(),
});

export function dateFromKey(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export function yearRange(year: string) {
  if (!/^\d{4}$/.test(year)) {
    return null;
  }

  const yearNumber = Number(year);
  const start = new Date(Date.UTC(yearNumber, 0, 1));
  const end = new Date(Date.UTC(yearNumber + 1, 0, 1));

  return { start, end };
}

export function daysInUtcMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function formatDateKey(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function emptyTop5Tasks() {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `slot-${index + 1}`,
    text: "",
    isCompleted: false,
  }));
}

export function normalizeTop5(value: unknown) {
  const parsed = z.array(top5TaskSchema).safeParse(value);
  if (!parsed.success || parsed.data.length === 0) {
    return emptyTop5Tasks();
  }
  const tasks = parsed.data.slice(0, 5).map((task, index) => ({
    id: task.id || `slot-${index + 1}`,
    text: task.text ?? "",
    isCompleted: Boolean(task.isCompleted),
  }));
  while (tasks.length < 5) {
    tasks.push({ id: `slot-${tasks.length + 1}`, text: "", isCompleted: false });
  }
  return tasks;
}

export function mondaysInMonthKeys(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  const day = first.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  let cursor = new Date(first);
  cursor.setUTCDate(first.getUTCDate() + diff);
  const stop = new Date(last);
  stop.setUTCDate(last.getUTCDate() + 7);
  const list: string[] = [];
  while (cursor <= stop) {
    const weekEnd = new Date(cursor);
    weekEnd.setUTCDate(cursor.getUTCDate() + 6);
    if (cursor <= last && weekEnd >= first) {
      list.push(formatDateKey(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 7);
    if (list.length >= 6) break;
  }
  return list;
}

export function dayLabelForDateKey(dateKey: string) {
  const labels = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const d = dateFromKey(dateKey);
  return labels[d.getUTCDay()] ?? dateKey;
}

export const createHabitSchema = z.object({
  member: familyMemberSchema,
  month: monthKeySchema,
  name: z.string().trim().min(1).max(120),
  color: habitColorSchema.optional(),
});

export const updateHabitSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  color: habitColorSchema.optional(),
  sortOrder: z.number().int().optional(),
});

export const habitCheckSchema = z.object({
  habitId: z.string().min(1),
  weekStart: dateKeySchema,
  dayIndex: z.number().int().min(0).max(6),
  completed: z.boolean(),
});

export const createPlanItemSchema = z.object({
  member: familyMemberSchema,
  scope: planScopeSchema,
  month: monthKeySchema,
  weekStart: dateKeySchema.optional().nullable(),
  text: z.string().trim().min(1).max(500),
});

export const updatePlanItemSchema = z.object({
  text: z.string().trim().min(1).max(500).optional(),
  isCompleted: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const upsertDailyLogSchema = z.object({
  member: familyMemberSchema,
  date: dateKeySchema,
  reflection: z.string().max(5000).optional(),
  top5Tasks: z.array(top5TaskSchema).length(5).optional(),
});

export const createTickNoteSchema = z.object({
  member: familyMemberSchema,
  date: dateKeySchema,
  text: z.string().trim().min(1).max(500),
});

export const updateTickNoteSchema = z.object({
  text: z.string().trim().min(1).max(500).optional(),
  isCompleted: z.boolean().optional(),
});

export const DEFAULT_EVENT_CATEGORY_ID = "other";

export const eventMemberSchema = z.enum(["CK", "VK", "CON", "GIA_DINH"]);
export const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const createEventSchema = z.object({
  member: eventMemberSchema.optional(),
  date: dateKeySchema,
  text: z.string().trim().min(1).max(500),
  note: z.string().max(2000).optional(),
  budgetAmount: z.number().int().nonnegative().nullable().optional(),
  categoryId: z.string().min(1).optional(),
});

export const updateEventSchema = z.object({
  date: dateKeySchema.optional(),
  text: z.string().trim().min(1).max(500).optional(),
  note: z.string().max(2000).optional(),
  budgetAmount: z.number().int().nonnegative().nullable().optional(),
  categoryId: z.string().min(1).optional(),
  member: eventMemberSchema.optional(),
});

export const createEventCategorySchema = z.object({
  label: z.string().trim().min(1).max(40),
  color: hexColorSchema,
});

export const updateEventCategorySchema = z.object({
  label: z.string().trim().min(1).max(40).optional(),
  color: hexColorSchema.optional(),
});

export type EventCategoryRow = {
  id: string;
  label: string;
  color: string;
  isSystem: boolean;
  sortOrder: number;
};

export function toEventCategoryResponse(row: EventCategoryRow) {
  return {
    id: row.id,
    label: row.label,
    color: row.color,
    isSystem: row.isSystem,
    sortOrder: row.sortOrder,
  };
}

export function toEventResponse(event: {
  id: string;
  member: "CK" | "VK" | "CON" | "GIA_DINH";
  date: Date;
  text: string;
  note: string;
  budgetAmount: number | null;
  categoryId: string;
  category?: EventCategoryRow | null;
}) {
  return {
    id: event.id,
    date: formatDateKey(event.date),
    text: event.text,
    note: event.note,
    budgetAmount: event.budgetAmount,
    member: event.member,
    categoryId: event.categoryId,
    category: event.category ? toEventCategoryResponse(event.category) : null,
  };
}
