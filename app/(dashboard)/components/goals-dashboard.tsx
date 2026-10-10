"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Icon, IconName } from "./icons";

type GoalType = "HOME" | "CAR" | "EDUCATION" | "TRAVEL" | "OTHER";

type Goal = {
  id: number;
  title: string;
  goalType: GoalType;
  targetYear: number;
  targetAmount: number;
  currentAmount: number;
  imageUrl: string;
  note: string;
  sortOrder: number;
};

type GoalForm = {
  title: string;
  goalType: GoalType;
  targetYear: string;
  targetAmount: string;
  currentAmount: string;
  imageUrl: string;
  note: string;
  sortOrder: string;
};

const goalTypes: Array<{ value: GoalType; label: string; icon: IconName; badge: string; color: string }> = [
  { value: "HOME", label: "Nhà", icon: "home", badge: "bg-sky-50 text-sky-700 ring-sky-100", color: "#0ea5e9" },
  { value: "CAR", label: "Xe", icon: "trendingUp", badge: "bg-emerald-50 text-emerald-700 ring-emerald-100", color: "#10b981" },
  { value: "EDUCATION", label: "Giáo dục", icon: "briefcase", badge: "bg-violet-50 text-violet-700 ring-violet-100", color: "#8b5cf6" },
  { value: "TRAVEL", label: "Du lịch", icon: "plane", badge: "bg-amber-50 text-amber-700 ring-amber-100", color: "#f59e0b" },
  { value: "OTHER", label: "Khác", icon: "target", badge: "bg-slate-100 text-slate-700 ring-slate-200", color: "#64748b" },
];

const goalTypeMeta = goalTypes.reduce<Record<GoalType, (typeof goalTypes)[number]>>((meta, item) => {
  meta[item.value] = item;
  return meta;
}, {} as Record<GoalType, (typeof goalTypes)[number]>);

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

function formatAmountInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("vi-VN").format(Number(digits));
}

function parseAmountInput(value: string) {
  return value.replace(/\D/g, "");
}

function progressPercent(goal: Pick<Goal, "targetAmount" | "currentAmount">) {
  if (goal.targetAmount <= 0) return 0;
  return Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 1000) / 10);
}

function remainingAmount(goal: Pick<Goal, "targetAmount" | "currentAmount">) {
  return Math.max(0, goal.targetAmount - goal.currentAmount);
}

function monthsUntilTargetYear(targetYear: number) {
  const now = new Date();
  const target = new Date(targetYear, 11, 31);
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()) + 1;
  return Math.max(1, months);
}

function monthlySaving(goal: Pick<Goal, "targetAmount" | "currentAmount" | "targetYear">) {
  return Math.ceil(remainingAmount(goal) / monthsUntilTargetYear(goal.targetYear));
}

function createEmptyForm(nextSortOrder: number): GoalForm {
  return {
    title: "",
    goalType: "HOME",
    targetYear: "2030",
    targetAmount: "",
    currentAmount: "",
    imageUrl: "",
    note: "",
    sortOrder: String(nextSortOrder),
  };
}

