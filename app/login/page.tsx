import { prisma } from "@/lib/prisma";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams?: { next?: string } }) {
  const nextParam = searchParams?.next;
  const nextPath = nextParam && nextParam.startsWith("/") ? nextParam : "/expenses";

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
