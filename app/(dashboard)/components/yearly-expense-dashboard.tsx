"use client";

import { useEffect, useMemo, useState } from "react";
import { vietnamCurrentMonth } from "@/lib/vietnam-date";
import { Icon, IconName } from "./icons";
import { SixJarsWidget, type SixJarView } from "./six-jars-widget";

type Category = string;
type FamilyMember = "CK" | "VK" | "CON" | "GIA_DINH";
type CategoryMeta = {
  id: Category;
  label: string;
  icon: IconName;
  badge: string;
  chart: string;
};

type Expense = {
  id: number;
  amount: number;
  category: Category;
  member: FamilyMember;
  note: string;
  date: string;
};

const fallbackCategoryMeta: Omit<CategoryMeta, "id" | "label"> = {
  icon: "banknote",
  badge: "bg-slate-100 text-slate-700 ring-slate-200",
  chart: "#64748b",
};

const defaultCategories: CategoryMeta[] = [
  { id: "Food", label: "Ăn uống", icon: "utensils", badge: "bg-emerald-50 text-emerald-700 ring-emerald-100", chart: "#10b981" },
  { id: "Utilities", label: "Điện nước", icon: "home", badge: "bg-sky-50 text-sky-700 ring-sky-100", chart: "#0ea5e9" },
  { id: "Transport", label: "Di chuyển", icon: "trendingUp", badge: "bg-amber-50 text-amber-700 ring-amber-100", chart: "#f59e0b" },
  { id: "Shopping", label: "Mua sắm", icon: "wallet", badge: "bg-rose-50 text-rose-700 ring-rose-100", chart: "#f43f5e" },
  { id: "Entertainment", label: "Giải trí", icon: "sparkles", badge: "bg-violet-50 text-violet-700 ring-violet-100", chart: "#8b5cf6" },
  { id: "Others", label: "Khác", icon: "banknote", badge: "bg-slate-100 text-slate-700 ring-slate-200", chart: "#64748b" },
];

const familyMembers: FamilyMember[] = ["GIA_DINH", "CK", "VK", "CON"];

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
  GIA_DINH: {
    label: "Gia đình",
    role: "Gia đình",
    badge: "bg-orange-50 text-orange-700 ring-orange-100",
    dot: "bg-orange-500",
  },
};

const monthOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function inputClass() {
  return "h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100";
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xmlText(value: string) {
  return escapeXml(value.replace(/\r?\n/g, " ").trim());
}

function memberExportLabel(member: FamilyMember) {
  const meta = memberMeta[member] ?? memberMeta.GIA_DINH;
  return meta.label === meta.role ? meta.label : `${meta.label} - ${meta.role}`;
}

function stringCell(value: string, styleId?: string) {
  const style = styleId ? ` ss:StyleID="${styleId}"` : "";
  return `<Cell${style}><Data ss:Type="String">${xmlText(value)}</Data></Cell>`;
}

function numberCell(value: number, styleId?: string) {
  const style = styleId ? ` ss:StyleID="${styleId}"` : "";
  return `<Cell${style}><Data ss:Type="Number">${value}</Data></Cell>`;
}

function downloadFilteredExpensesExcel(params: {
  year: string;
  monthFilter: "all" | number;
  categoryLabel: string | null;
  memberLabel: string | null;
  query: string;
  rows: Array<{ date: string; categoryLabel: string; member: FamilyMember; note: string; amount: number }>;
  total: number;
}) {
  const filterParts = [
    `Năm ${params.year}`,
    params.monthFilter === "all" ? "Tất cả tháng" : `Tháng ${params.monthFilter}`,
    params.categoryLabel ? `Danh mục: ${params.categoryLabel}` : "Tất cả danh mục",
    params.memberLabel ? `Người: ${params.memberLabel}` : "Tất cả người",
  ];
  if (params.query.trim()) {
    filterParts.push(`Tìm: ${params.query.trim()}`);
  }

  const headerRow = ["Ngày", "Danh mục", "Người", "Ghi chú", "Số tiền"]
    .map((label) => stringCell(label, "header"))
    .join("");

  const dataRows = params.rows
    .map(
      (row) =>
        `<Row>${stringCell(formatExpenseDateTimeLabel(row.date))}${stringCell(row.categoryLabel)}${stringCell(memberExportLabel(row.member))}${stringCell(row.note)}${numberCell(row.amount, "vnd")}</Row>`,
    )
    .join("");

  const totalRow = `<Row>${stringCell("Tổng", "header")}${stringCell("")}${stringCell("")}${stringCell("")}${numberCell(params.total, "vnd")}</Row>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="header"><Font ss:Bold="1"/></Style>
  <Style ss:ID="vnd"><NumberFormat ss:Format="#,##0"/></Style>
 </Styles>
 <Worksheet ss:Name="Khoan chi">
  <Table>
   <Row>${stringCell(`Báo cáo chi tiêu năm ${params.year}`, "header")}</Row>
   <Row>${stringCell(filterParts.join(" · "))}</Row>
   <Row></Row>
   <Row>${headerRow}</Row>
   ${dataRows}
   ${totalRow}
  </Table>
 </Worksheet>
</Workbook>`;

  const monthPart = params.monthFilter === "all" ? "" : `-thang-${params.monthFilter}`;
  const blob = new Blob(["\uFEFF", xml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `chi-tieu-${params.year}${monthPart}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatExpenseDateTimeLabel(date: string) {
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(date)
    ? date.slice(0, 16)
    : `${date.slice(0, 10)}T00:00`;
  const [dayPart, timePart] = normalized.split("T");
  const [yearPart, month, day] = dayPart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(yearPart, month - 1, day, hour, minute));
}

function formatExpenseDateLabel(date: string) {
  const dayPart = date.slice(0, 10);
  const [yearPart, month, day] = dayPart.split("-").map(Number);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(yearPart, month - 1, day));
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

function calculateTicks(maxVal: number, tickCount = 4) {
  if (maxVal <= 0) return [0, 5000000, 10000000, 15000000].reverse();
  const rawStep = maxVal / (tickCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalizedStep = rawStep / magnitude;
  let niceStep = 10;
  if (normalizedStep <= 1) niceStep = 1;
  else if (normalizedStep <= 2) niceStep = 2;
  else if (normalizedStep <= 5) niceStep = 5;
  niceStep *= magnitude;
  const ticks = [];
  for (let i = tickCount - 1; i >= 0; i--) {
    ticks.push(i * niceStep);
  }
  return ticks;
}


function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-full bg-slate-100", className)}>
      <div className="h-full bg-slate-800 transition-all duration-500 ease-in-out" style={{ width: `${value}%` }} />
    </div>
  );
}

function ExpenseDonut({ data, total, categoryMeta }: { data: Array<{ category: Category; amount: number }>; total: number; categoryMeta: Record<string, CategoryMeta> }) {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-center py-2">
        <div className="relative h-48 w-48">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 180 180">
            <circle cx="90" cy="90" fill="none" r={radius} stroke="#f1f5f9" strokeWidth="22" />
            {data.map((item) => {
              const length = total > 0 ? (item.amount / total) * circumference : 0;
              const meta = categoryMeta[item.category] ?? { id: item.category, label: item.category, ...fallbackCategoryMeta };
              const segment = (
                <circle
                  key={item.category} cx="90" cy="90" fill="none" r={radius}
                  stroke={meta.chart} strokeDasharray={`${length} ${circumference}`} strokeDashoffset={-offset} strokeLinecap="round" strokeWidth="22"
                />
              );
              offset += length;
              return segment;
            })}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Tổng chi</p>
              <p className="mt-0.5 text-xs font-bold text-zinc-900">{compactCurrency(total)}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-zinc-100 pt-4">
        {data.map((item) => {
          const percent = total ? Math.round((item.amount / total) * 100) : 0;
          const meta = categoryMeta[item.category] ?? { id: item.category, label: item.category, ...fallbackCategoryMeta };
          return (
            <div key={item.category} className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: meta.chart }} />
              <span className="truncate text-xs text-zinc-600" title={meta.label}>{meta.label}</span>
              <span className="ml-auto shrink-0 text-xs font-semibold text-zinc-900">
                {compactCurrency(item.amount)} · {percent}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthBarRow({
  data,
  ticks,
  chartMax,
}: {
  data: Array<{ month: number; amount: number }>;
  ticks: number[];
  chartMax: number;
}) {
  return (
    <div className="flex h-36 w-full gap-2">
      <div className="flex h-full w-10 shrink-0 flex-col justify-between pb-[1.75rem] text-right text-[10px] font-medium text-slate-400">
        {ticks.map((t, i) => (
          <span key={i} className="mt-1 leading-none">
            {compactCurrency(t)}
          </span>
        ))}
      </div>
      <div className="relative flex flex-1 items-end justify-between gap-1 pb-6">
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-[1.75rem]">
          {ticks.map((t, i) => (
            <div
              key={i}
              className={cn("w-full border-t border-slate-200", i === ticks.length - 1 ? "mb-[1px]" : "mt-1.5 border-dashed")}
            />
          ))}
        </div>
        {data.map((item) => {
          const heightPercent = chartMax > 0 ? (item.amount / chartMax) * 100 : 0;
          return (
            <div key={item.month} className="group relative z-10 flex h-full w-full flex-col items-center justify-end">
              <span className="mb-1 whitespace-nowrap text-[9px] font-bold text-slate-500">
                {item.amount > 0 ? compactCurrency(item.amount) : ""}
              </span>
              <div
                className="w-full max-w-[40px] rounded-t-md bg-rose-500 transition-all group-hover:bg-rose-600"
                style={{ height: `${Math.max(heightPercent, item.amount > 0 ? 2 : 0.5)}%` }}
              >
                <div className="pointer-events-none absolute -top-10 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white shadow-md group-hover:block">
                  {currency(item.amount)}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                </div>
              </div>
              <span className="mt-1 text-[10px] font-medium text-slate-500">T{item.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function YearlyExpenseDashboard() {
  const currentYear = new Date().getFullYear().toString();
  const [year, setYear] = useState(currentYear);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<CategoryMeta[]>(defaultCategories);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState<"all" | number>("all");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [memberFilter, setMemberFilter] = useState<FamilyMember | "all">("all");
  const [jars, setJars] = useState<SixJarView[]>([]);
  const [unassignedCategoryIds, setUnassignedCategoryIds] = useState<string[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const availableYears = useMemo(() => {
    const y = parseInt(currentYear);
    return [y - 2, y - 1, y, y + 1].map(String);
  }, [currentYear]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [expenseRes, catRes, jarRes, incomeRes] = await Promise.all([
          fetch(`/api/expenses?year=${year}`),
          fetch("/api/categories?type=EXPENSE"),
          fetch(`/api/jars?year=${year}`),
          fetch(`/api/incomes?year=${year}`),
        ]);
        if (expenseRes.ok) {
          const data = await expenseRes.json();
          setExpenses(data.expenses || []);
        }
        if (catRes.ok) {
          const data = await catRes.json();
          if (data.categories && data.categories.length > 0) {
            setCategories(data.categories);
          }
        }
        if (jarRes.ok) {
          const data = await jarRes.json();
          setJars(data.jars || []);
          setUnassignedCategoryIds(data.unassignedCategoryIds || []);
        }
        if (incomeRes.ok) {
          const data = await incomeRes.json();
          const incomes = Array.isArray(data.incomes) ? data.incomes : [];
          setTotalIncome(incomes.reduce((sum: number, item: { amount?: number }) => sum + (item.amount || 0), 0));
        } else {
          setTotalIncome(0);
        }
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [year]);

  const categoryMeta = useMemo(() =>
    categories.reduce<Record<string, CategoryMeta>>((meta, category) => {
      meta[category.id] = category;
      return meta;
    }, {}),
    [categories]
  );

  const elapsedMonths = useMemo(() => {
    const current = vietnamCurrentMonth();
    const currentY = current.slice(0, 4);
    const currentM = Number(current.slice(5, 7));
    if (year < currentY) return 12;
    if (year > currentY) return 1;
    return Math.min(Math.max(currentM, 1), 12);
  }, [year]);

  const { totalExpense, averageExpense, monthlyData, categoryData } = useMemo(() => {
    const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
    const averageExpense = Math.round(totalExpense / elapsedMonths);
    
    const monthlyMap: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) monthlyMap[i] = 0;
    
    const categoryMap: Record<string, number> = {};

    expenses.forEach(exp => {
      const m = Number(exp.date.slice(5, 7)); // YYYY-MM-DDTHH:mm → month 1-12
      if (m >= 1 && m <= 12) {
        monthlyMap[m] += exp.amount;
      }
      categoryMap[exp.category] = (categoryMap[exp.category] || 0) + exp.amount;
    });

    const monthlyData = Object.keys(monthlyMap).map(k => ({
      month: parseInt(k),
      amount: monthlyMap[parseInt(k)]
    })).sort((a, b) => a.month - b.month);

    const categoryData = Object.keys(categoryMap).map(k => ({
      category: k,
      amount: categoryMap[k]
    })).sort((a, b) => b.amount - a.amount);

    return { totalExpense, averageExpense, monthlyData, categoryData };
  }, [elapsedMonths, expenses]);

  const filteredExpenses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const monthNumber = monthFilter === "all" ? null : monthFilter;

    return expenses
      .filter((item) => monthNumber === null || Number(item.date.slice(5, 7)) === monthNumber)
      .filter((item) => categoryFilter === "all" || item.category === categoryFilter)
      .filter((item) => memberFilter === "all" || item.member === memberFilter)
      .filter((item) => {
        if (!normalizedQuery) {
          return true;
        }

        const meta = categoryMeta[item.category] ?? { label: item.category, ...fallbackCategoryMeta };
        const member = memberMeta[item.member] ?? memberMeta.GIA_DINH;

        return (
          item.note.toLowerCase().includes(normalizedQuery) ||
          meta.label.toLowerCase().includes(normalizedQuery) ||
          member.label.toLowerCase().includes(normalizedQuery) ||
          member.role.toLowerCase().includes(normalizedQuery)
        );
      })
      .sort((a, b) => {
        if (b.amount !== a.amount) {
          return b.amount - a.amount;
        }
        const dateCmp = b.date.localeCompare(a.date);
        if (dateCmp !== 0) {
          return dateCmp;
        }
        return b.id - a.id;
      });
  }, [categoryFilter, categoryMeta, expenses, memberFilter, monthFilter, query]);

  const filteredTotal = useMemo(
    () => filteredExpenses.reduce((sum, item) => sum + item.amount, 0),
    [filteredExpenses],
  );

  const filteredExpenseIds = useMemo(() => filteredExpenses.map((item) => item.id), [filteredExpenses]);

  const allVisibleSelected =
    filteredExpenseIds.length > 0 && filteredExpenseIds.every((id) => selectedIds.includes(id));

  const someVisibleSelected =
    filteredExpenseIds.some((id) => selectedIds.includes(id)) && !allVisibleSelected;

  const selectedExpenses = useMemo(
    () => filteredExpenses.filter((item) => selectedIds.includes(item.id)),
    [filteredExpenses, selectedIds],
  );

  const selectedTotal = useMemo(
    () => selectedExpenses.reduce((sum, item) => sum + item.amount, 0),
    [selectedExpenses],
  );

  useEffect(() => {
    setSelectedIds((current) => {
      const next = current.filter((id) => filteredExpenseIds.includes(id));
      return next.length === current.length ? current : next;
    });
  }, [filteredExpenseIds]);

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !filteredExpenseIds.includes(id)));
      return;
    }
    setSelectedIds((current) => Array.from(new Set([...current, ...filteredExpenseIds])));
  }

  function toggleSelectExpense(id: number) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id],
    );
  }

  const totalJarLimit = useMemo(
    () => jars.reduce((sum, jar) => sum + jar.limitAmount, 0),
    [jars],
  );
  const savingsRemaining = totalJarLimit - totalExpense;
  const savingsPercent = totalJarLimit > 0 ? Math.round((savingsRemaining / totalJarLimit) * 100) : 0;

  async function reloadJars() {
    const jarRes = await fetch(`/api/jars?year=${year}`);
    if (!jarRes.ok) {
      return;
    }
    const data = await jarRes.json();
    setJars(data.jars || []);
    setUnassignedCategoryIds(data.unassignedCategoryIds || []);
  }

  function handleYearChange(nextYear: string) {
    setYear(nextYear);
    setQuery("");
    setMonthFilter("all");
    setCategoryFilter("all");
    setMemberFilter("all");
    setSelectedIds([]);
  }

  function handleExportExcel() {
    const rowsToExport = selectedExpenses.length > 0 ? selectedExpenses : filteredExpenses;
    if (isLoading || rowsToExport.length === 0) {
      return;
    }

    const selectedCategory = categoryFilter === "all" ? null : categoryMeta[categoryFilter];

    downloadFilteredExpensesExcel({
      year,
      monthFilter,
      categoryLabel: selectedCategory?.label ?? (categoryFilter === "all" ? null : categoryFilter),
      memberLabel: memberFilter === "all" ? null : memberExportLabel(memberFilter),
      query,
      rows: rowsToExport.map((item) => ({
        date: item.date,
        categoryLabel: (categoryMeta[item.category] ?? { label: item.category }).label,
        member: item.member,
        note: item.note,
        amount: item.amount,
      })),
      total: selectedExpenses.length > 0 ? selectedTotal : filteredTotal,
    });
  }

  const maxMonthAmount = Math.max(...monthlyData.map(d => d.amount), 1);
  const ticks = useMemo(() => calculateTicks(maxMonthAmount, 4), [maxMonthAmount]);
  const chartMax = ticks[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6 bg-[#fbfbfb] p-6 dark:bg-zinc-950">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Báo cáo năm {year}</h1>
          <p className="text-sm text-slate-500">Tổng quan tình hình chi tiêu cả năm</p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="year-select" className="text-sm font-medium text-slate-700">Chọn năm</label>
          <select
            id="year-select"
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
          >
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-rose-50 text-rose-600">
              <Icon className="h-5 w-5" name="banknote" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Tổng chi tiêu năm</p>
              <p className="text-2xl font-bold text-slate-950">{currency(totalExpense)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-600">
              <Icon className="h-5 w-5" name="barChart" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Trung bình tháng</p>
              <p className="text-2xl font-bold text-slate-950">{currency(averageExpense)}</p>
              <p className="text-xs text-slate-500">Tổng chi ÷ {elapsedMonths} tháng</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <Icon className="h-5 w-5" name="briefcase" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Tổng thu nhập năm</p>
              <p className="text-2xl font-bold text-slate-950">{currency(totalIncome)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={cn(
              "grid h-10 w-10 place-items-center rounded-lg",
              savingsRemaining < 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600",
            )}>
              <Icon className="h-5 w-5" name="piggyBank" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Tỷ lệ tiết kiệm</p>
              <p className="text-2xl font-bold text-slate-950">{totalJarLimit > 0 ? `${savingsPercent}%` : "—"}</p>
              <p className="text-xs text-slate-500">
                {totalJarLimit > 0
                  ? savingsRemaining < 0
                    ? `Vượt ${currency(Math.abs(savingsRemaining))}`
                    : `Ngân sách ${currency(totalJarLimit)}`
                  : "Chưa có hạn mức lọ"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-950">Biểu đồ chi tiêu 12 tháng</h2>
          <div className="flex flex-col gap-3">
            <MonthBarRow chartMax={chartMax} data={monthlyData.slice(0, 6)} ticks={ticks} />
            <MonthBarRow chartMax={chartMax} data={monthlyData.slice(6, 12)} ticks={ticks} />
          </div>
        </div>

        <SixJarsWidget
          categories={categories.map((category) => ({ id: category.id, label: category.label }))}
          jars={jars}
          onSaved={reloadJars}
          unassignedCategoryIds={unassignedCategoryIds}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-8">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">Top khoản chi lớn nhất</h2>
              <p className="mt-1 text-sm text-slate-500">
                {isLoading
                  ? "Đang tải..."
                  : `${filteredExpenses.length} khoản${filteredExpenses.length > 0 ? ` · tổng ${currency(filteredTotal)}` : ""}`}
              </p>
            </div>
            <button
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition hover:bg-slate-50 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
              disabled={isLoading || filteredExpenses.length === 0}
              onClick={handleExportExcel}
              type="button"
            >
              <Icon className="h-4 w-4" name="download" />
              Xuất Excel
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon className="h-4 w-4" name="search" />
              </span>
              <input
                aria-label="Tìm khoản chi"
                className={cn(inputClass(), "w-full pl-9")}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm ghi chú, danh mục..."
                type="search"
                value={query}
              />
            </div>
            <select
              aria-label="Lọc theo tháng"
              className={cn(inputClass(), "w-full sm:w-40")}
              onChange={(event) =>
                setMonthFilter(event.target.value === "all" ? "all" : Number(event.target.value))
              }
              value={monthFilter}
            >
              <option value="all">Tất cả tháng</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  Tháng {month}
                </option>
              ))}
            </select>
            <select
              aria-label="Lọc theo danh mục"
              className={cn(inputClass(), "w-full sm:w-44")}
              onChange={(event) => setCategoryFilter(event.target.value as Category | "all")}
              value={categoryFilter}
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Lọc theo người"
              className={cn(inputClass(), "w-full sm:w-44")}
              onChange={(event) => setMemberFilter(event.target.value as FamilyMember | "all")}
              value={memberFilter}
            >
              <option value="all">Tất cả người</option>
              {familyMembers.map((member) => (
                <option key={member} value={member}>
                  {memberMeta[member].label} - {memberMeta[member].role}
                </option>
              ))}
            </select>
          </div>

            {selectedExpenses.length > 0 ? (
              <div className="flex flex-col gap-1 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-rose-950">
                  Đã chọn <span className="font-bold">{selectedExpenses.length}</span> giao dịch
                </p>
                <p className="text-sm font-bold text-rose-900">
                  Tổng: {currency(selectedTotal)}
                </p>
              </div>
            ) : null}
        </div>

        <div className="max-h-[28rem] overflow-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 shadow-sm">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    aria-label="Chọn tất cả"
                    checked={allVisibleSelected}
                    className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    disabled={isLoading || filteredExpenseIds.length === 0}
                    onChange={toggleSelectAllVisible}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = someVisibleSelected;
                      }
                    }}
                    type="checkbox"
                  />
                </th>
                <th className="w-[110px] whitespace-nowrap px-5 py-3 font-semibold">Ngày</th>
                <th className="px-5 py-3 font-semibold">Danh mục</th>
                <th className="px-5 py-3 font-semibold">Người</th>
                <th className="max-w-[200px] px-5 py-3 font-semibold">Ghi chú</th>
                <th className="min-w-[110px] whitespace-nowrap px-5 py-3 text-right font-semibold">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-500" colSpan={6}>
                    Đang tải chi tiêu...
                  </td>
                </tr>
              ) : null}
              {!isLoading
                ? filteredExpenses.map((exp) => {
                    const meta = categoryMeta[exp.category] ?? { label: exp.category, ...fallbackCategoryMeta };
                    const member = memberMeta[exp.member] ?? memberMeta.GIA_DINH;
                    const isSelected = selectedIds.includes(exp.id);
                    return (
                      <tr
                        key={exp.id}
                        className={cn(
                          "bg-white transition-colors hover:bg-slate-50/50",
                          isSelected && "bg-rose-50/60",
                        )}
                      >
                        <td className="w-12 px-4 py-3">
                          <input
                            aria-label={`Chọn chi tiêu ${exp.id}`}
                            checked={isSelected}
                            className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                            onChange={() => toggleSelectExpense(exp.id)}
                            type="checkbox"
                          />
                        </td>
                        <td className="w-[110px] whitespace-nowrap px-5 py-3 text-slate-500">
                          {formatExpenseDateLabel(exp.date)}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className={cn("grid h-6 w-6 place-items-center rounded-md ring-1 ring-inset", meta.badge)}>
                              <Icon className="h-3.5 w-3.5" name={meta.icon} />
                            </span>
                            <span className="font-medium text-slate-900">{meta.label}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", member.badge)}>
                            <span className={cn("h-2 w-2 rounded-full", member.dot)} />
                            {member.label}
                          </span>
                        </td>
                        <td className="max-w-[200px] overflow-hidden truncate text-ellipsis whitespace-nowrap px-5 py-3 text-slate-600" title={exp.note}>
                          {exp.note}
                        </td>
                        <td className="min-w-[110px] whitespace-nowrap px-5 py-3 text-right font-bold text-slate-900">
                          {currency(exp.amount)}
                        </td>
                      </tr>
                    );
                  })
                : null}
              {!isLoading && expenses.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-500" colSpan={6}>
                    Không có dữ liệu
                  </td>
                </tr>
              ) : null}
              {!isLoading && expenses.length > 0 && filteredExpenses.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-500" colSpan={6}>
                    Không tìm thấy chi tiêu phù hợp.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-4">
          <h2 className="mb-6 font-semibold text-slate-950">Cơ cấu chi tiêu</h2>
          <ExpenseDonut data={categoryData} total={totalExpense} categoryMeta={categoryMeta} />
        </div>
      </div>

    </div>
  );
}
