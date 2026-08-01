"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { vietnamCurrentMonth, vietnamToday } from "@/lib/vietnam-date";
import { Icon, IconName } from "./icons";

type Category = string;
type FamilyMember = "CK" | "VK" | "CON";
type CategoryMeta = {
  id: Category;
  label: string;
  icon: IconName;
  badge: string;
  chart: string;
};

type Income = {
  id: number;
  amount: number;
  category: Category;
  member: FamilyMember;
  note: string;
  date: string;
};

type IncomeForm = {
  amount: string;
  category: Category;
  member: FamilyMember;
  note: string;
  date: string;
};

type Notice = {
  type: "success" | "error";
  message: string;
};

const fallbackCategoryMeta: Omit<CategoryMeta, "id" | "label"> = {
  icon: "banknote",
  badge: "bg-slate-100 text-slate-700 ring-slate-200",
  chart: "#64748b",
};

const defaultCategories: CategoryMeta[] = [
  {
    id: "Salary",
    label: "Lương",
    icon: "briefcase",
    badge: "bg-blue-50 text-blue-700 ring-blue-100",
    chart: "#3b82f6",
  },
  {
    id: "Freelance",
    label: "Làm thêm",
    icon: "sparkles",
    badge: "bg-violet-50 text-violet-700 ring-violet-100",
    chart: "#8b5cf6",
  },
  {
    id: "Bonus",
    label: "Thưởng",
    icon: "gift",
    badge: "bg-rose-50 text-rose-700 ring-rose-100",
    chart: "#f43f5e",
  },
  {
    id: "Investment",
    label: "Đầu tư",
    icon: "barChart",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    chart: "#10b981",
  },
  {
    id: "Gift",
    label: "Biếu tặng",
    icon: "heart",
    badge: "bg-amber-50 text-amber-700 ring-amber-100",
    chart: "#f59e0b",
  },
  {
    id: "Income_Others",
    label: "Khác",
    icon: "banknote",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    chart: "#64748b",
  },
];

function createEmptyForm(member: FamilyMember = "CK"): IncomeForm {
  return {
    amount: "",
    category: "Salary",
    member,
    note: "",
    date: vietnamToday(),
  };
}

const familyMembers: FamilyMember[] = ["CK", "VK", "CON"];

const memberMeta: Record<FamilyMember, { label: string; role: string; badge: string; dot: string }> = {
  CK: {
    label: "CK",
    role: "Chồng",
    badge: "bg-blue-50 text-blue-700 ring-blue-100",
    dot: "bg-blue-500",
  },
  VK: {
    label: "VK",
    role: "Vợ",
    badge: "bg-pink-50 text-pink-700 ring-pink-100",
    dot: "bg-pink-500",
  },
  CON: {
    label: "CON",
    role: "Con",
    badge: "bg-lime-50 text-lime-700 ring-lime-100",
    dot: "bg-lime-500",
  },
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function currency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function readThreeDigits(value: number, hasHigherGroup: boolean) {
  const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const hundred = Math.floor(value / 100);
  const ten = Math.floor((value % 100) / 10);
  const unit = value % 10;
  const words: string[] = [];

  if (hundred > 0) {
    words.push(digits[hundred], "trăm");
  } else if (hasHigherGroup && (ten > 0 || unit > 0)) {
    words.push("không", "trăm");
  }

  if (ten > 1) {
    words.push(digits[ten], "mươi");

    if (unit === 1) {
      words.push("mốt");
    } else if (unit === 5) {
      words.push("lăm");
    } else if (unit > 0) {
      words.push(digits[unit]);
    }
  } else if (ten === 1) {
    words.push("mười");

    if (unit === 5) {
      words.push("lăm");
    } else if (unit > 0) {
      words.push(digits[unit]);
    }
  } else if (unit > 0) {
    if (hundred > 0 || hasHigherGroup) {
      words.push("lẻ");
    }

    words.push(digits[unit]);
  }

  return words.join(" ");
}

function formatAmountInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return new Intl.NumberFormat("vi-VN").format(Number(digits));
}

/** Strip thousand separators / non-digits from a typed amount. */
function parseAmountInput(value: string) {
  return value.replace(/\D/g, "");
}

