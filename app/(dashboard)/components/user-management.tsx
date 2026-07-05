"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { allMenuKeys, navItems } from "@/lib/menu";
import type { MenuKey } from "@/lib/menu";
import { Icon } from "./icons";

type ManagedUser = {
  id: number;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  lastLoginAt: string | null;
  permissions: string[];
};

type UserForm = {
  email: string;
  name: string;
  password: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  permissions: MenuKey[];
};

const emptyForm: UserForm = {
  email: "",
  name: "",
  password: "",
  role: "USER",
  isActive: true,
  permissions: [],
};

const menuOptions = navItems.flatMap((item) => {
  const parent = item.children ? [] : [{ key: item.menuKey, label: item.label, description: item.description, adminOnly: item.adminOnly }];
  const children = item.children?.map((child) => ({
    key: child.menuKey,
    label: `${item.label} / ${child.label}`,
    description: child.description,
    adminOnly: child.adminOnly,
  }));

  return [...parent, ...(children ?? [])];
});

function formatDate(value: string | null) {
  if (!value) return "Chua dang nhap";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function uniquePermissions(permissions: string[]) {
  return permissions.filter((permission): permission is MenuKey => allMenuKeys.includes(permission as MenuKey));
}

export function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selectedId, setSelectedId] = useState<number | "new">("new");
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const selectedUser = useMemo(() => users.find((user) => user.id === selectedId) ?? null, [selectedId, users]);

  async function loadUsers() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Khong the tai danh sach user.");
      const data = await response.json();
      setUsers(data.users ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Khong the tai danh sach user.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      setForm({
        email: selectedUser.email,
        name: selectedUser.name,
        password: "",
        role: selectedUser.role,
        isActive: selectedUser.isActive,
        permissions: uniquePermissions(selectedUser.permissions),
      });
    } else {
      setForm(emptyForm);
    }
  }, [selectedUser]);

  function togglePermission(menuKey: MenuKey) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(menuKey)
        ? current.permissions.filter((permission) => permission !== menuKey)
        : [...current.permissions, menuKey],
    }));
  }

  async function savePermissions(userId: number, permissions: MenuKey[]) {
    const response = await fetch(`/api/admin/users/${userId}/menu-permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || "Khong the luu quyen menu.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      if (selectedUser) {
        const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            role: form.role,
            isActive: form.isActive,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || "Khong the cap nhat user.");
        }

        if (form.role === "USER") {
          await savePermissions(selectedUser.id, form.permissions);
        }

        setSuccess("Da cap nhat user.");
      } else {
        const response = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || "Khong the tao user.");
        }

        const data = await response.json();
        setSelectedId(data.user.id);
        setSuccess("Da tao user.");
      }

      await loadUsers();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Khong the luu user.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!selectedUser || !form.password) return;
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: form.password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Khong the reset mat khau.");
      }

      setForm((current) => ({ ...current, password: "" }));
      setSuccess("Da reset mat khau.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Khong the reset mat khau.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedUser || !window.confirm(`Xoa user ${selectedUser.email}?`)) return;
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Khong the xoa user.");
      }

      setSelectedId("new");
      setSuccess("Da xoa user.");
      await loadUsers();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Khong the xoa user.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 border-b border-amber-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-amber-700">Admin</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Quan ly user</h1>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-amber-500 px-4 text-sm font-bold text-white transition hover:bg-amber-600"
          onClick={() => setSelectedId("new")}
          type="button"
        >
          <Icon className="h-4 w-4" name="plus" />
          Tao user
        </button>
      </header>

      {error ? <p className="rounded-md bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      {success ? <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{success}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold">User</th>
                  <th className="px-4 py-3 font-bold">Role</th>
                  <th className="px-4 py-3 font-bold">Trang thai</th>
                  <th className="px-4 py-3 font-bold">Quyen menu</th>
                  <th className="px-4 py-3 font-bold">Lan dang nhap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                      Dang tai...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                      Chua co user.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      className={selectedId === user.id ? "bg-amber-50" : "cursor-pointer transition hover:bg-slate-50"}
                      key={user.id}
                      onClick={() => setSelectedId(user.id)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-950">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{user.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={user.isActive ? "text-emerald-700" : "text-rose-700"}>
                          {user.isActive ? "Active" : "Locked"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{user.role === "ADMIN" ? "Tat ca" : user.permissions.length}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(user.lastLoginAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <form className="rounded-lg border border-slate-200 bg-white p-5" onSubmit={handleSubmit}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-950">{selectedUser ? "Cap nhat user" : "Tao user moi"}</h2>
            {selectedUser ? (
              <button
                className="inline-flex h-9 items-center gap-2 rounded-md border border-rose-200 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50"
                disabled={isSaving}
                onClick={handleDelete}
                type="button"
              >
                <Icon className="h-3.5 w-3.5" name="trash" />
                Xoa
              </button>
            ) : null}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Ten</span>
              <input
                className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
                value={form.name}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Email</span>
              <input
                className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-50"
                disabled={Boolean(selectedUser)}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
                type="email"
                value={form.email}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">{selectedUser ? "Mat khau moi" : "Mat khau tam"}</span>
              <input
                className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                minLength={6}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required={!selectedUser}
                type="password"
                value={form.password}
              />
            </label>

            {selectedUser ? (
              <button
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                disabled={isSaving || form.password.length < 6}
                onClick={handleResetPassword}
                type="button"
              >
                <Icon className="h-3.5 w-3.5" name="key" />
                Reset mat khau
              </button>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Role</span>
                <select
                  className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as "ADMIN" | "USER" }))}
                  value={form.role}
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>

              <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-slate-700">
                <input
                  checked={form.isActive}
                  className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                  type="checkbox"
                />
                Active
              </label>
            </div>

            <div className={form.role === "ADMIN" ? "opacity-50" : ""}>
              <p className="mb-2 text-sm font-semibold text-slate-700">Quyen menu</p>
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-3">
                {menuOptions
                  .filter((option) => !option.adminOnly)
                  .map((option) => (
                    <label className="flex items-start gap-3 rounded-md px-2 py-2 text-sm hover:bg-slate-50" key={option.key}>
                      <input
                        checked={form.role === "ADMIN" || form.permissions.includes(option.key)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                        disabled={form.role === "ADMIN"}
                        onChange={() => togglePermission(option.key)}
                        type="checkbox"
                      />
                      <span>
                        <span className="block font-semibold text-slate-800">{option.label}</span>
                        <span className="block text-xs text-slate-500">{option.description}</span>
                      </span>
                    </label>
                  ))}
              </div>
            </div>
          </div>

          <button
            className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-md bg-amber-500 px-4 text-sm font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Dang luu..." : "Luu user"}
          </button>
        </form>
      </div>
    </div>
  );
}
