import { prisma } from "@/lib/prisma";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

const DEFAULT_AFTER_LOGIN = "/expenses";

function resolveNextPath(nextParam?: string) {
  if (!nextParam || !nextParam.startsWith("/") || nextParam.startsWith("//")) {
    return DEFAULT_AFTER_LOGIN;
  }

  // Root / welcome page is not a useful post-login destination.
  if (nextParam === "/" || nextParam === "/login" || nextParam.startsWith("/login?")) {
    return DEFAULT_AFTER_LOGIN;
  }

  return nextParam;
}

export default async function LoginPage({ searchParams }: { searchParams?: { next?: string } }) {
  const nextPath = resolveNextPath(searchParams?.next);

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf3] px-4 py-10 text-slate-950">
      <LoginForm nextPath={nextPath} users={users} />
    </main>
  );
}
