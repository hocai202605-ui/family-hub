"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Gift,
  GraduationCap,
  Home,
  PartyPopper,
  Pencil,
  PiggyBank,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type SixJarView = {
  id: string;
  label: string;
  targetPercent: number;
  limitAmount: number;
  categoryIds: string[];
  spent: number;
};

type CategoryOption = {
  id: string;
  label: string;
};

const JAR_ICONS: Record<string, LucideIcon> = {
  NEC: Home,
  LTSS: PiggyBank,
  EDU: GraduationCap,
  PLAY: PartyPopper,
  FFA: TrendingUp,
  GIVE: Gift,
};

const MOCK_YEARLY_BUDGET = 20_000_000 * 12;

export const MOCK_JARS: SixJarView[] = [
  { id: "NEC", label: "Thiết yếu", targetPercent: 55, limitAmount: Math.round(MOCK_YEARLY_BUDGET * 0.55), categoryIds: ["Food", "Utilities", "Transport"], spent: 0 },
  { id: "LTSS", label: "Tiết kiệm dài hạn", targetPercent: 10, limitAmount: Math.round(MOCK_YEARLY_BUDGET * 0.1), categoryIds: [], spent: 0 },
  { id: "EDU", label: "Giáo dục", targetPercent: 10, limitAmount: Math.round(MOCK_YEARLY_BUDGET * 0.1), categoryIds: [], spent: 0 },
  { id: "PLAY", label: "Hưởng thụ", targetPercent: 10, limitAmount: Math.round(MOCK_YEARLY_BUDGET * 0.1), categoryIds: ["Shopping", "Entertainment"], spent: 0 },
  { id: "FFA", label: "Tự do tài chính", targetPercent: 10, limitAmount: Math.round(MOCK_YEARLY_BUDGET * 0.1), categoryIds: [], spent: 0 },
  { id: "GIVE", label: "Cho đi / Hiếu hỉ", targetPercent: 5, limitAmount: Math.round(MOCK_YEARLY_BUDGET * 0.05), categoryIds: [], spent: 0 },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function currency(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function compactCurrency(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    const v = abs / 1_000_000_000;
    return sign + (v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "")) + "B";
  }
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    return sign + (v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "")) + "M";
  }
  if (abs >= 1_000) return sign + (abs / 1_000).toFixed(0) + "K";
  return value.toString();
}

function formatAmountInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("vi-VN").format(Number(digits));
}

function parseAmountInput(value: string) {
  return value.replace(/\D/g, "");
}