function moneyInVietnamese(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
    return "";
  }

  const units = ["", "nghìn", "triệu", "tỷ"];
  const groups: number[] = [];
  let remaining = amount;

  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const words = groups
    .map((group, index) => {
      if (group === 0) {
        return "";
      }

      const higherGroupExists = groups.slice(index + 1).some((item) => item > 0);
      return [readThreeDigits(group, higherGroupExists), units[index]].filter(Boolean).join(" ");
    })
    .filter(Boolean)
    .reverse()
    .join(" ");

  return words ? `${words} đồng` : "";
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function isSelectedMonth(date: string, selectedMonth: string) {
  const target = new Date(`${date}T00:00:00`);
  const [year, month] = selectedMonth.split("-").map(Number);
  return target.getFullYear() === year && target.getMonth() === month - 1;
}

function monthLabel(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);

  return new Intl.DateTimeFormat("vi-VN", {
    month: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border border-slate-200 bg-white shadow-sm", className)}>{children}</section>;
}

function Button({
  children,
  className,
  variant = "primary",
  type = "button",
  onClick,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
        variant === "primary" && "bg-slate-950 text-white hover:bg-slate-800",
        variant === "secondary" && "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  children,
  onClick,
  tone = "neutral",
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  tone?: "neutral" | "danger";
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2",
        tone === "neutral" && "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-950",
        tone === "danger" && "border-rose-100 text-rose-600 hover:bg-rose-50",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", className)}>
      {children}
    </span>
  );
}

function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2.5 overflow-hidden rounded-full bg-slate-100", className)}>
      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700" htmlFor={id}>
      {label}
      {children}
    </label>
  );
}

function inputClass() {
  return "h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
}

function NoticeToast({ notice, onClose }: { notice: Notice | null; onClose: () => void }) {
  if (!notice) {
    return null;
  }

  const isSuccess = notice.type === "success";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4 sm:justify-end sm:px-6">
      <div
        className={cn(
          "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border px-4 py-3 shadow-lg",
          isSuccess ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900",
        )}
        role="status"
      >
        <span
          className={cn(
            "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md",
            isSuccess ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
          )}
        >
          <Icon className="h-4 w-4" name={isSuccess ? "check" : "x"} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{isSuccess ? "Thành công" : "Thất bại"}</p>
          <p className="mt-0.5 text-sm leading-5">{notice.message}</p>
        </div>
        <button
          className={cn(
            "mt-0.5 rounded-md p-1 text-sm font-semibold transition",
            isSuccess ? "text-emerald-700 hover:bg-emerald-100" : "text-rose-700 hover:bg-rose-100",
          )}
          onClick={onClose}
          type="button"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}

