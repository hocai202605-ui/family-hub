import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { MenuKey } from "@/lib/menu";

export const SESSION_COOKIE = "family_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_ITERATIONS = 210000;

type SessionPayload = {
  userId: number;
  email: string;
  role: "ADMIN" | "USER";
  exp: number;
};

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  permissions: string[];
};

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function getSessionSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "family-dashboard-dev-secret-change-me";
}

function signPayload(payload: string) {
  return crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, 32, "sha512").toString("base64url");
  return `pbkdf2$${PASSWORD_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [kind, iterationsRaw, salt, expectedHash] = storedHash.split("$");
  const iterations = Number(iterationsRaw);

  if (kind !== "pbkdf2" || !iterations || !salt || !expectedHash) {
    return false;
  }

  const actualHash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha512").toString("base64url");
  return safeEqual(actualHash, expectedHash);
}

export function createSessionToken(user: { id: number; email: string; role: "ADMIN" | "USER" }) {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | undefined) {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || !safeEqual(signPayload(encodedPayload), signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;

    if (!payload.userId || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, user: { id: number; email: string; role: "ADMIN" | "USER" }) {
  response.cookies.set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

async function userFromSessionPayload(payload: SessionPayload | null): Promise<AuthUser | null> {
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { menuPermissions: true },
  });

  if (!user || !user.isActive) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    permissions: user.menuPermissions.map((permission) => permission.menuKey),
  };
}

export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return userFromSessionPayload(verifySessionToken(token));
}

export async function getCurrentUserFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return userFromSessionPayload(verifySessionToken(token));
}

export function canAccessMenu(user: AuthUser, menuKey: MenuKey) {
  return user.role === "ADMIN" || user.permissions.includes(menuKey);
}

export async function requirePageAccess(menuKey: MenuKey) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canAccessMenu(user, menuKey)) {
    redirect("/login");
  }

  return user;
}

export async function requireApiAccess(request: NextRequest, menuKey?: MenuKey) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (menuKey && !canAccessMenu(user, menuKey)) {
    return { response: NextResponse.json({ error: "Permission denied." }, { status: 403 }) };
  }

  return { user };
}

export async function requireAnyApiAccess(request: NextRequest, menuKeys: MenuKey[]) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (user.role !== "ADMIN" && !menuKeys.some((menuKey) => user.permissions.includes(menuKey))) {
    return { response: NextResponse.json({ error: "Permission denied." }, { status: 403 }) };
  }

  return { user };
}

export async function requireAdminApiAccess(request: NextRequest) {
  const auth = await requireApiAccess(request);

  if ("response" in auth) {
    return auth;
  }

  if (auth.user.role !== "ADMIN") {
    return { response: NextResponse.json({ error: "Admin permission required." }, { status: 403 }) };
  }

  return auth;
}
