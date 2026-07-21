"use client";

import { useEffect, useMemo, useState } from "react";
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

const fallbackCategoryMeta: Omit<CategoryMeta, "id" | "label"> = {
  icon: "banknote",
  badge: "bg-slate-100 text-slate-700 ring-slate-200",
  chart: "#64748b",
};

const defaultCategories: CategoryMeta[] = [
  { id: "Salary", label: "Lương", icon: "briefcase", badge: "bg-blue-50 text-blue-700 ring-blue-100", chart: "#3b82f6" },
  { id: "Freelance", label: "Làm thêm", icon: "sparkles", badge: "bg-violet-50 text-violet-700 ring-violet-100", chart: "#8b5cf6" },
  { id: "Bonus", label: "Thưởng", icon: "gift", badge: "bg-rose-50 text-rose-700 ring-rose-100", chart: "#f43f5e" },
  { id: "Investment", label: "Đầu tư", icon: "barChart", badge: "bg-emerald-50 text-emerald-700 ring-emerald-100", chart: "#10b981" },
  { id: "Gift", label: "Biếu tặng", icon: "heart", badge: "bg-amber-50 text-amber-700 ring-amber-100", chart: "#f59e0b" },
  { id: "Income_Others", label: "Khác", icon: "banknote", badge: "bg-slate-100 text-slate-700 ring-slate-200", chart: "#64748b" },
];

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

function IncomeDonut({ data, total, categoryMeta }: { data: Array<{ category: Category; amount: number }>; total: number; categoryMeta: Record<string, CategoryMeta> }) {
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

export function YearlyIncomeDashboard() {
  const currentYear = new Date().getFullYear().toString();
  const [year, setYear] = useState(currentYear);
  const [incomes, setIncomes] = useState<Income[]>([]);
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
        const [incomeRes, catRes] = await Promise.all([
          fetch(`/api/incomes?year=${year}`),
          fetch("/api/categories?type=INCOME"),
        ]);
        if (incomeRes.ok) {
          const data = await incomeRes.json();
          setIncomes(data.incomes || []);
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

  const { totalIncome, averageIncome, highestMonth, monthlyData, categoryData, topIncomes, incomeByMember } = useMemo(() => {
    const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
    const averageIncome = Math.round(totalIncome / 12);
    
    const monthlyMap: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) monthlyMap[i] = 0;
    
    const categoryMap: Record<string, number> = {};

    incomes.forEach(inc => {
      const m = new Date(inc.date).getUTCMonth() + 1; // 1-12
      monthlyMap[m] += inc.amount;
      categoryMap[inc.category] = (categoryMap[inc.category] || 0) + inc.amount;
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

    const topIncomes = [...incomes].sort((a, b) => b.amount - a.amount).slice(0, 5);

    const incomeByMember = familyMembers.map((member) => {
      const memberIncomes = incomes.filter((item) => item.member === member);
      const amount = memberIncomes.reduce((sum, item) => sum + item.amount, 0);
      const count = memberIncomes.length;
      const percent = totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0;
      return { member, amount, count, percent };
    });

    return { totalIncome, averageIncome, highestMonth, monthlyData, categoryData, topIncomes, incomeByMember };
  }, [incomes]);

  const maxMonthAmount = Math.max(...monthlyData.map(d => d.amount), 1);
  const ticks = useMemo(() => calculateTicks(maxMonthAmount, 4), [maxMonthAmount]);
  const chartMax = ticks[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Báo cáo năm {year}</h1>
          <p className="text-sm text-slate-500">Tổng quan tình hình thu nhập cả năm</p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="year-select" className="text-sm font-medium text-slate-700">Chọn năm</label>
          <select
            id="year-select"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <Icon className="h-5 w-5" name="banknote" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Tổng thu nhập năm</p>
              <p className="text-2xl font-bold text-slate-950">{currency(totalIncome)}</p>
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
              <p className="text-2xl font-bold text-slate-950">{currency(averageIncome)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-50 text-amber-600">
              <Icon className="h-5 w-5" name="sparkles" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Tháng cao nhất (T{highestMonth.month})</p>
              <p className="text-2xl font-bold text-slate-950">{currency(highestMonth.amount)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {incomeByMember.map((item) => {
          const meta = memberMeta[item.member];
          return (
            <div
              className={cn("rounded-xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-inset", meta.badge)}
              key={item.member}
            >
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
                <p className="text-sm font-semibold">
                  {meta.label} · {meta.role}
                </p>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-950">{currency(item.amount)}</p>
              <p className="mt-1 text-xs text-slate-600">
                {item.count} khoản thu · {item.percent}% tổng thu
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-950 mb-6">Biểu đồ thu nhập 12 tháng</h2>
          <div className="flex h-64 w-full gap-2">
            {/* Y-axis markers */}
            <div className="flex h-full w-12 shrink-0 flex-col justify-between pb-[1.75rem] text-right text-xs font-medium text-slate-400">
              {ticks.map((t, i) => <span key={i} className="leading-none mt-1">{compactCurrency(t)}</span>)}
            </div>

            {/* Bars Area */}
            <div className="relative flex flex-1 items-end justify-between gap-1 pb-6">
              {/* Background grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pb-[1.75rem] pointer-events-none">
                {ticks.map((t, i) => (
                  <div key={i} className={cn("w-full border-t border-slate-200", i === ticks.length - 1 ? "mb-[1px]" : "border-dashed mt-1.5")} />
                ))}
              </div>

              {/* Bars */}
              {monthlyData.map((item) => {
                const heightPercent = chartMax > 0 ? (item.amount / chartMax) * 100 : 0;
                return (
                  <div key={item.month} className="group relative flex h-full w-full flex-col items-center justify-end gap-2 z-10">
                    <div 
                      className="w-full max-w-[40px] rounded-t-md bg-emerald-500 transition-all group-hover:bg-emerald-600"
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

        {/* Donut Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-950 mb-6">Cơ cấu thu nhập</h2>
          <IncomeDonut data={categoryData} total={totalIncome} categoryMeta={categoryMeta} />
        </div>
      </div>

      {/* Top Incomes */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-950 mb-6">Top khoản thu lớn nhất</h2>
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
              {topIncomes.map((inc) => {
                const meta = categoryMeta[inc.category] ?? { label: inc.category, ...fallbackCategoryMeta };
                return (
                  <tr key={inc.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="py-3 text-slate-500">
                      {new Intl.DateTimeFormat("vi-VN").format(new Date(inc.date))}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("grid h-6 w-6 place-items-center rounded-md ring-1 ring-inset", meta.badge)}>
                          <Icon className="h-3.5 w-3.5" name={meta.icon} />
                        </span>
                        <span className="font-medium text-slate-900">{meta.label}</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">{inc.note}</td>
                    <td className="py-3 text-right font-bold text-slate-900">{currency(inc.amount)}</td>
                  </tr>
                );
              })}
              {topIncomes.length === 0 && (
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
