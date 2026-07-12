import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApiAccess, requireAnyApiAccess, requireApiAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

const categorySchema = z.object({
  label: z.string().trim().min(1).max(40),
  type: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE"),
});

function slugFromLabel(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function GET(request: NextRequest) {
  const typeParam = request.nextUrl.searchParams.get("type");
  const type = typeParam === "INCOME" || typeParam === "EXPENSE" ? typeParam : undefined;
  const auth = type
    ? type === "INCOME"
      ? await requireApiAccess(request, "income.monthly")
      : await requireApiAccess(request, "expenses.monthly")
    : await requireAnyApiAccess(request, ["income.monthly", "expenses.monthly"]);

  if ("response" in auth) return auth.response;

  const categories = await prisma.category.findMany({
    where: type ? { type } : undefined,
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApiAccess(request);
  if ("response" in auth) return auth.response;

  const parsed = categorySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid category payload." }, { status: 400 });
  }

  const baseId = slugFromLabel(parsed.data.label) || `category-${Date.now()}`;
  let id = baseId;
  let suffix = 2;

  while (await prisma.category.findUnique({ where: { id } })) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  try {
    const category = await prisma.category.create({
      data: {
        id,
        label: parsed.data.label,
        type: parsed.data.type,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Category label already exists for this type." }, { status: 409 });
  }
}