function Dialog({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 py-6" role="presentation">
      <div aria-modal="true" className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl" role="dialog">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
          <IconButton label="Đóng" onClick={onClose}>
            <Icon className="h-4 w-4" name="x" />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

function IncomeDonut({
  data,
  total,
  categoryMeta,
}: {
  data: Array<{ category: Category; amount: number }>;
  total: number;
  categoryMeta: Record<string, CategoryMeta>;
}) {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-center">
      <div className="relative mx-auto h-56 w-56">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 180 180">
          <circle cx="90" cy="90" fill="none" r={radius} stroke="#f1f5f9" strokeWidth="22" />
          {data.map((item) => {
            const length = total > 0 ? (item.amount / total) * circumference : 0;
            const meta = categoryMeta[item.category] ?? { id: item.category, label: item.category, ...fallbackCategoryMeta };
            const segment = (
              <circle
                cx="90"
                cy="90"
                fill="none"
                key={item.category}
                r={radius}
                stroke={meta.chart}
                strokeDasharray={`${length} ${circumference}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                strokeWidth="22"
              />
            );
            offset += length;
            return segment;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tổng thu</p>
            <p className="mt-1 text-lg font-bold text-slate-950">{currency(total)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {data.map((item) => {
          const percent = total ? Math.round((item.amount / total) * 100) : 0;
          const meta = categoryMeta[item.category] ?? { id: item.category, label: item.category, ...fallbackCategoryMeta };
          return (
            <div key={item.category}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-2 font-medium text-slate-800">
                  <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: meta.chart }} />
                  <span className="truncate">{meta.label}</span>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-slate-800">{currency(item.amount)}</p>
                  <p className="text-xs text-slate-500">{percent}%</p>
                </div>
              </div>
              <Progress className="mt-2 h-2" value={percent} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function IncomeDashboard({
  canManageCategories = false,
  defaultMember = "CK",
}: {
  canManageCategories?: boolean;
  defaultMember?: FamilyMember;
}) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(vietnamCurrentMonth);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [memberFilter, setMemberFilter] = useState<FamilyMember | "all">("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [form, setForm] = useState<IncomeForm>(() => createEmptyForm(defaultMember));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Income | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [categories, setCategories] = useState<CategoryMeta[]>(defaultCategories);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<Category | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const amountInWords = useMemo(() => moneyInVietnamese(form.amount), [form.amount]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function showNotice(type: Notice["type"], message: string) {
    setNotice({ type, message });
  }

  const categoryMeta = useMemo(
    () =>
      categories.reduce<Record<string, CategoryMeta>>((meta, category) => {
        meta[category.id] = category;
        return meta;
      }, {}),
    [categories],
  );

  const getCategoryMeta = useCallback((category: Category) => {
    return categoryMeta[category] ?? {
      id: category,
      label: category,
      ...fallbackCategoryMeta,
    };
  }, [categoryMeta]);

  useEffect(() => {
    let isActive = true;

    async function loadCategories() {
      try {
        const response = await fetch("/api/categories?type=INCOME");

        if (!response.ok) {
          throw new Error("Không thể tải danh mục.");
        }

        const data = (await response.json()) as { categories: CategoryMeta[] };

        if (isActive && data.categories.length > 0) {
          setCategories(data.categories);
          
          setForm((current) => ({
            ...current,
            category: data.categories.some((category) => category.id === current.category) ? current.category : data.categories[0].id,
          }));
        }
      } catch (categoryError) {
        if (isActive) {
          setError(categoryError instanceof Error ? categoryError.message : "Không thể tải danh mục.");
        }
      }
    }

    void loadCategories();

    return () => {
      isActive = false;
    };
  }, []);

  const loadIncomes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/incomes?month=${encodeURIComponent(selectedMonth)}`);

      if (!response.ok) {
        throw new Error("Không thể tải danh sách thu nhập.");
      }

      const data = (await response.json()) as { incomes: Income[] };
      setIncomes(data.incomes);
    } catch (loadError) {
      setIncomes([]);
      setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách thu nhập.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    void loadIncomes();
  }, [loadIncomes]);

  const monthlyIncomes = useMemo(
    () => incomes.filter((item) => isSelectedMonth(item.date, selectedMonth)),
    [selectedMonth, incomes],
  );
  
  const totalIncome = useMemo(() => monthlyIncomes.reduce((sum, item) => sum + item.amount, 0), [monthlyIncomes]);

  const incomeByMember = useMemo(
    () =>
      familyMembers.map((member) => {
        const memberIncomes = monthlyIncomes.filter((item) => item.member === member);
        const amount = memberIncomes.reduce((sum, item) => sum + item.amount, 0);
        return {
          member,
          amount,
          count: memberIncomes.length,
          percent: totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0,
        };
      }),
    [monthlyIncomes, totalIncome],
  );

  const topEarner = useMemo(() => {
    return [...incomeByMember].sort((a, b) => b.amount - a.amount)[0];
  }, [incomeByMember]);

  const incomeByCategory = useMemo(
    () =>
      categories
        .map((category) => ({
          category: category.id,
          amount: monthlyIncomes.filter((item) => item.category === category.id).reduce((sum, item) => sum + item.amount, 0),
        }))
        .filter((item) => item.amount > 0)
        .sort((a, b) => b.amount - a.amount),
    [categories, monthlyIncomes],
  );

  const filteredIncomes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return monthlyIncomes
      .filter((item) => categoryFilter === "all" || item.category === categoryFilter)
      .filter((item) => memberFilter === "all" || item.member === memberFilter)
      .filter((item) => {
        if (!normalizedQuery) {
          return true;
        }

        return (
          item.note.toLowerCase().includes(normalizedQuery) ||
          getCategoryMeta(item.category).label.toLowerCase().includes(normalizedQuery) ||
          memberMeta[item.member].label.toLowerCase().includes(normalizedQuery) ||
          memberMeta[item.member].role.toLowerCase().includes(normalizedQuery)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [categoryFilter, memberFilter, monthlyIncomes, query, getCategoryMeta]);

  const filteredIncomeIds = useMemo(() => filteredIncomes.map((item) => item.id), [filteredIncomes]);

  const allVisibleSelected =
    filteredIncomeIds.length > 0 && filteredIncomeIds.every((id) => selectedIds.includes(id));

  const someVisibleSelected =
    filteredIncomeIds.some((id) => selectedIds.includes(id)) && !allVisibleSelected;

  const selectedIncomes = useMemo(
    () => filteredIncomes.filter((item) => selectedIds.includes(item.id)),
    [filteredIncomes, selectedIds],
  );

  const selectedTotal = useMemo(
    () => selectedIncomes.reduce((sum, item) => sum + item.amount, 0),
    [selectedIncomes],
  );

  useEffect(() => {
    setSelectedIds((current) => {
      const next = current.filter((id) => filteredIncomeIds.includes(id));
      if (next.length === current.length) {
        return current;
      }
      return next;
    });
  }, [filteredIncomeIds]);

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !filteredIncomeIds.includes(id)));
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...filteredIncomeIds])));
  }

  function toggleSelectIncome(id: number) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id],
    );
  }

  function openCreateDialog() {
    setEditingId(null);
    setForm(createEmptyForm(defaultMember));
    setIsFormOpen(true);
  }

  function openEditDialog(income: Income) {
    setEditingId(income.id);
    setForm({
      amount: String(income.amount),
      category: income.category,
      member: income.member,
      note: income.note,
      date: income.date,
    });
    setIsFormOpen(true);
  }

  function closeFormDialog() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingId(null);
    setForm(createEmptyForm(defaultMember));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);

    if (!amount || amount <= 0 || !form.date || isSaving) {
      return;
    }

    const payload = {
      amount,
      category: form.category,
      member: form.member,
      note: form.note.trim() || getCategoryMeta(form.category).label,
      date: form.date,
    };

    const wasEditing = Boolean(editingId);
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(editingId ? `/api/incomes/${editingId}` : "/api/incomes", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: editingId ? "PATCH" : "POST",
      });

      if (!response.ok) {
        throw new Error(wasEditing ? "Không thể lưu thay đổi thu nhập." : "Không thể thêm thu nhập.");
      }

      setIsFormOpen(false);
      setEditingId(null);
      setForm(createEmptyForm(defaultMember));
      await loadIncomes();
      showNotice("success", wasEditing ? "Đã cập nhật thu nhập." : "Đã thêm thu nhập.");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Không thể lưu thu nhập.";
      setError(message);
      showNotice("error", message);
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/incomes/${pendingDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Không thể xóa thu nhập.");
      }

      setPendingDelete(null);
      await loadIncomes();
      showNotice("success", "Đã xóa thu nhập.");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Không thể xóa thu nhập.";
      setError(message);
      showNotice("error", message);
    } finally {
      setIsSaving(false);
    }
  }

  function openCategoryDialog() {
    setEditingCategoryId(null);
    setCategoryDraft("");
    setCategoryError(null);
    setIsCategoryDialogOpen(true);
  }

  function startEditCategory(category: CategoryMeta) {
    setEditingCategoryId(category.id);
    setCategoryDraft(category.label);
    setCategoryError(null);
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = categoryDraft.trim();

    if (!label) {
      return;
    }

    const wasEditingCategory = Boolean(editingCategoryId);
    setIsSaving(true);
    setCategoryError(null);

    try {
      const response = await fetch(editingCategoryId ? `/api/categories/${editingCategoryId}` : "/api/categories", {
        body: JSON.stringify({ label, type: "INCOME" }),
        headers: {
          "Content-Type": "application/json",
        },
        method: editingCategoryId ? "PATCH" : "POST",
      });

      if (!response.ok) {
        throw new Error(wasEditingCategory ? "Không thể sửa danh mục." : "Không thể thêm danh mục.");
      }

      const data = (await response.json()) as { category: CategoryMeta };

      setCategories((current) => {
        if (wasEditingCategory) {
          return current.map((category) => (category.id === data.category.id ? data.category : category));
        }

        return [...current, data.category];
      });

      if (!wasEditingCategory) {
        setForm((current) => ({ ...current, category: data.category.id }));
      }

      setEditingCategoryId(null);
      setCategoryDraft("");
      showNotice("success", wasEditingCategory ? "Đã cập nhật danh mục." : "Đã thêm danh mục.");
    } catch (categorySubmitError) {
      const message = categorySubmitError instanceof Error ? categorySubmitError.message : "Không thể lưu danh mục.";
      setCategoryError(message);
      showNotice("error", message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-2.5 py-4 sm:py-5">
      <NoticeToast notice={notice} onClose={() => setNotice(null)} />
      <header className="flex flex-col gap-5 rounded-lg border border-amber-100 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Income Management</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 md:text-4xl">Quản lý thu nhập</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Theo dõi dòng tiền vào từ lương, thưởng, đầu tư và các khoản thu khác.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[auto] sm:items-end">
          <Field id="selected-month" label="Chọn tháng">
            <input
              className={cn(inputClass(), "w-full sm:w-44")}
              id="selected-month"
              onChange={(event) => setSelectedMonth(event.target.value || selectedMonth)}
              type="month"
              value={selectedMonth}
            />
          </Field>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Tổng thu nhập tháng này</p>
              <p className="mt-3 text-2xl font-bold text-emerald-700">{currency(totalIncome)}</p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-md bg-emerald-50 text-emerald-600">
              <Icon name="banknote" />
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            {monthlyIncomes.length} khoản thu trong tháng {monthLabel(selectedMonth)}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Nguồn thu lớn nhất</p>
              <p className="mt-3 text-xl font-bold text-slate-950">
                {incomeByCategory.length > 0 ? getCategoryMeta(incomeByCategory[0].category).label : "Chưa có dữ liệu"}
              </p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-md bg-blue-50 text-blue-600">
              <Icon name="trendingUp" />
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            {incomeByCategory.length > 0 ? `Chiếm ${Math.round((incomeByCategory[0].amount / totalIncome) * 100)}% tổng thu nhập` : "Đóng góp chủ đạo"}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Người đóng góp cao nhất</p>
              <p className="mt-3 text-xl font-bold text-slate-950">
                {topEarner && topEarner.amount > 0 ? `${memberMeta[topEarner.member].label} (${memberMeta[topEarner.member].role})` : "Chưa có dữ liệu"}
              </p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-md bg-violet-50 text-violet-600">
              <Icon name="sparkles" />
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            {topEarner && topEarner.amount > 0 ? currency(topEarner.amount) : "Chưa có dữ liệu thu nhập"}
          </p>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold text-slate-950">Giao dịch hằng ngày</h2>
              <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-fit" disabled={isSaving} onClick={openCreateDialog}>
                <Icon className="h-4 w-4" name="plus" />
                Add Income
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {incomeByMember.map((item) => {
                const meta = memberMeta[item.member];
                return (
                  <div className={cn("rounded-lg border border-slate-100 p-3 ring-1 ring-inset", meta.badge)} key={item.member}>
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
                      <p className="text-xs font-semibold uppercase tracking-wide">
                        {meta.label} · {meta.role}
                      </p>
                    </div>
                    <p className="mt-2 text-lg font-bold text-slate-950">{currency(item.amount)}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {item.count} khoản thu · {item.percent}% tổng thu
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[600px] xl:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icon className="h-4 w-4" name="search" />
                </span>
                <input className={cn(inputClass(), "w-full pl-9")} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm ghi chú, danh mục..." type="search" value={query} />
              </div>
              <select className={cn(inputClass(), "w-full sm:w-40")} onChange={(event) => setCategoryFilter(event.target.value as Category | "all")} value={categoryFilter}>
                <option value="all">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
              <select className={cn(inputClass(), "w-full sm:w-36")} onChange={(event) => setMemberFilter(event.target.value as FamilyMember | "all")} value={memberFilter}>
                <option value="all">Tất cả người</option>
                {familyMembers.map((member) => (
                  <option key={member} value={member}>
                    {memberMeta[member].label} - {memberMeta[member].role}
                  </option>
                ))}
              </select>
            </div>

            {selectedIncomes.length > 0 ? (
              <div className="flex flex-col gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-emerald-900">
                  Đã chọn <span className="font-bold">{selectedIncomes.length}</span> khoản thu
                </p>
                <p className="text-sm font-bold text-emerald-800">
                  Tổng: +{currency(selectedTotal)}
                </p>
              </div>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-12 px-4 py-4">
                    <input
                      aria-label="Chọn tất cả"
                      checked={allVisibleSelected}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      disabled={isLoading || filteredIncomeIds.length === 0}
                      onChange={toggleSelectAllVisible}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = someVisibleSelected;
                        }
                      }}
                      type="checkbox"
                    />
                  </th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Category</th>
                  <th className="px-5 py-4 font-semibold">Người</th>
                  <th className="px-5 py-4 font-semibold">Note</th>
                  <th className="px-5 py-4 text-right font-semibold">Amount</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm text-slate-500" colSpan={7}>
                      Đang tải thu nhập...
                    </td>
                  </tr>
                ) : null}
                {!isLoading && error ? (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm text-rose-600" colSpan={7}>
                      {error}
                    </td>
                  </tr>
                ) : null}
                {!isLoading && !error
                  ? filteredIncomes.map((income) => {
                  const meta = getCategoryMeta(income.category);
                  const member = memberMeta[income.member];
                  const isSelected = selectedIds.includes(income.id);

                  return (
                    <tr
                      className={cn(
                        "bg-white transition hover:bg-emerald-50/40",
                        isSelected && "bg-emerald-50/60",
                      )}
                      key={income.id}
                    >
                      <td className="px-4 py-4">
                        <input
                          aria-label={`Chọn thu nhập ${income.id}`}
                          checked={isSelected}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          onChange={() => toggleSelectIncome(income.id)}
                          type="checkbox"
                        />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-700">{dateLabel(income.date)}</td>
                      <td className="px-5 py-4">
                        <Badge className={meta.badge}>
                          <Icon className="h-3.5 w-3.5" name={meta.icon} />
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Badge className={member.badge}>
                          <span className={cn("h-2 w-2 rounded-full", member.dot)} />
                          {member.label}
                        </Badge>
                      </td>
                      <td className="max-w-xs px-5 py-4 text-slate-600">
                        <div className="truncate">{income.note}</div>
                        <span className="mt-1 inline-block text-xs font-medium text-slate-400">
                          Income - {member.role}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-bold text-emerald-700">
                        +{currency(income.amount)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <IconButton label="Edit income" onClick={() => openEditDialog(income)}>
                            <Icon className="h-4 w-4" name="edit" />
                          </IconButton>
                          <IconButton label="Delete income" onClick={() => setPendingDelete(income)} tone="danger">
                            <Icon className="h-4 w-4" name="trash" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
                  : null}
                {!isLoading && !error && filteredIncomes.length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm text-slate-500" colSpan={7}>
                      Không tìm thấy khoản thu phù hợp.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Phân bổ nguồn thu</h2>
              <p className="mt-1 text-sm text-slate-500">Tỷ trọng thu nhập theo danh mục.</p>
            </div>
            <Badge className="bg-slate-100 text-slate-700 ring-slate-200">{monthLabel(selectedMonth)}</Badge>
          </div>
          <IncomeDonut categoryMeta={categoryMeta} data={incomeByCategory} total={totalIncome} />
        </Card>
      </div>

      <Dialog description="Nhập số tiền, danh mục, người đóng góp và ngày phát sinh." onClose={closeFormDialog} open={isFormOpen} title={editingId ? "Edit Income" : "Add Income"}>
        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <fieldset className="grid gap-4 disabled:opacity-70" disabled={isSaving}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="amount" label="Số tiền">
                <input
                  className={cn(inputClass(), "tabular-nums")}
                  id="amount"
                  inputMode="numeric"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount: parseAmountInput(event.target.value),
                    }))
                  }
                  placeholder="Ví dụ: 2.500.000"
                  required
                  type="text"
                  value={formatAmountInput(form.amount)}
                />
              </Field>
              {amountInWords ? <p className="text-xs font-semibold text-emerald-700 sm:col-span-2">{amountInWords}</p> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Danh mục</span>
                <div className={canManageCategories ? "grid grid-cols-[1fr_auto] gap-2" : undefined}>
                  <select className={inputClass()} id="category" onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as Category }))} value={form.category}>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  {canManageCategories ? (
                    <IconButton label="Sửa danh mục" onClick={openCategoryDialog}>
                      <Icon className="h-4 w-4" name="edit" />
                    </IconButton>
                  ) : null}
                </div>
              </div>
              <Field id="member" label="Người đóng góp">
                <select className={inputClass()} id="member" onChange={(event) => setForm((current) => ({ ...current, member: event.target.value as FamilyMember }))} value={form.member}>
                  {familyMembers.map((member) => (
                    <option key={member} value={member}>
                      {memberMeta[member].label} - {memberMeta[member].role}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field id="date" label="Ngày nhận">
              <input className={inputClass()} id="date" onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} required type="date" value={form.date} />
            </Field>

            <Field id="note" label="Ghi chú">
              <input className={inputClass()} id="note" onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder="Ví dụ: Lương công ty, dự án web..." type="text" value={form.note} />
            </Field>
          </fieldset>

          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-fit" disabled={isSaving} onClick={closeFormDialog} variant="secondary">
              Hủy
            </Button>
            <Button className="w-full sm:w-fit" disabled={isSaving} type="submit">
              {isSaving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Thêm thu nhập"}
            </Button>
          </div>
        </form>
      </Dialog>

      {canManageCategories ? (
        <Dialog description="Thêm danh mục mới hoặc sửa tên danh mục đang có." onClose={() => setIsCategoryDialogOpen(false)} open={isCategoryDialogOpen} title="Quản lý danh mục">
          <form className="mt-5 grid gap-4" onSubmit={handleCategorySubmit}>
            <Field id="category-label" label={editingCategoryId ? "Tên danh mục mới" : "Thêm danh mục"}>
              <input
                className={inputClass()}
                id="category-label"
                maxLength={40}
                onChange={(event) => setCategoryDraft(event.target.value)}
                placeholder="Ví dụ: Freelance, Cổ tức..."
                required
                type="text"
                value={categoryDraft}
              />
            </Field>
            {categoryError ? <p className="text-sm font-semibold text-rose-600">{categoryError}</p> : null}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              {editingCategoryId ? (
                <Button
                  className="w-full sm:w-fit"
                  disabled={isSaving}
                  onClick={() => {
                    setEditingCategoryId(null);
                    setCategoryDraft("");
                    setCategoryError(null);
                  }}
                  variant="secondary"
                >
                  Hủy sửa
                </Button>
              ) : null}
              <Button className="w-full sm:w-fit" disabled={isSaving} type="submit">
                {isSaving ? "Đang lưu..." : editingCategoryId ? "Lưu danh mục" : "Thêm danh mục"}
              </Button>
            </div>
          </form>

          <div className="mt-5 max-h-64 space-y-2 overflow-y-auto">
            {categories.map((category) => (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3" key={category.id}>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: category.chart }} />
                  <span className="text-sm font-semibold text-slate-800">{category.label}</span>
                </div>
                <IconButton label={`Sửa ${category.label}`} onClick={() => startEditCategory(category)}>
                  <Icon className="h-4 w-4" name="edit" />
                </IconButton>
              </div>
            ))}
          </div>
        </Dialog>
      ) : null}

      <Dialog description={pendingDelete ? `Khoản thu "${pendingDelete.note}" sẽ được xóa khỏi danh sách.` : "Xác nhận xóa khoản thu."} onClose={() => setPendingDelete(null)} open={Boolean(pendingDelete)} title="Xóa khoản thu?">
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-fit" disabled={isSaving} onClick={() => setPendingDelete(null)} variant="secondary">
            Hủy
          </Button>
          <Button className="w-full sm:w-fit" disabled={isSaving} onClick={confirmDelete} variant="danger">
            {isSaving ? "Đang xóa..." : "Xóa"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
