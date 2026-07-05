import { z } from "zod";

export const transactionSchema = z.object({
  amount: z.number().int().positive(),
  type: z.enum(["income", "expense"]),
  category: z.enum(["Food", "Utilities", "Transport", "Shopping", "Entertainment", "Others"]),
  member: z.enum(["CK", "VK", "CON"]),
  note: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export function dateFromInput(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export function formatTransactionDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function toTransactionResponse(transaction: {
  id: number;
  amount: number;
  type: "income" | "expense";
  category: "Food" | "Utilities" | "Transport" | "Shopping" | "Entertainment" | "Others";
  member: "CK" | "VK" | "CON";
  note: string;
  date: Date;
}) {
  return {
    id: transaction.id,
    amount: transaction.amount,
    type: transaction.type,
    category: transaction.category,
    member: transaction.member,
    note: transaction.note,
    date: formatTransactionDate(transaction.date),
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
