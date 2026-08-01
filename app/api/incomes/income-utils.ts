import { z } from "zod";

export const incomeSchema = z.object({
  amount: z.number().int().positive(),
  category: z.string().trim().min(1),
  member: z.enum(["CK", "VK", "CON"]),
  note: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export function dateFromInput(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export function formatIncomeDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function toIncomeResponse(income: {
  id: number;
  amount: number;
  category: string;
  member: "CK" | "VK" | "CON" | "GIA_DINH";
  note: string;
  date: Date;
}) {
  return {
    id: income.id,
    amount: income.amount,
    type: "income",
    category: income.category,
    member: income.member,
    note: income.note,
    date: formatIncomeDate(income.date),
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
  
  // From Jan 1st 00:00:00 UTC to Jan 1st of next year 00:00:00 UTC
  const start = new Date(Date.UTC(yearNumber, 0, 1));
  const end = new Date(Date.UTC(yearNumber + 1, 0, 1));

  return { start, end };
}
