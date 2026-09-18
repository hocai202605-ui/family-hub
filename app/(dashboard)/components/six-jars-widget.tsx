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
  spentSource?: "expenses" | "investments";
  syncHint?: string;
  syncDialog?: string;
  syncNote?: string;
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

const JAR_THEME: Record<string, { icon: string; bar: string; card: string; track: string }> = {
  NEC: {
    icon: "bg-indigo-50 text-indigo-600",
    bar: "bg-indigo-500",
    card: "border-indigo-200/80 bg-indigo-50/70 hover:border-indigo-300",
    track: "bg-indigo-100/80",
  },
  LTSS: {
    icon: "bg-emerald-50 text-emerald-600",
    bar: "bg-emerald-500",
    card: "border-emerald-200/80 bg-emerald-50/70 hover:border-emerald-300",
    track: "bg-emerald-100/80",
  },
  EDU: {
    icon: "bg-amber-50 text-amber-600",
    bar: "bg-amber-500",
    card: "border-amber-200/80 bg-amber-50/70 hover:border-amber-300",
    track: "bg-amber-100/80",
  },
  PLAY: {
    icon: "bg-rose-50 text-rose-600",
    bar: "bg-rose-500",
    card: "border-rose-200/80 bg-rose-50/70 hover:border-rose-300",
    track: "bg-rose-100/80",
  },
  FFA: {
    icon: "bg-sky-50 text-sky-600",
    bar: "bg-sky-500",
    card: "border-sky-200/80 bg-sky-50/70 hover:border-sky-300",
    track: "bg-sky-100/80",
  },
  GIVE: {
    icon: "bg-purple-50 text-purple-600",
    bar: "bg-purple-500",
    card: "border-purple-200/80 bg-purple-50/70 hover:border-purple-300",
    track: "bg-purple-100/80",
  },
};

const MOCK_YEARLY_BUDGET = 20_000_000 * 12;

export const MOCK_JARS: SixJarView[] = [
  { id: "NEC", label: "Thiết yếu", targetPercent: 55, limitAmount: Math.round(MOCK_YEARLY_BUDGET * 0.55), categoryIds: ["Food", "Utilities", "Transport"], spent: 0 },
  { id: "FFA", label: "Tự do tài chính", targetPercent: 10, limitAmount: Math.round(MOCK_YEARLY_BUDGET * 0.1), categoryIds: [], spent: 0 },
  { id: "LTSS", label: "Tiết kiệm dài hạn", targetPercent: 10, limitAmount: Math.round(MOCK_YEARLY_BUDGET * 0.1), categoryIds: [], spent: 0 },
  { id: "PLAY", label: "Hưởng thụ", targetPercent: 10, limitAmount: Math.round(MOCK_YEARLY_BUDGET * 0.1), categoryIds: ["Shopping", "Entertainment"], spent: 0 },
  { id: "EDU", label: "Giáo dục", targetPercent: 10, limitAmount: Math.round(MOCK_YEARLY_BUDGET * 0.1), categoryIds: [], spent: 0 },
  { id: "GIVE", label: "Cho đi / Hiếu hỉ", targetPercent: 5, limitAmount: Math.round(MOCK_YEARLY_BUDGET * 0.05), categoryIds: [], spent: 0 },
];

const JAR_DISPLAY_ORDER = ["NEC", "FFA", "LTSS", "PLAY", "EDU", "GIVE"];

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

function formatMillions(value: number) {
  const abs = Math.abs(value);
  const v = abs / 1_000_000;
  const formatted = v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "");
  return `${value < 0 ? "-" : ""}${formatted}M`;
}

