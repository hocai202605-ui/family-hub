import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  isActive: z.boolean().optional(),
});

function userId(params: { id: string }) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function isLastActiveAdmin(id: number) {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user || user.role !== "ADMIN" || !user.isActive) {
    return false;
  }

  const adminCount = await prisma.user.count({
    where: {
      role: "ADMIN",
      isActive: true,
      NOT: { id },
    },
  });

  return adminCount === 0;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApiAccess(request);
  if ("response" in auth) return auth.response;

  const id = userId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  const parsed = updateUserSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid user payload." }, { status: 400 });
  }

  if ((parsed.data.role === "USER" || parsed.data.isActive === false) && (await isLastActiveAdmin(id))) {
    return NextResponse.json({ error: "Cannot disable or demote the last active admin." }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: parsed.data,
      include: { menuPermissions: true },
    });

    if (user.role === "ADMIN") {
      await prisma.menuPermission.deleteMany({ where: { userId: user.id } });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        permissions: user.role === "ADMIN" ? [] : user.menuPermissions.map((permission) => permission.menuKey),
      },
    });
  } catch {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApiAccess(request);
  if ("response" in auth) return auth.response;

  const id = userId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  if (auth.user.id === id) {
    return NextResponse.json({ error: "Cannot delete your own account." }, { status: 400 });
  }

  if (await isLastActiveAdmin(id)) {
    return NextResponse.json({ error: "Cannot delete the last active admin." }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
}
