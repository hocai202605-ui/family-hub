import { LoginForm } from "./login-form";

export default function LoginPage({ searchParams }: { searchParams?: { next?: string } }) {
  const nextParam = searchParams?.next;
  const nextPath = nextParam && nextParam.startsWith("/") ? nextParam : "/";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf3] px-4 py-10 text-slate-950">
      <LoginForm nextPath={nextPath} />
    </main>
  );
}