function jarProgressStatus(spent: number, limitAmount: number) {
  if (spent <= 0) {
    return { text: "Chưa phát sinh", className: "text-xs text-zinc-400", over: false };
  }

  const ratio = limitAmount > 0 ? spent / limitAmount : 2;
  const percent = Math.round(ratio * 100);
  const remaining = Math.max(limitAmount - spent, 0);
  const overSpent = Math.max(spent - limitAmount, 0);

  if (percent > 100) {
    return {
      text: `Vượt hạn mức (+${formatMillions(overSpent)})`,
      className: "text-xs font-medium text-rose-600",
      over: true,
    };
  }

  if (percent >= 80) {
    return {
      text: `Sắp chạm trần (${percent}%) · Còn ${formatMillions(remaining)}`,
      className: "text-xs font-medium text-amber-600",
      over: false,
    };
  }

  return {
    text: `Đã chi ${percent}% · Còn lại ${formatMillions(remaining)}`,
    className: "text-xs text-zinc-500",
    over: false,
  };
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
  const items = [...(jars && jars.length > 0 ? jars : MOCK_JARS)].sort((a, b) => {
    const left = JAR_DISPLAY_ORDER.indexOf(a.id);
    const right = JAR_DISPLAY_ORDER.indexOf(b.id);
    return (left === -1 ? 99 : left) - (right === -1 ? 99 : right);
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [percentDraft, setPercentDraft] = useState("");
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
    setLabelDraft(jar.label);
    setPercentDraft(String(jar.targetPercent));
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

    const label = labelDraft.trim();
    if (!label) {
      setError("Tên lọ không được để trống.");
      return;
    }
    if (label.length > 40) {
      setError("Tên lọ tối đa 40 ký tự.");
      return;
    }

    const targetPercent = Number(percentDraft.replace(/\D/g, ""));
    if (!Number.isInteger(targetPercent) || targetPercent < 0 || targetPercent > 100) {
      setError("Mục tiêu phải từ 0% đến 100%.");
      return;
    }

    const limitAmount = Number(parseAmountInput(limitDraft));
    if (!Number.isInteger(limitAmount) || limitAmount < 0) {
      setError("Hạn mức phải là số nguyên không âm.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const payload =
        editingJar.spentSource === "investments"
          ? { label, targetPercent, limitAmount }
          : { label, targetPercent, limitAmount, categoryIds: selectedIds };
      const response = await fetch(`/api/jars/${editingJar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    <div className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="font-semibold text-slate-950">6 chiếc lọ tài chính</h2>
        <p className="mt-1 text-xs text-slate-500">Chi thực tế so với hạn mức năm. Bấm Sửa để đổi tên lọ, hạn mức và danh mục.</p>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((jar) => {
          const Icon = JAR_ICONS[jar.id] ?? Home;
          const theme = JAR_THEME[jar.id] ?? JAR_THEME.NEC;
          const ratio = jar.limitAmount > 0 ? jar.spent / jar.limitAmount : jar.spent > 0 ? 2 : 0;
          const status = jarProgressStatus(jar.spent, jar.limitAmount);

          return (
            <div
              key={jar.id}
              className={cn(
                "rounded-xl border p-3 transition-all duration-200 hover:shadow-md",
                theme.card,
              )}
            >
              <div className="relative pr-8">
                <button
                  aria-label={`Sửa lọ ${jar.label}`}
                  className="absolute right-0 top-0 rounded-lg p-1.5 text-zinc-400 outline-none transition hover:bg-zinc-100 hover:text-zinc-600"
                  onClick={() => openEdit(jar)}
                  type="button"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", theme.icon)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-snug text-zinc-900">{jar.label}</p>
                    <p className="text-[11px] font-medium text-zinc-500">
                      {jar.targetPercent}% mục tiêu
                      {jar.spentSource === "investments"
                        ? ` · ${jar.syncHint ?? "Đầu tư"}`
                        : ` · ${jar.categoryIds.length} danh mục`}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-3 tabular-nums">
                <span className="text-lg font-bold text-zinc-900">{compactCurrency(jar.spent)}</span>
                <span className="text-sm font-medium text-zinc-400"> / {compactCurrency(jar.limitAmount)}</span>
              </p>

              <div className={cn("mt-2 h-2 overflow-hidden rounded-full", theme.track)}>
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    status.over ? "bg-rose-500" : theme.bar,
                  )}
                  style={{ width: `${Math.min(Math.max(ratio * 100, 0), 100)}%` }}
                />
              </div>
              <p className={cn("mt-1.5", status.className)}>{status.text}</p>
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
                    {editingJar.spentSource === "investments"
                      ? editingJar.syncDialog ?? "Đổi tên và hạn mức. Số thực tế đồng bộ từ đầu tư theo năm đang xem."
                      : "Đổi tên lọ, hạn mức năm và tích danh mục chi vào hũ này. Danh mục đang ở hũ khác sẽ được chuyển sang."}
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
                <label className="block text-sm font-medium text-slate-700" htmlFor="jar-label">
                  Tên lọ
                </label>
                <input
                  className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  id="jar-label"
                  maxLength={40}
                  onChange={(event) => setLabelDraft(event.target.value)}
                  value={labelDraft}
                />

                <label className="block text-sm font-medium text-slate-700" htmlFor="jar-target">
                  Mục tiêu (%)
                </label>
                <input
                  className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm tabular-nums outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  id="jar-target"
                  inputMode="numeric"
                  max={100}
                  min={0}
                  onChange={(event) => setPercentDraft(event.target.value.replace(/\D/g, "").slice(0, 3))}
                  value={percentDraft}
                />
                <p className="text-xs text-slate-500">Hiển thị trên card lọ, từ 0 đến 100.</p>

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
                <p className="text-xs text-slate-500">
                  Gợi ý {percentDraft || editingJar.targetPercent}% ngân sách năm · hiện {currency(editingJar.limitAmount)}
                </p>

                {editingJar.spentSource === "investments" ? (
                  <p className="rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-xs leading-5 text-emerald-800">
                    {editingJar.syncNote ?? "Số thực tế đồng bộ từ đầu tư theo năm báo cáo. Không gán danh mục chi."}
                  </p>
                ) : null}

                {editingJar.spentSource === "investments" ? null : (
                <>
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
                </>
                )}

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
