import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { requireApiAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeStockSymbol, stockSymbolSchema, toStockSymbolResponse } from "../stock-symbol-utils";

export const dynamic = "force-dynamic";

function stockSymbolId(params: { id: string }) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAccess(request, "investments");
  if ("response" in auth) return auth.response;

  const id = stockSymbolId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid stock symbol id." }, { status: 400 });
  }

  const parsed = stockSymbolSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid stock symbol payload." }, { status: 400 });
  }

  const username = auditUsername(auth.user);
  const nextSymbol = normalizeStockSymbol(parsed.data.symbol);

  try {
    const stockSymbol = await prisma.$transaction(async (tx) => {
      const current = await tx.stockSymbol.findUnique({ where: { id } });
      if (!current) {
        return null;
      }

      const updated = await tx.stockSymbol.update({
        where: { id },
        data: {
          symbol: nextSymbol,
          updatedBy: username,
        },
      });

      if (current.symbol !== nextSymbol) {
        await tx.investment.updateMany({
          where: {
            type: "STOCK",
            name: current.symbol,
          },
          data: {
            name: nextSymbol,
            updatedBy: username,
          },
        });
      }

      return updated;
    });

    if (!stockSymbol) {
      return NextResponse.json({ error: "Stock symbol not found." }, { status: 404 });
    }

    return NextResponse.json({ stockSymbol: toStockSymbolResponse(stockSymbol) });
  } catch {
    return NextResponse.json({ error: "Stock symbol already exists." }, { status: 409 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAccess(request, "investments");
  if ("response" in auth) return auth.response;

  const id = stockSymbolId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid stock symbol id." }, { status: 400 });
  }

  const stockSymbol = await prisma.stockSymbol.findUnique({ where: { id } });
  if (!stockSymbol) {
    return NextResponse.json({ error: "Stock symbol not found." }, { status: 404 });
  }

  const usageCount = await prisma.investment.count({
    where: {
      type: "STOCK",
      name: stockSymbol.symbol,
    },
  });

  if (usageCount > 0) {
    return NextResponse.json({ error: "Stock symbol is being used by investments." }, { status: 400 });
  }

  await prisma.stockSymbol.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
