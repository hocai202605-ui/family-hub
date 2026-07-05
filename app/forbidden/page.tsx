import Link from "next/link";
import { Icon } from "@/app/(dashboard)/components/icons";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf3] px-4 py-10 text-slate-950">
      <section className="w-full max-w-lg rounded-lg border border-amber-100 bg-white p-6 text-center shadow-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-amber-100 text-amber-700">
          <Icon name="key" />
        </span>
        <h1 className="mt-5 text-xl font-bold">Khong co quyen truy cap</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Tai khoan cua ban chua duoc admin cap menu nay.</p>
        <Link
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-amber-500 px-4 text-sm font-bold text-white transition hover:bg-amber-600"
          href="/login"
        >
          Ve trang login
        </Link>
      </section>
    </main>
  );
}
