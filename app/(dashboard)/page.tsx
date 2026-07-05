import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { filterNavItems } from "@/lib/menu";

export default async function HomePage() {
  const user = await getCurrentUser();
  const firstMenu = user ? filterNavItems(user.role, user.permissions)[0] : null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
      <section className="border-b border-amber-100 pb-8">
        <p className="text-sm font-bold uppercase text-amber-700">Welcome</p>
        <h1 className="mt-3 text-4xl font-black text-slate-950 sm:text-5xl">Welcome To FamilyHub</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Chao mung {user?.name ?? "ban"} quay lai. Hay chon mot module trong menu ben trai de tiep tuc quan ly gia dinh.
        </p>
      </section>

      <div className="grid gap-4 py-8 sm:grid-cols-2">
        <div className="rounded-lg border border-amber-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-950">Tai khoan</p>
          <p className="mt-2 text-sm text-slate-600">{user?.email}</p>
          <p className="mt-3 inline-flex rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
            {user?.role}
          </p>
        </div>

        <div className="rounded-lg border border-amber-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-950">Menu duoc cap</p>
          <p className="mt-2 text-sm text-slate-600">
            {user?.role === "ADMIN" ? "Admin co toan bo menu." : `${user?.permissions.length ?? 0} quyen menu`}
          </p>
          {firstMenu ? (
            <Link
              className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-amber-500 px-4 text-sm font-bold text-white transition hover:bg-amber-600"
              href={firstMenu.href}
            >
              Mo module dau tien
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
