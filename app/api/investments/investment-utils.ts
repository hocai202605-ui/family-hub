import { z } from "zod";

export const investmentFields = z.object({
  name: z.string().trim().min(1),
  type: z.enum([
    "GOLD",
    "STOCK",
    "SAVING",
    "REAL_ESTATE",
    "CRYPTO",
    "DEBT",
    "LOAN",
    "OTHER",
    "FUND_DCDS",
    "FUND_ETF_VN30",
    "DEBT_INTEREST",
  ]),
  quantity: z.number().positive(),
  purchasePrice: z.number().nonnegative(),
  currentPrice: z.number().nonnegative().optional(),
  interestRate: z.number().nullable().optional(),
  term: z.string().nullable().optional(),
  member: z.enum(["CK", "VK", "CON"]),
  note: z.string().trim().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const investmentSchema = investmentFields.superRefine((data, ctx) => {
  if (data.type !== "GOLD") return;
  if (data.quantity === 0.5 || Number.isInteger(data.quantity)) return;
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["quantity"],
    message: "Gold quantity must be 0.5 or a positive integer.",
  });
});

export function dateFromInput(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export function formatInvestmentDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function toInvestmentResponse(investment: {
  id: number;
  name: string;
  type: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  interestRate: number | null;
  term: string | null;
  member: "CK" | "VK" | "CON" | "GIA_DINH";
  note: string | null;
  date: Date;
}) {
  return {
    id: investment.id,
    name: investment.name,
    type: investment.type,
    quantity: investment.quantity,
    purchasePrice: investment.purchasePrice,
    currentPrice: investment.currentPrice,
    interestRate: investment.interestRate,
    term: investment.term,
    member: investment.member,
    note: investment.note || "",
    date: formatInvestmentDate(investment.date),
  };
}
