"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import { Icon } from "./icons";

type TransactionType = "income" | "expense";
type Category = "Food" | "Utilities" | "Transport" | "Shopping" | "Entertainment" | "Others";
type FamilyMember = "CK" | "VK" | "CON";

type Transaction = {
  id: number;
  amount: number;
  type: TransactionType;
  category: Category;
  member: FamilyMember;
  note: string;
  date: string;
};

type TransactionForm = {
  amount: string;
  type: TransactionType;
  category: Category;
  member: FamilyMember;
  note: string;
  date: string;
};

const monthlyBudget = 45000000;

const categoryMeta: Record<
  Category,
  {
    label: string;
    icon: "utensils" | "trendingUp" | "wallet" | "banknote" | "sparkles" | "home";
    badge: string;
    chart: string;
  }
> = {
  Food: {
    label: "Ăn uống",
    icon: "utensils",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    chart: "#10b981",
  },
  Utilities: {
    label: "Điện nước",
    icon: "home",
    badge: "bg-sky-50 text-sky-700 ring-sky-100",
    chart: "#0ea5e9",
  },
  Transport: {
    label: "Di chuyển",
    icon: "trendingUp",
    badge: "bg-amber-50 text-amber-700 ring-amber-100",
    chart: "#f59e0b",
  },
  Shopping: {
    label: "Mua sắm",
    icon: "wallet",
    badge: "bg-rose-50 text-rose-700 ring-rose-100",
    chart: "#f43f5e",
  },
  Entertainment: {
    label: "Giải trí",
    icon: "sparkles",
    badge: "bg-violet-50 text-violet-700 ring-violet-100",
    chart: "#8b5cf6",
  },
  Others: {
    label: "Khác",
    icon: "banknote",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    chart: "#64748b",
  },
};

const initialTransactions: Transaction[] = [
  { id: 1, amount: 1850000, type: "expense", category: "Food", member: "VK", note: "Đi chợ cuối tuần", date: "2026-07-02" },
  { id: 2, amount: 38000000, type: "income", category: "Others", member: "CK", note: "Lương tháng 7", date: "2026-07-01" },
  { id: 3, amount: 920000, type: "expense", category: "Transport", member: "CK", note: "Xăng xe và gửi xe", date: "2026-07-03" },
  { id: 4, amount: 2150000, type: "expense", category: "Utilities", member: "VK", note: "Tiền điện nước", date: "2026-07-01" },
  { id: 5, amount: 3400000, type: "expense", category: "Shopping", member: "CON", note: "Đồ dùng học tập", date: "2026-06-28" },
  { id: 6, amount: 720000, type: "expense", category: "Entertainment", member: "CON", note: "Xem phim cuối tuần", date: "2026-07-04" },
  { id: 7, amount: 4500000, type: "income", category: "Others", member: "VK", note: "Freelance", date: "2026-07-03" },
];

const emptyForm: TransactionForm = {
  amount: "",
  type: "expense",
  category: "Food",
  member: "VK",
  note: "",
  date: "2026-07-04",
};

const categories = Object.keys(categoryMeta) as Category[];
const familyMembers: FamilyMember[] = ["CK", "VK", "CON"];
const transactionTypes: Array<{ value: TransactionType | "all"; label: string }> = [
  { value: "all", label: "Tất cả loại" },
  { value: "expense", label: "Chi tiêu" },
  { value: "income", label: "Thu nhập" },
];

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
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
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
        "inline-flex h-9 w-9 items-center justify-center rounded-md border transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2",
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
      <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
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
  return "h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100";
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

