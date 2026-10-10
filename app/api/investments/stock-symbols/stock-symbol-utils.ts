import { z } from "zod";

export const DEFAULT_STOCK_SYMBOLS = ["MBB", "HPG", "TCB", "BID", "CTG"] as const;

export const stockSymbolSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(16)
    .regex(/^[A-Za-z0-9._-]+$/),
});

export function normalizeStockSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

export function toStockSymbolResponse(stockSymbol: { id: number; symbol: string }) {
  return {
    id: stockSymbol.id,
    symbol: stockSymbol.symbol,
  };
}
