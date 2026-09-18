import { NextRequest, NextResponse } from "next/server";
import { auditUsername } from "@/lib/audit";
import { requireAnyApiAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultJars, jarIdSchema, jarPatchSchema, toJarResponse } from "../jar-utils";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAnyApiAccess(request, ["expenses.yearly", "expenses.monthly"]);
  if ("response" in auth) return auth.response;

  const jarIdParsed = jarIdSchema.safeParse(params.id);
  if (!jarIdParsed.success) {
    return NextResponse.json({ error: "Unknown jar." }, { status: 404 });
  }

  const parsed = jarPatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid jar payload." }, { status: 400 });
  }

  const actor = auditUsername(auth.user);
  await ensureDefaultJars(actor);

  const jarId = jarIdParsed.data;

  if (parsed.data.categoryIds) {
    const uniqueIds = Array.from(new Set(parsed.data.categoryIds));
    const found = await prisma.category.findMany({
      where: { id: { in: uniqueIds }, type: "EXPENSE" },
      select: { id: true },
    });

    if (found.length !== uniqueIds.length) {
      return NextResponse.json({ error: "Expense category not found." }, { status: 400 });
    }
  }

  const jar = await prisma.$transaction(async (tx) => {
    if (
      parsed.data.limitAmount !== undefined ||
      parsed.data.label !== undefined ||
      parsed.data.targetPercent !== undefined
    ) {
      await tx.expenseJar.update({
        where: { id: jarId },
        data: {
          ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
          ...(parsed.data.targetPercent !== undefined ? { targetPercent: parsed.data.targetPercent } : {}),
          ...(parsed.data.limitAmount !== undefined ? { limitAmount: parsed.data.limitAmount } : {}),
          updatedBy: actor,
        },
      });
    }

    if (parsed.data.categoryIds) {
      const uniqueIds = Array.from(new Set(parsed.data.categoryIds));
      await tx.expenseJarCategory.deleteMany({
        where: {
          OR: [{ jarId }, { categoryId: { in: uniqueIds } }],
        },
      });
      if (uniqueIds.length > 0) {
        await tx.expenseJarCategory.createMany({
          data: uniqueIds.map((categoryId) => ({ jarId, categoryId })),
        });
      }
    }

    return tx.expenseJar.findUniqueOrThrow({
      where: { id: jarId },
      include: { categories: true },
    });
  });

  return NextResponse.json({
    jar: toJarResponse({ ...jar, spent: 0 }),
  });
}
