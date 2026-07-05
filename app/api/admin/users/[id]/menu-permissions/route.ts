import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAccess } from "@/lib/auth";
import { allMenuKeys, type MenuKey } from "@/lib/menu";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const permissionSchema = z.object({
  permissions: z.array(z.string().refine((menuKey) => allMenuKeys.includes(menuKey as MenuKey))),
});

function userId(params: { id: string }) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApiAccess(request);
  if ("response" in auth) return auth.response;

  const id = userId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  const parsed = permissionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid permissions payload." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (user.role === "ADMIN") {
    await prisma.menuPermission.deleteMany({ where: { userId: id } });
    return NextResponse.json({ permissions: [] });
  }

  await prisma.$transaction([
    prisma.menuPermission.deleteMany({ where: { userId: id } }),
    prisma.menuPermission.createMany({
      data: parsed.data.permissions.map((menuKey) => ({ userId: id, menuKey })),
      skipDuplicates: true,
    }),
  ]);

  return NextResponse.json({ permissions: parsed.data.permissions });
}
