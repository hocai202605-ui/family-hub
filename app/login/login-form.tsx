"use client";

import { FormEvent, useState } from "react";
import { Icon } from "@/app/(dashboard)/components/icons";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Dang nhap khong thanh cong.");
      }

      window.location.href = nextPath;
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Dang nhap khong thanh cong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-lg border border-amber-100 bg-white p-6 shadow-sm">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-amber-100 text-amber-700">
          <Icon name="key" />
        </span>
        <div>
          <h1 className="text-xl font-bold">Dang nhap Family Hub</h1>
          <p className="mt-1 text-sm text-slate-500">Nhap tai khoan duoc admin cap.</p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Email</span>
          <input
            autoComplete="email"
            className="mt-2 h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Mat khau</span>
          <input
            autoComplete="current-password"
            className="mt-2 h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p> : null}

        <button
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-amber-500 px-4 text-sm font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Dang kiem tra..." : "Dang nhap"}
        </button>
      </form>
    </section>
  );
}
