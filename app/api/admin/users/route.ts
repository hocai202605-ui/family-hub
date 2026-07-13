import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auditUsername } from "@/lib/audit";
import { hashPassword, requireAdminApiAccess } from "@/lib/auth";
import { allMenuKeys, type MenuKey } from "@/lib/menu";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createUserSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(80),
  password: z.string().min(6).max(120),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
  isActive: z.boolean().default(true),
  permissions: z.array(z.string().refine((menuKey) => allMenuKeys.includes(menuKey as MenuKey))).default([]),
});

function toUserResponse(user: {
  id: number;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  menuPermissions: Array<{ menuKey: string }>;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    permissions: user.menuPermissions.map((permission) => permission.menuKey),
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApiAccess(request);
  if ("response" in auth) return auth.response;

  const users = await prisma.user.findMany({
    include: { menuPermissions: { orderBy: { menuKey: "asc" } } },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });

  return NextResponse.json({ users: users.map(toUserResponse), menuKeys: allMenuKeys });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApiAccess(request);
  if ("response" in auth) return auth.response;

  const parsed = createUserSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid user payload." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  try {
    const username = auditUsername(auth.user);
    const user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name,
        passwordHash: hashPassword(parsed.data.password),
        role: parsed.data.role,
        isActive: parsed.data.isActive,
        createdBy: username,
        updatedBy: username,
        menuPermissions:
          parsed.data.role === "USER"
            ? {
                create: parsed.data.permissions.map((menuKey) => ({
                  menuKey,
                  createdBy: username,
                  updatedBy: username,
                })),
              }
            : undefined,
      },
      include: { menuPermissions: true },
    });

    return NextResponse.json({ user: toUserResponse(user) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Email already exists." }, { status: 409 });
  }
}
