import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { requireApiAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_STOCK_SYMBOLS,
  normalizeStockSymbol,
  stockSymbolSchema,
  toStockSymbolResponse,
} from "./stock-symbol-utils";

export const dynamic = "force-dynamic";

async function ensureDefaultStockSymbols(actor: string) {
  await prisma.stockSymbol.createMany({
    data: DEFAULT_STOCK_SYMBOLS.map((symbol) => ({
      symbol,
      createdBy: actor,
      updatedBy: actor,
    })),
    skipDuplicates: true,
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request, "investments");
  if ("response" in auth) return auth.response;

  await ensureDefaultStockSymbols(auditUsername(auth.user));

  const stockSymbols = await prisma.stockSymbol.findMany({
    orderBy: { symbol: "asc" },
  });

  return NextResponse.json({
    stockSymbols: stockSymbols.map(toStockSymbolResponse),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request, "investments");
  if ("response" in auth) return auth.response;

  const parsed = stockSymbolSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid stock symbol payload." }, { status: 400 });
  }

  const username = auditUsername(auth.user);
  const symbol = normalizeStockSymbol(parsed.data.symbol);

  try {
    const stockSymbol = await prisma.stockSymbol.create({
      data: {
        symbol,
        createdBy: username,
        updatedBy: username,
      },
    });

    return NextResponse.json({ stockSymbol: toStockSymbolResponse(stockSymbol) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Stock symbol already exists." }, { status: 409 });
  }
}
