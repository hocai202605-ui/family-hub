import { z } from "zod";

export const expenseSchema = z.object({
  amount: z.number().int().positive(),
  category: z.string().trim().min(1),
  member: z.enum(["CK", "VK", "CON"]),
  note: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export function dateFromInput(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export function formatExpenseDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function toExpenseResponse(expense: {
  id: number;
  amount: number;
  category: string;
  member: "CK" | "VK" | "CON";
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
    date: formatExpenseDate(expense.date),
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
