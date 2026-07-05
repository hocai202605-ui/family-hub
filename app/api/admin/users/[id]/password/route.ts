import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, requireAdminApiAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const passwordSchema = z.object({
  password: z.string().min(6).max(120),
});

function userId(params: { id: string }) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApiAccess(request);
  if ("response" in auth) return auth.response;

  const id = userId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  const parsed = passwordSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid password payload." }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { passwordHash: hashPassword(parsed.data.password) },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
}
