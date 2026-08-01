import { z } from "zod";

/** `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm` / `YYYY-MM-DDTHH:mm:ss` (wall-clock, stored as UTC components). */
export const expenseDateTimeRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;

export const expenseSchema = z.object({
  amount: z.number().int().positive(),
  category: z.string().trim().min(1),
  member: z.enum(["CK", "VK", "CON", "GIA_DINH"]),
  note: z.string().trim().min(1),
  date: z.string().regex(expenseDateTimeRegex),
});

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function dateFromInput(date: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(`${date}T00:00:00.000Z`);
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date)) {
    return new Date(`${date}:00.000Z`);
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(date)) {
    return new Date(`${date}.000Z`);
  }

  return new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
}

/** `YYYY-MM-DDTHH:mm` from stored UTC wall-clock components (for datetime-local). */
export function formatExpenseDateTime(date: Date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}T${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
}

export function formatExpenseDate(date: Date) {
  return formatExpenseDateTime(date).slice(0, 10);
}

export function toExpenseResponse(expense: {
  id: number;
  amount: number;
  category: string;
  member: "CK" | "VK" | "CON" | "GIA_DINH";
  note: string;
  date: Date;
}) {
  return {
    id: expense.id,
    amount: expense.amount,
    type: "expense", // frontend still uses type
    category: expense.category,
    member: expense.member,
    note: expense.note,
    date: formatExpenseDateTime(expense.date),
  };
}

export function monthRange(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  const [year, monthNumber] = month.split("-").map(Number);

  if (monthNumber < 1 || monthNumber > 12) {
    return null;
  }

  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));

  return { start, end };
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