export function SixJarsWidget({
  jars,
  categories,
  unassignedCategoryIds = [],
  onSaved,
}: {
  jars?: SixJarView[];
  categories: CategoryOption[];
  unassignedCategoryIds?: string[];
  onSaved?: () => void;
}) {
  const items = jars && jars.length > 0 ? jars : MOCK_JARS;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [limitDraft, setLimitDraft] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category])),
    [categories],
  );

  const ownerByCategory = useMemo(() => {
    const map: Record<string, string> = {};
    for (const jar of items) {
      for (const categoryId of jar.categoryIds) {
        map[categoryId] = jar.id;
      }
    }
    return map;
  }, [items]);

  const editingJar = items.find((jar) => jar.id === editingId) ?? null;

  function openEdit(jar: SixJarView) {
    setEditingId(jar.id);
    setLimitDraft(formatAmountInput(String(jar.limitAmount)));
    setSelectedIds(jar.categoryIds);
    setError(null);
  }

  function closeEdit() {
    if (isSaving) return;
    setEditingId(null);
    setError(null);
  }

  function toggleCategory(categoryId: string) {
    setSelectedIds((current) =>
      current.includes(categoryId) ? current.filter((id) => id !== categoryId) : [...current, categoryId],
    );
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!editingJar) return;

    const limitAmount = Number(parseAmountInput(limitDraft));
    if (!Number.isInteger(limitAmount) || limitAmount < 0) {
      setError("Hạn mức phải là số nguyên không âm.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/jars/${editingJar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limitAmount, categoryIds: selectedIds }),
      });
      if (!response.ok) {
        throw new Error("Không thể lưu lọ.");
      }
      setEditingId(null);
      onSaved?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu lọ.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="font-semibold text-slate-950">6 chiếc lọ tài chính</h2>
        <p className="mt-1 text-xs text-slate-500">Chi thực tế so với hạn mức năm. Bấm Sửa để gán danh mục và đổi hạn mức.</p>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((jar) => {
          const Icon = JAR_ICONS[jar.id] ?? Home;
          const ratio = jar.limitAmount > 0 ? jar.spent / jar.limitAmount : jar.spent > 0 ? 2 : 0;
          const percent = Math.round(ratio * 100);
          const over = ratio > 1;

          return (
            <div key={jar.id} className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-slate-700 ring-1 ring-zinc-200">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{jar.label}</p>
                    <p className="text-[11px] font-medium text-slate-500">{jar.targetPercent}% mục tiêu · {jar.categoryIds.length} danh mục</p>
                  </div>
                </div>
                <button
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 text-[11px] font-semibold text-slate-700 outline-none transition hover:bg-zinc-50 focus:ring-2 focus:ring-rose-100"
                  onClick={() => openEdit(jar)}
                  type="button"
                >
                  <Pencil className="h-3 w-3" />
                  Sửa
                </button>
              </div>

              <p className="mt-3 text-sm font-semibold tabular-nums text-slate-900">
                {compactCurrency(jar.spent)}
                <span className="font-medium text-slate-400"> / {compactCurrency(jar.limitAmount)}</span>
              </p>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", over ? "bg-rose-500" : "bg-emerald-500")}
                  style={{ width: `${Math.min(Math.max(ratio * 100, 0), 100)}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className={cn("text-[11px] font-semibold", over ? "text-rose-600" : "text-slate-500")}>
                  {percent}% đã dùng
                </span>
                {over ? (
                  <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-100">
                    Vượt hạn mức
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {unassignedCategoryIds.length > 0 ? (
        <p className="mt-3 text-[11px] text-slate-500">
          {unassignedCategoryIds.length} danh mục chưa gán lọ — mở Sửa để tích vào hũ phù hợp.
        </p>
      ) : null}

      {editingJar ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 py-6" role="presentation">
          <div aria-modal="true" className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" role="dialog">
            <form onSubmit={handleSave}>
              <div className="flex items-start justify-between gap-4 border-b border-amber-100 bg-gradient-to-r from-amber-50/90 via-white to-rose-50/50 p-5">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Sửa lọ {editingJar.label}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Đặt hạn mức năm và tích các danh mục chi vào hũ này. Danh mục đang ở hũ khác sẽ được chuyển sang.
                  </p>
                </div>
                <button
                  className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600"
                  onClick={closeEdit}
                  type="button"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 p-5">
                <label className="block text-sm font-medium text-slate-700" htmlFor="jar-limit">
                  Hạn mức năm
                </label>
                <input
                  className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm tabular-nums outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  id="jar-limit"
                  inputMode="numeric"
                  onChange={(event) => setLimitDraft(formatAmountInput(event.target.value))}
                  value={limitDraft}
                />
                <p className="text-xs text-slate-500">Gợi ý {editingJar.targetPercent}% ngân sách năm · hiện {currency(editingJar.limitAmount)}</p>

                <p className="text-sm font-medium text-slate-700">Danh mục trong lọ</p>
                <div className="max-h-64 space-y-1 overflow-auto rounded-lg border border-slate-100 p-2">
                  {categories.length === 0 ? (
                    <p className="px-2 py-4 text-center text-sm text-slate-500">Chưa có danh mục chi.</p>
                  ) : (
                    categories.map((category) => {
                      const ownerId = ownerByCategory[category.id];
                      const otherJar = ownerId && ownerId !== editingJar.id
                        ? items.find((jar) => jar.id === ownerId)
                        : null;
                      const checked = selectedIds.includes(category.id);
                      return (
                        <label
                          className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
                          key={category.id}
                        >
                          <input
                            checked={checked}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                            onChange={() => toggleCategory(category.id)}
                            type="checkbox"
                          />
                          <span className="min-w-0">
                            <span className="block font-medium text-slate-900">{category.label}</span>
                            {otherJar && !checked ? (
                              <span className="text-[11px] text-slate-400">Đang ở lọ {otherJar.label}</span>
                            ) : null}
                            {otherJar && checked ? (
                              <span className="text-[11px] text-amber-700">Sẽ chuyển từ lọ {otherJar.label}</span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                {error ? <p className="text-sm text-rose-600">{error}</p> : null}

                <div className="flex justify-end gap-2">
                  <button
                    className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                    onClick={closeEdit}
                    type="button"
                  >
                    Hủy
                  </button>
                  <button
                    className="h-10 rounded-md bg-rose-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
                    disabled={isSaving}
                    type="submit"
                  >
                    {isSaving ? "Đang lưu..." : "Lưu lọ"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
