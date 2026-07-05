import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const categorySchema = z.object({
  label: z.string().trim().min(1).max(40),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const parsed = categorySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid category payload." }, { status: 400 });
  }

  try {
    const category = await prisma.category.update({
      where: { id: params.id },
      data: {
        label: parsed.data.label,
      },
    });

    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: "Category not found or label already exists." }, { status: 404 });
  }
}