function formFromGoal(goal: Goal): GoalForm {
  return {
    title: goal.title,
    goalType: goal.goalType,
    targetYear: String(goal.targetYear),
    targetAmount: String(goal.targetAmount),
    currentAmount: String(goal.currentAmount),
    imageUrl: goal.imageUrl,
    note: goal.note,
    sortOrder: String(goal.sortOrder),
  };
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

function Dialog({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 px-4 py-6" role="presentation">
      <div className="flex min-h-full items-center justify-center">
        <div aria-modal="true" className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-xl" role="dialog">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-lg border-b border-slate-100 bg-white p-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Điền số liệu và upload ảnh thực tế để mục tiêu trực quan hơn.</p>
            </div>
            <IconButton label="Đóng" onClick={onClose}>
              <Icon className="h-4 w-4" name="x" />
            </IconButton>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function GoalsDashboard() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<GoalForm>(() => createEmptyForm(1));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Goal | null>(null);

  const nextSortOrder = useMemo(() => Math.max(0, ...goals.map((goal) => goal.sortOrder)) + 1, [goals]);

  useEffect(() => {
    let isActive = true;

    async function loadGoals() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/goals");
        if (!response.ok) throw new Error("Không thể tải danh sách mục tiêu.");
        const data = (await response.json()) as { goals: Goal[] };
        if (isActive) setGoals(data.goals);
      } catch (loadError) {
        if (isActive) {
          setGoals([]);
          setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách mục tiêu.");
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadGoals();
    return () => {
      isActive = false;
    };
  }, []);

  const summary = useMemo(() => {
    const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const totalCurrent = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    const totalRemaining = Math.max(0, totalTarget - totalCurrent);
    return {
      totalTarget,
      totalCurrent,
      totalRemaining,
      progress: totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 1000) / 10 : 0,
    };
  }, [goals]);

  function openCreateDialog() {
    setEditingId(null);
    setForm(createEmptyForm(nextSortOrder));
    setError(null);
    setIsFormOpen(true);
  }

  function openEditDialog(goal: Goal) {
    setEditingId(goal.id);
    setForm(formFromGoal(goal));
    setError(null);
    setIsFormOpen(true);
  }

  function closeFormDialog() {
    if (isSaving || isUploading) return;
    setEditingId(null);
    setForm(createEmptyForm(nextSortOrder));
    setIsFormOpen(false);
  }

  async function uploadImage(file: File) {
    setIsUploading(true);
    setError(null);

    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/goals/upload", { body, method: "POST" });
      const data = (await response.json()) as { imageUrl?: string; error?: string };

      if (!response.ok || !data.imageUrl) {
        throw new Error(data.error || "Không thể upload ảnh.");
      }

      setForm((current) => ({ ...current, imageUrl: data.imageUrl ?? "" }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Không thể upload ảnh.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      title: form.title.trim(),
      goalType: form.goalType,
      targetYear: Number(form.targetYear),
      targetAmount: Number(form.targetAmount),
      currentAmount: Number(form.currentAmount || "0"),
      imageUrl: form.imageUrl.trim() || null,
      note: form.note.trim() || null,
      sortOrder: Number(form.sortOrder || "0"),
    };

    if (!payload.title || !Number.isInteger(payload.targetYear) || payload.targetAmount < 0 || payload.currentAmount < 0) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(editingId ? `/api/goals/${editingId}` : "/api/goals", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: editingId ? "PATCH" : "POST",
      });

      if (!response.ok) throw new Error(editingId ? "Không thể lưu thay đổi mục tiêu." : "Không thể thêm mục tiêu.");
      const data = (await response.json()) as { goal: Goal };

      setGoals((current) => {
        const next = editingId ? current.map((goal) => (goal.id === data.goal.id ? data.goal : goal)) : [...current, data.goal];
        return next.sort((a, b) => a.targetYear - b.targetYear || a.sortOrder - b.sortOrder || a.id - b.id);
      });
      closeFormDialog();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể lưu mục tiêu.");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/goals/${pendingDelete.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Không thể xóa mục tiêu.");
      setGoals((current) => current.filter((goal) => goal.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Không thể xóa mục tiêu.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-2.5 py-4 sm:py-5">
      <header className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Family Goals</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 md:text-4xl">Bản đồ mục tiêu gia đình</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Lên kế hoạch các cột mốc lớn như nhà, xe, giáo dục và du lịch; mỗi mục tiêu có ảnh thực tế, số tiền hiện có và tiến độ tự tính.
            </p>
          </div>
          <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-fit" onClick={openCreateDialog}>
            <Icon className="h-4 w-4" name="plus" />
            Thêm mục tiêu
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Tổng mục tiêu</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{currency(summary.totalTarget)}</p>
          <p className="mt-2 text-sm text-slate-500">{goals.length} cột mốc đang theo dõi</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Hiện có</p>
          <p className="mt-3 text-2xl font-bold text-emerald-700">{currency(summary.totalCurrent)}</p>
          <p className="mt-2 text-sm text-slate-500">Đạt {summary.progress}% toàn bộ kế hoạch</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Còn thiếu</p>
          <p className="mt-3 text-2xl font-bold text-rose-600">{currency(summary.totalRemaining)}</p>
          <p className="mt-2 text-sm text-slate-500">Tự động tính theo giá trị mục tiêu</p>
        </Card>
      </section>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
      ) : null}

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-xl font-bold text-slate-950">Timeline mục tiêu</h2>
          <p className="mt-1 text-sm text-slate-500">Sắp xếp theo năm đích để nhìn rõ hành trình tài sản tương lai.</p>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-sm text-slate-500">Đang tải mục tiêu...</div>
        ) : goals.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">Chưa có mục tiêu nào.</div>
        ) : (
          <div className="grid gap-5 p-5 lg:grid-cols-3">
            {goals.map((goal) => {
              const meta = goalTypeMeta[goal.goalType] ?? goalTypeMeta.OTHER;
              const percent = progressPercent(goal);
              const remaining = remainingAmount(goal);
              const monthly = monthlySaving(goal);
              const monthsLeft = monthsUntilTargetYear(goal.targetYear);

              return (
                <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" key={goal.id}>
                  <div className="relative aspect-[4/3] bg-slate-100">
                    {goal.imageUrl ? (
                      <Image alt={goal.title} className="object-cover" fill sizes="(min-width: 1024px) 33vw, 100vw" src={goal.imageUrl} />
                    ) : (
                      <div className="grid h-full place-items-center text-slate-400">
                        <Icon className="h-12 w-12" name={meta.icon} />
                      </div>
                    )}
                    <div className="absolute left-3 top-3 flex items-center gap-2">
                      <Badge className={meta.badge}>
                        <Icon className="h-3.5 w-3.5" name={meta.icon} />
                        {meta.label}
                      </Badge>
                      <Badge className="bg-white/90 text-slate-800 ring-slate-200">{goal.targetYear}</Badge>
                    </div>
                  </div>

                  <div className="grid gap-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold text-slate-950">{goal.title}</h3>
                        {goal.note ? <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{goal.note}</p> : null}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <IconButton label="Sửa mục tiêu" onClick={() => openEditDialog(goal)}>
                          <Icon className="h-3.5 w-3.5" name="edit" />
                        </IconButton>
                        <IconButton label="Xóa mục tiêu" onClick={() => setPendingDelete(goal)} tone="danger">
                          <Icon className="h-3.5 w-3.5" name="trash" />
                        </IconButton>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-700">Đã đạt {percent}%</span>
                        <span className="text-slate-500">{currency(goal.currentAmount)}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-500">Giá mục tiêu</p>
                        <p className="mt-1 font-bold text-slate-950">{currency(goal.targetAmount)}</p>
                      </div>
                      <div className="rounded-md bg-rose-50 p-3">
                        <p className="text-xs font-medium text-rose-600">Còn thiếu</p>
                        <p className="mt-1 font-bold text-rose-700">{currency(remaining)}</p>
                      </div>
                      <div className="rounded-md bg-emerald-50 p-3">
                        <p className="text-xs font-medium text-emerald-700">Cần/tháng</p>
                        <p className="mt-1 font-bold text-emerald-800">{currency(monthly)}</p>
                      </div>
                      <div className="rounded-md bg-sky-50 p-3">
                        <p className="text-xs font-medium text-sky-700">Thời gian</p>
                        <p className="mt-1 font-bold text-sky-800">{monthsLeft} tháng</p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog onClose={closeFormDialog} open={isFormOpen} title={editingId ? "Sửa mục tiêu" : "Thêm mục tiêu"}>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="title" label="Tên mục tiêu">
              <input className={inputClass()} id="title" onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required value={form.title} />
            </Field>
            <Field id="goalType" label="Loại mục tiêu">
              <select className={inputClass()} id="goalType" onChange={(event) => setForm((current) => ({ ...current, goalType: event.target.value as GoalType }))} value={form.goalType}>
                {goalTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field id="targetYear" label="Năm đích">
              <input className={inputClass()} id="targetYear" min="2024" onChange={(event) => setForm((current) => ({ ...current, targetYear: event.target.value }))} required type="number" value={form.targetYear} />
            </Field>
            <Field id="targetAmount" label="Giá mục tiêu">
              <input className={inputClass()} id="targetAmount" inputMode="numeric" onChange={(event) => setForm((current) => ({ ...current, targetAmount: parseAmountInput(event.target.value) }))} required value={formatAmountInput(form.targetAmount)} />
            </Field>
            <Field id="currentAmount" label="Hiện có">
              <input className={inputClass()} id="currentAmount" inputMode="numeric" onChange={(event) => setForm((current) => ({ ...current, currentAmount: parseAmountInput(event.target.value) }))} value={formatAmountInput(form.currentAmount)} />
            </Field>
          </div>

          <Field id="goal-image" label="Ảnh thực tế">
            <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
              <div className="aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                {form.imageUrl ? (
                  <Image alt="Ảnh mục tiêu" className="object-cover" fill sizes="180px" src={form.imageUrl} />
                ) : (
                  <div className="grid h-full place-items-center text-slate-400">
                    <Icon className="h-10 w-10" name="target" />
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <input
                  accept="image/gif,image/jpeg,image/png,image/webp"
                  className="block w-full text-sm text-slate-600 file:mr-4 file:h-10 file:rounded-md file:border-0 file:bg-slate-950 file:px-4 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                  id="goal-image"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadImage(file);
                  }}
                  type="file"
                />
                <input className={inputClass()} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="/uploads/goals/..." value={form.imageUrl} />
                <p className="text-xs text-slate-500">{isUploading ? "Đang upload ảnh..." : "Hỗ trợ JPG, PNG, WEBP, GIF tối đa 5MB."}</p>
              </div>
            </div>
          </Field>

          <div className="grid gap-4 md:grid-cols-[1fr_120px]">
            <Field id="note" label="Ghi chú">
              <input className={inputClass()} id="note" onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} value={form.note} />
            </Field>
            <Field id="sortOrder" label="Thứ tự">
              <input className={inputClass()} id="sortOrder" min="0" onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} type="number" value={form.sortOrder} />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-fit" disabled={isSaving || isUploading} onClick={closeFormDialog} variant="secondary">
              Hủy
            </Button>
            <Button className="w-full sm:w-fit" disabled={isSaving || isUploading} type="submit">
              {isSaving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Thêm mục tiêu"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog onClose={() => setPendingDelete(null)} open={Boolean(pendingDelete)} title="Xóa mục tiêu?">
        <div className="grid gap-4">
          <p className="text-sm text-slate-600">Bạn có chắc chắn muốn xóa mục tiêu này?</p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-fit" disabled={isSaving} onClick={() => setPendingDelete(null)} variant="secondary">
              Hủy
            </Button>
            <Button className="w-full sm:w-fit" disabled={isSaving} onClick={confirmDelete} variant="danger">
              {isSaving ? "Đang xóa..." : "Xóa"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
