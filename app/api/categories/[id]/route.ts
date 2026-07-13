import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auditUsername } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireAdminApiAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

const categorySchema = z.object({
  label: z.string().trim().min(1).max(40),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApiAccess(request);
  if ("response" in auth) return auth.response;

  const parsed = categorySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid category payload." }, { status: 400 });
  }

  const existingCategory = await prisma.category.findUnique({
    where: { id: params.id },
  });

  if (!existingCategory) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }

  try {
    const category = await prisma.category.update({
      where: { id: params.id },
      data: {
        label: parsed.data.label,
        updatedBy: auditUsername(auth.user),
      },
    });

    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: "Category not found or label already exists." }, { status: 404 });
  }
}
