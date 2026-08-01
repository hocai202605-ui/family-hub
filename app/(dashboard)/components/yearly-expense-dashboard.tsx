"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon, IconName } from "./icons";

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

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function currency(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function compactCurrency(value: number) {
  if (value >= 1000000) return (value / 1000000).toFixed(1).replace(/\.0$/, "") + "Tr";
  if (value >= 1000) return (value / 1000).toFixed(0) + "K";
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
    <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-center">
      <div className="relative mx-auto h-56 w-56">
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
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tổng chi</p>
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
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: meta.chart }} />
                  {meta.label}
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

export function YearlyExpenseDashboard() {
  const currentYear = new Date().getFullYear().toString();
  const [year, setYear] = useState(currentYear);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<CategoryMeta[]>(defaultCategories);
  const [isLoading, setIsLoading] = useState(true);

  const availableYears = useMemo(() => {
    const y = parseInt(currentYear);
    return [y - 2, y - 1, y, y + 1].map(String);
  }, [currentYear]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [expenseRes, catRes] = await Promise.all([
          fetch(`/api/expenses?year=${year}`),
          fetch("/api/categories?type=EXPENSE"),
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

  const { totalExpense, averageExpense, highestMonth, monthlyData, categoryData, topExpenses } = useMemo(() => {
    const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
    const averageExpense = Math.round(totalExpense / 12);
    
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

    let highestMonth = { month: 1, amount: 0 };
    monthlyData.forEach(m => {
      if (m.amount > highestMonth.amount) {
        highestMonth = m;
      }
    });

    const categoryData = Object.keys(categoryMap).map(k => ({
      category: k,
      amount: categoryMap[k]
    })).sort((a, b) => b.amount - a.amount);

    const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);

    return { totalExpense, averageExpense, highestMonth, monthlyData, categoryData, topExpenses };
  }, [expenses]);

  const maxMonthAmount = Math.max(...monthlyData.map(d => d.amount), 1);
  const ticks = useMemo(() => calculateTicks(maxMonthAmount, 4), [maxMonthAmount]);
  const chartMax = ticks[0];

  return (
    <div className="space-y-6">
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
            onChange={(e) => setYear(e.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
          >
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-600">
              <Icon className="h-5 w-5" name="barChart" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Trung bình tháng</p>
              <p className="text-2xl font-bold text-slate-950">{currency(averageExpense)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-50 text-amber-600">
              <Icon className="h-5 w-5" name="trendingUp" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Tháng cao nhất (T{highestMonth.month})</p>
              <p className="text-2xl font-bold text-slate-950">{currency(highestMonth.amount)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-950 mb-6">Biểu đồ chi tiêu 12 tháng</h2>
          <div className="flex flex-col gap-8">
            {/* Months 1-6 */}
            <div className="flex h-48 w-full gap-2">
              <div className="flex h-full w-12 shrink-0 flex-col justify-between pb-[1.75rem] text-right text-xs font-medium text-slate-400">
                {ticks.map((t, i) => <span key={i} className="leading-none mt-1">{compactCurrency(t)}</span>)}
              </div>
              <div className="relative flex flex-1 items-end justify-between gap-1 pb-6">
                <div className="absolute inset-0 flex flex-col justify-between pb-[1.75rem] pointer-events-none">
                  {ticks.map((t, i) => (
                    <div key={i} className={cn("w-full border-t border-slate-200", i === ticks.length - 1 ? "mb-[1px]" : "border-dashed mt-1.5")} />
                  ))}
                </div>
                {monthlyData.slice(0, 6).map((item) => {
                  const heightPercent = chartMax > 0 ? (item.amount / chartMax) * 100 : 0;
                  return (
                    <div key={item.month} className="group relative flex h-full w-full flex-col items-center justify-end gap-2 z-10">
                      <div 
                        className="w-full max-w-[60px] rounded-t-md bg-rose-500 transition-all group-hover:bg-rose-600"
                        style={{ height: `${Math.max(heightPercent, 2)}%` }}
                      >
                        <div className="absolute -top-10 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-white shadow-md group-hover:block z-20 pointer-events-none">
                          {currency(item.amount)}
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                        </div>
                      </div>
                      <span className="text-xs font-medium text-slate-500">T{item.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Months 7-12 */}
            <div className="flex h-48 w-full gap-2">
              <div className="flex h-full w-12 shrink-0 flex-col justify-between pb-[1.75rem] text-right text-xs font-medium text-slate-400">
                {ticks.map((t, i) => <span key={i} className="leading-none mt-1">{compactCurrency(t)}</span>)}
              </div>
              <div className="relative flex flex-1 items-end justify-between gap-1 pb-6">
                <div className="absolute inset-0 flex flex-col justify-between pb-[1.75rem] pointer-events-none">
                  {ticks.map((t, i) => (
                    <div key={i} className={cn("w-full border-t border-slate-200", i === ticks.length - 1 ? "mb-[1px]" : "border-dashed mt-1.5")} />
                  ))}
                </div>
                {monthlyData.slice(6, 12).map((item) => {
                  const heightPercent = chartMax > 0 ? (item.amount / chartMax) * 100 : 0;
                  return (
                    <div key={item.month} className="group relative flex h-full w-full flex-col items-center justify-end gap-2 z-10">
                      <div 
                        className="w-full max-w-[60px] rounded-t-md bg-rose-500 transition-all group-hover:bg-rose-600"
                        style={{ height: `${Math.max(heightPercent, 2)}%` }}
                      >
                        <div className="absolute -top-10 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-white shadow-md group-hover:block z-20 pointer-events-none">
                          {currency(item.amount)}
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                        </div>
                      </div>
                      <span className="text-xs font-medium text-slate-500">T{item.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-950 mb-6">Cơ cấu chi tiêu</h2>
          <ExpenseDonut data={categoryData} total={totalExpense} categoryMeta={categoryMeta} />
        </div>
      </div>

      {/* Top Expenses */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-950 mb-6">Top khoản chi lớn nhất</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-3 font-medium">Ngày</th>
                <th className="pb-3 font-medium">Danh mục</th>
                <th className="pb-3 font-medium">Ghi chú</th>
                <th className="pb-3 font-medium text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topExpenses.map((exp) => {
                const meta = categoryMeta[exp.category] ?? { label: exp.category, ...fallbackCategoryMeta };
                return (
                  <tr key={exp.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="py-3 text-slate-500">
                      {(() => {
                        const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(exp.date)
                          ? exp.date.slice(0, 16)
                          : `${exp.date.slice(0, 10)}T00:00`;
                        const [dayPart, timePart] = normalized.split("T");
                        const [year, month, day] = dayPart.split("-").map(Number);
                        const [hour, minute] = timePart.split(":").map(Number);
                        return new Intl.DateTimeFormat("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hourCycle: "h23",
                        }).format(new Date(year, month - 1, day, hour, minute));
                      })()}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("grid h-6 w-6 place-items-center rounded-md ring-1 ring-inset", meta.badge)}>
                          <Icon className="h-3.5 w-3.5" name={meta.icon} />
                        </span>
                        <span className="font-medium text-slate-900">{meta.label}</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">{exp.note}</td>
                    <td className="py-3 text-right font-bold text-slate-900">{currency(exp.amount)}</td>
                  </tr>
                );
              })}
              {topExpenses.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">
                    Không có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
