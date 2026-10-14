import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auditUsername } from "@/lib/audit";
import { requireAnyApiAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  TARGET_ASSET_TYPES,
  targetUnitForType,
  upsertTargetsSchema,
  yearRange,
} from "../investment-utils";

export const dynamic = "force-dynamic";

const ACCESS = ["investments.yearly", "investments"] as const;

function isMissingPlanTableError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

async function getYearPlanTotal(year: string) {
  try {
    const plan = await prisma.investmentYearPlan.findUnique({
      where: { year },
    });
    return plan?.totalTargetAmount ?? 0;
  } catch (error) {
    if (isMissingPlanTableError(error)) return 0;
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAnyApiAccess(request, [...ACCESS]);
  if ("response" in auth) return auth.response;

  const year = request.nextUrl.searchParams.get("year");
  if (!yearRange(year ?? "")) {
    return NextResponse.json({ error: "Invalid or missing year (YYYY)." }, { status: 400 });
  }

  const rows = await prisma.investmentYearTarget.findMany({
    where: { year: year! },
  });
  const totalTargetAmount = await getYearPlanTotal(year!);
  const byType = new Map(rows.map((row) => [row.type, row.targetValue]));

  return NextResponse.json({
    year,
    totalTargetAmount,
    targets: TARGET_ASSET_TYPES.map((type) => ({
      type,
      targetValue: byType.get(type) ?? 0,
      unit: targetUnitForType(type),
    })),
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAnyApiAccess(request, [...ACCESS]);
  if ("response" in auth) return auth.response;

  const parsed = upsertTargetsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid target payload." }, { status: 400 });
  }

  const username = auditUsername(auth.user);
  const { year, items = [], totalTargetAmount } = parsed.data;

  try {
    await prisma.$transaction(
      [
        ...(totalTargetAmount !== undefined
          ? [
              prisma.investmentYearPlan.upsert({
                where: { year },
                create: {
                  year,
                  totalTargetAmount,
                  createdBy: username,
                  updatedBy: username,
                },
                update: {
                  totalTargetAmount,
                  updatedBy: username,
                },
              }),
            ]
          : []),
        ...items.map((item) =>
          prisma.investmentYearTarget.upsert({
            where: { year_type: { year, type: item.type } },
            create: {
              year,
              type: item.type,
              targetValue: item.targetValue,
              createdBy: username,
              updatedBy: username,
            },
            update: {
              targetValue: item.targetValue,
              updatedBy: username,
            },
          }),
        ),
      ],
    );
  } catch (error) {
    if (totalTargetAmount !== undefined && isMissingPlanTableError(error)) {
      return NextResponse.json({ error: "Investment year plan migration has not been applied." }, { status: 409 });
    }
    throw error;
  }

  const [targetRows, savedTotalTargetAmount] = await Promise.all([
    prisma.investmentYearTarget.findMany({ where: { year } }),
    getYearPlanTotal(year),
  ]);

  return NextResponse.json({
    year,
    totalTargetAmount: savedTotalTargetAmount,
    targets: targetRows.map((row) => ({
      type: row.type,
      targetValue: row.targetValue,
      unit: targetUnitForType(row.type as (typeof TARGET_ASSET_TYPES)[number]),
    })),
  });
}