function ExpenseDonut({ data, total }: { data: Array<{ category: Category; amount: number }>; total: number }) {
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
            const segment = (
              <circle
                cx="90"
                cy="90"
                fill="none"
                key={item.category}
                r={radius}
                stroke={categoryMeta[item.category].chart}
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
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tổng chi</p>
            <p className="mt-1 text-lg font-bold text-slate-950">{currency(total)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {data.map((item) => {
          const percent = total ? Math.round((item.amount / total) * 100) : 0;
          return (
            <div key={item.category}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: categoryMeta[item.category].chart }} />
                  {categoryMeta[item.category].label}
                </div>
                <span className="text-slate-500">{percent}%</span>
              </div>
              <Progress className="mt-2 h-2" value={percent} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearExpenseBars({
  data,
}: {
  data: Array<{ month: string; income: number; expense: number; balance: number; active: boolean }>;
}) {
  const maxAmount = Math.max(...data.flatMap((item) => [item.income, item.expense]), 1);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-950">Biểu đồ năm</h3>
          <p className="mt-1 text-sm text-slate-500">So sánh thu và chi từng tháng trong năm đang chọn.</p>
        </div>
        <div className="flex gap-3 text-xs font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            Thu
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
            Chi
          </span>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {data.map((item) => {
          const incomeWidth = Math.max((item.income / maxAmount) * 100, item.income > 0 ? 6 : 1);
          const expenseWidth = Math.max((item.expense / maxAmount) * 100, item.expense > 0 ? 6 : 1);

          return (
            <div
              className={cn(
                "rounded-lg border p-3",
                item.active ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50",
              )}
              key={item.month}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={cn("grid h-8 w-8 place-items-center rounded-md text-xs font-bold", item.active ? "bg-amber-500 text-white" : "bg-white text-slate-600")}>
                    T{item.month}
                  </span>
                  <span className={cn("text-xs font-semibold", item.balance >= 0 ? "text-emerald-700" : "text-rose-700")}>
                    {item.balance >= 0 ? "+" : "-"}
                    {currency(Math.abs(item.balance))}
                  </span>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <span className="font-semibold text-emerald-700">{currency(item.income)}</span>
                  <span className="mx-1">/</span>
                  <span className="font-semibold text-rose-700">{currency(item.expense)}</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-[11px] font-bold text-rose-700">Chi</span>
                  <div className="flex h-3 w-full justify-end overflow-hidden rounded-l-full bg-white">
                    <div
                      className="h-full rounded-l-full bg-rose-500 transition-all"
                      style={{ width: `${expenseWidth}%` }}
                      title={`Chi: ${currency(item.expense)}`}
                    />
                  </div>
                </div>

                <div className="h-8 w-px bg-slate-300" />

                <div className="flex items-center gap-2">
                  <div className="h-3 w-full overflow-hidden rounded-r-full bg-white">
                    <div
                      className="h-full rounded-r-full bg-emerald-500 transition-all"
                      style={{ width: `${incomeWidth}%` }}
                      title={`Thu: ${currency(item.income)}`}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700">Thu</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ExpenseDashboard() {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [selectedMonth, setSelectedMonth] = useState("2026-07");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [memberFilter, setMemberFilter] = useState<FamilyMember | "all">("all");
  const [form, setForm] = useState<TransactionForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  const monthlyTransactions = useMemo(
    () => transactions.filter((item) => isSelectedMonth(item.date, selectedMonth)),
    [selectedMonth, transactions],
  );
  const totalExpense = useMemo(() => monthlyTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0), [monthlyTransactions]);
  const totalIncome = useMemo(() => monthlyTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0), [monthlyTransactions]);
  const remainingBudget = monthlyBudget - totalExpense;
  const budgetUsedPercent = Math.round((totalExpense / monthlyBudget) * 100);

  const expenseByCategory = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          amount: monthlyTransactions.filter((item) => item.type === "expense" && item.category === category).reduce((sum, item) => sum + item.amount, 0),
        }))
        .filter((item) => item.amount > 0)
        .sort((a, b) => b.amount - a.amount),
    [monthlyTransactions],
  );

  const yearlyCashflowByMonth = useMemo(() => {
    const selectedYear = Number(selectedMonth.slice(0, 4));
    const selectedMonthNumber = Number(selectedMonth.slice(5, 7));

    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const monthTransactions = transactions.filter((item) => {
        const target = new Date(`${item.date}T00:00:00`);
        return target.getFullYear() === selectedYear && target.getMonth() === index;
      });
      const income = monthTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
      const expense = monthTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);

      return {
        month: String(month).padStart(2, "0"),
        income,
        expense,
        balance: income - expense,
        active: month === selectedMonthNumber,
      };
    });
  }, [selectedMonth, transactions]);

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return monthlyTransactions
      .filter((item) => categoryFilter === "all" || item.category === categoryFilter)
      .filter((item) => typeFilter === "all" || item.type === typeFilter)
      .filter((item) => memberFilter === "all" || item.member === memberFilter)
      .filter((item) => {
        if (!normalizedQuery) {
          return true;
        }

        return (
          item.note.toLowerCase().includes(normalizedQuery) ||
          categoryMeta[item.category].label.toLowerCase().includes(normalizedQuery) ||
          memberMeta[item.member].label.toLowerCase().includes(normalizedQuery) ||
          memberMeta[item.member].role.toLowerCase().includes(normalizedQuery) ||
          item.type.toLowerCase().includes(normalizedQuery)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [categoryFilter, memberFilter, monthlyTransactions, query, typeFilter]);

  function openCreateDialog() {
    setEditingId(null);
    setForm({ ...emptyForm, date: `${selectedMonth}-01` });
    setIsFormOpen(true);
  }

  function openEditDialog(transaction: Transaction) {
    setEditingId(transaction.id);
    setForm({
      amount: String(transaction.amount),
      type: transaction.type,
      category: transaction.category,
      member: transaction.member,
      note: transaction.note,
      date: transaction.date,
    });
    setIsFormOpen(true);
  }

  function closeFormDialog() {
    setIsFormOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm, date: `${selectedMonth}-01` });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);

    if (!amount || amount <= 0 || !form.date) {
      return;
    }

    if (editingId) {
      setTransactions((current) =>
        current.map((item) =>
          item.id === editingId
            ? {
                ...item,
                amount,
                type: form.type,
                category: form.category,
                member: form.member,
                note: form.note.trim() || categoryMeta[form.category].label,
                date: form.date,
              }
            : item,
        ),
      );
    } else {
      setTransactions((current) => [
        {
          id: Date.now(),
          amount,
          type: form.type,
          category: form.category,
          member: form.member,
          note: form.note.trim() || categoryMeta[form.category].label,
          date: form.date,
        },
        ...current,
      ]);
    }

    closeFormDialog();
  }

  function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    setTransactions((current) => current.filter((item) => item.id !== pendingDelete.id));
    setPendingDelete(null);
  }

  return (
    <div className="flex w-full flex-col gap-6 px-2.5 py-4 sm:py-5">
      <header className="flex flex-col gap-5 rounded-lg border border-amber-100 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">Daily Expense Management</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 md:text-4xl">Quản lý chi tiêu hằng ngày</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Theo dõi thu nhập, chi tiêu, ngân sách và từng giao dịch trong tháng của gia đình.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[auto_auto] sm:items-end">
          <Field id="selected-month" label="Chọn tháng">
            <input
              className={cn(inputClass(), "w-full sm:w-44")}
              id="selected-month"
              onChange={(event) => setSelectedMonth(event.target.value || selectedMonth)}
              type="month"
              value={selectedMonth}
            />
          </Field>
          <Button className="w-full sm:w-fit" onClick={openCreateDialog}>
            <Icon className="h-4 w-4" name="plus" />
            Add Transaction
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Tổng chi tháng này</p>
              <p className="mt-3 text-2xl font-bold text-slate-950">{currency(totalExpense)}</p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-md bg-rose-50 text-rose-600">
              <Icon name="wallet" />
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            {monthlyTransactions.length} giao dịch trong tháng {monthLabel(selectedMonth)}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Tổng thu nhập tháng này</p>
              <p className="mt-3 text-2xl font-bold text-emerald-700">{currency(totalIncome)}</p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-md bg-emerald-50 text-emerald-600">
              <Icon name="trendingUp" />
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">Dòng tiền vào ổn định cho ngân sách gia đình</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Hạn mức còn lại</p>
              <p className="mt-3 text-2xl font-bold text-amber-700">{currency(Math.max(remainingBudget, 0))}</p>
            </div>
            <Badge className="bg-amber-50 text-amber-700 ring-amber-100">{budgetUsedPercent}% đã dùng</Badge>
          </div>
          <Progress className="mt-5" value={budgetUsedPercent} />
          <p className="mt-3 text-sm text-slate-500">Ngân sách tháng: {currency(monthlyBudget)}</p>
        </Card>
      </section>

      <Card className="p-5">
        <YearExpenseBars data={yearlyCashflowByMonth} />
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Giao dịch hằng ngày</h2>
              <p className="mt-1 text-sm text-slate-500">Thêm, sửa, xóa và lọc giao dịch theo danh mục hoặc loại.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[780px] xl:grid-cols-[1fr_auto_auto_auto]">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icon className="h-4 w-4" name="search" />
                </span>
                <input className={cn(inputClass(), "w-full pl-9")} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm ghi chú, danh mục..." type="search" value={query} />
              </div>
              <select className={cn(inputClass(), "w-full sm:w-40")} onChange={(event) => setCategoryFilter(event.target.value as Category | "all")} value={categoryFilter}>
                <option value="all">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {categoryMeta[category].label}
                  </option>
                ))}
              </select>
              <select className={cn(inputClass(), "w-full sm:w-36")} onChange={(event) => setTypeFilter(event.target.value as TransactionType | "all")} value={typeFilter}>
                {transactionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
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
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Category</th>
                  <th className="px-5 py-4 font-semibold">Người</th>
                  <th className="px-5 py-4 font-semibold">Note</th>
                  <th className="px-5 py-4 text-right font-semibold">Amount</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((transaction) => {
                  const meta = categoryMeta[transaction.category];
                  const member = memberMeta[transaction.member];

                  return (
                    <tr className="bg-white transition hover:bg-amber-50/40" key={transaction.id}>
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-700">{dateLabel(transaction.date)}</td>
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
                        <div className="truncate">{transaction.note}</div>
                        <span className="mt-1 inline-block text-xs font-medium text-slate-400">
                          {transaction.type === "income" ? "Income" : "Expense"} - {member.role}
                        </span>
                      </td>
                      <td className={cn("whitespace-nowrap px-5 py-4 text-right font-bold", transaction.type === "income" ? "text-emerald-700" : "text-slate-950")}>
                        {transaction.type === "income" ? "+" : "-"}
                        {currency(transaction.amount)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <IconButton label="Edit transaction" onClick={() => openEditDialog(transaction)}>
                            <Icon className="h-4 w-4" name="edit" />
                          </IconButton>
                          <IconButton label="Delete transaction" onClick={() => setPendingDelete(transaction)} tone="danger">
                            <Icon className="h-4 w-4" name="trash" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm text-slate-500" colSpan={6}>
                      Không tìm thấy giao dịch phù hợp.
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
              <h2 className="text-xl font-bold text-slate-950">Biểu đồ trực quan</h2>
              <p className="mt-1 text-sm text-slate-500">Tỷ trọng chi tiêu theo danh mục.</p>
            </div>
            <Badge className="bg-slate-100 text-slate-700 ring-slate-200">{monthLabel(selectedMonth)}</Badge>
          </div>
          <ExpenseDonut data={expenseByCategory} total={totalExpense} />
        </Card>
      </div>

      <Dialog description="Nhập số tiền, loại giao dịch, danh mục, ghi chú và ngày phát sinh." onClose={closeFormDialog} open={isFormOpen} title={editingId ? "Edit Transaction" : "Add Transaction"}>
        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="amount" label="Số tiền">
              <input className={inputClass()} id="amount" min="1000" onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Ví dụ: 250000" required type="number" value={form.amount} />
            </Field>
            <Field id="type" label="Loại giao dịch">
              <select className={inputClass()} id="type" onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as TransactionType }))} value={form.type}>
                <option value="expense">Expense - Chi tiêu</option>
                <option value="income">Income - Thu nhập</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="category" label="Danh mục">
              <select className={inputClass()} id="category" onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as Category }))} value={form.category}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {categoryMeta[category].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="member" label="Người chi/thu">
              <select className={inputClass()} id="member" onChange={(event) => setForm((current) => ({ ...current, member: event.target.value as FamilyMember }))} value={form.member}>
                {familyMembers.map((member) => (
                  <option key={member} value={member}>
                    {memberMeta[member].label} - {memberMeta[member].role}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field id="date" label="Transaction Date">
            <input className={inputClass()} id="date" onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} required type="date" value={form.date} />
          </Field>

          <Field id="note" label="Ghi chú">
            <input className={inputClass()} id="note" onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder="Ví dụ: Siêu thị, tiền điện, lương..." type="text" value={form.note} />
          </Field>

          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-fit" onClick={closeFormDialog} variant="secondary">
              Hủy
            </Button>
            <Button className="w-full sm:w-fit" type="submit">
              {editingId ? "Lưu thay đổi" : "Thêm giao dịch"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog description={pendingDelete ? `Giao dịch "${pendingDelete.note}" sẽ được xóa khỏi danh sách.` : "Xác nhận xóa giao dịch."} onClose={() => setPendingDelete(null)} open={Boolean(pendingDelete)} title="Xóa giao dịch?">
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-fit" onClick={() => setPendingDelete(null)} variant="secondary">
            Hủy
          </Button>
          <Button className="w-full sm:w-fit" onClick={confirmDelete} variant="danger">
            Xóa
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
