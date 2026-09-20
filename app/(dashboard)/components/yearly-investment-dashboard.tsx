"use client";

import { useEffect, useMemo, useState } from "react";
import { vietnamToday } from "@/lib/vietnam-date";
import { Icon } from "./icons";

type AssetKey = "GOLD" | "STOCK" | "SAVING" | "FUND_DCDS" | "FUND_ETF_VN30" | "REAL_ESTATE" | "CRYPTO" | "OTHER";

const ASSET_ORDER: AssetKey[] = ["FUND_DCDS", "FUND_ETF_VN30", "SAVING", "GOLD", "STOCK", "REAL_ESTATE", "CRYPTO", "OTHER"];

const assetMeta: Record<AssetKey, { label: string; short: string; chart: string }> = {
  FUND_DCDS: { label: "CCQ CP DCDS", short: "DCDS", chart: "#6366f1" },
  FUND_ETF_VN30: { label: "CCQ ETF VN30", short: "ETF", chart: "#14b8a6" },
  SAVING: { label: "Sổ tiết kiệm", short: "TK", chart: "#10b981" },
  GOLD: { label: "Vàng", short: "Vàng", chart: "#eab308" },
  STOCK: { label: "Chứng khoán", short: "CK", chart: "#3b82f6" },
  REAL_ESTATE: { label: "Bất động sản", short: "BĐS", chart: "#f97316" },
  CRYPTO: { label: "Crypto", short: "Crypto", chart: "#a855f7" },
  OTHER: { label: "Khác", short: "Khác", chart: "#64748b" },
};

type MonthRow = {
  month: number;
  income: number;
  byType: Partial<Record<AssetKey, number>>;
};

type InvestmentRow = {
  type: string;
  quantity: number;
  purchasePrice: number;
  date: string;
};

type IncomeRow = {
  amount: number;
  date: string;
};

const EXCLUDED_TYPES = new Set(["DEBT", "DEBT_INTEREST", "LOAN"]);

function monthFromDate(date: string) {
  const key = date.slice(0, 10);
  const month = Number(key.slice(5, 7));
  return month >= 1 && month <= 12 ? month : null;
}

function toAssetKey(type: string): AssetKey | null {
  if (EXCLUDED_TYPES.has(type)) return null;
  if ((ASSET_ORDER as string[]).includes(type)) return type as AssetKey;
  return "OTHER";
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function currency(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function investedTotal(row: MonthRow) {
  return ASSET_ORDER.reduce((sum, key) => sum + (row.byType[key] ?? 0), 0);
}

function pctOfIncome(invested: number, income: number) {
  if (income <= 0) return null;
  return Math.round((invested / income) * 1000) / 10;
}

export function YearlyInvestmentDashboard() {
  const currentYear = vietnamToday().slice(0, 4);
  const currentMonth = Number(vietnamToday().slice(5, 7));
  const [year, setYear] = useState(currentYear);
  const [investments, setInvestments] = useState<InvestmentRow[]>([]);
  const [incomes, setIncomes] = useState<IncomeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const availableYears = useMemo(() => {
    const y = Number(currentYear);
    return [y - 2, y - 1, y, y + 1].map(String);
  }, [currentYear]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [investmentRes, incomeRes] = await Promise.all([
          fetch(`/api/investments?year=${encodeURIComponent(year)}`),
          fetch(`/api/incomes?year=${encodeURIComponent(year)}`),
        ]);
        if (cancelled) return;

        if (!investmentRes.ok) {
          throw new Error("Không tải được danh mục đầu tư.");
        }
        const investmentData = (await investmentRes.json()) as { investments?: InvestmentRow[] };
        setInvestments(Array.isArray(investmentData.investments) ? investmentData.investments : []);

        if (incomeRes.ok) {
          const incomeData = (await incomeRes.json()) as { incomes?: IncomeRow[] };
          setIncomes(Array.isArray(incomeData.incomes) ? incomeData.incomes : []);
        } else {
          setIncomes([]);
        }
      } catch (error) {
        if (!cancelled) {
          setInvestments([]);
          setIncomes([]);
          setLoadError(error instanceof Error ? error.message : "Không tải được báo cáo năm.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [year]);

  const months = useMemo(() => {
    const rows: MonthRow[] = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      income: 0,
      byType: {},
    }));

    for (const item of investments) {
      const month = monthFromDate(item.date);
      const key = toAssetKey(item.type);
      if (!month || !key) continue;
      const amount = item.quantity * item.purchasePrice;
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const row = rows[month - 1];
      row.byType[key] = (row.byType[key] ?? 0) + amount;
    }

    for (const item of incomes) {
      const month = monthFromDate(item.date);
      if (!month) continue;
      const amount = Number(item.amount) || 0;
      if (amount <= 0) continue;
      rows[month - 1].income += amount;
    }

    return rows;
  }, [investments, incomes]);

  useEffect(() => {
    if (isLoading) return;
    if (year === currentYear) {
      setSelectedMonth(currentMonth);
      return;
    }
    const lastWithData = [...months].reverse().find((row) => investedTotal(row) > 0);
    setSelectedMonth(lastWithData?.month ?? 1);
  }, [year, isLoading, currentYear, currentMonth, months]);

  const yearInvested = months.reduce((sum, row) => sum + investedTotal(row), 0);
  const percents = months
    .map((row) => pctOfIncome(investedTotal(row), row.income))
    .filter((value): value is number => value != null);
  const avgPct = percents.length ? Math.round((percents.reduce((a, b) => a + b, 0) / percents.length) * 10) / 10 : 0;
  const peak = months.reduce(
    (best, row) => (investedTotal(row) > investedTotal(best) ? row : best),
    months[0],
  );

  const selected = months[selectedMonth - 1];
  const selectedInvested = investedTotal(selected);
  const selectedPct = pctOfIncome(selectedInvested, selected.income);
  const selectedSlices = ASSET_ORDER.map((key) => ({
    key,
    amount: selected.byType[key] ?? 0,
  })).filter((item) => item.amount > 0);

  const maxInvested = Math.max(...months.map(investedTotal), 1);
  const maxPct = Math.max(...percents, 20);

  return (
    <div className="flex w-full flex-col gap-6 px-2.5 py-4 sm:py-5">
      <header className="rounded-lg border border-amber-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-700">Đầu tư</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950">Báo cáo năm {year}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Cơ cấu vốn bỏ vào từng tháng (DCDS, ETF, sổ TK, vàng…) và tỷ lệ so với thu nhập tháng đó.
            </p>
            {loadError ? <p className="mt-2 text-sm font-semibold text-rose-600">{loadError}</p> : null}
            {isLoading ? <p className="mt-2 text-sm font-medium text-slate-500">Đang tải báo cáo năm…</p> : null}
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <span>Chọn năm</span>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              onChange={(event) => setYear(event.target.value)}
              value={year}
            >
              {availableYears.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Kpi icon="wallet" label="Tổng vốn đầu tư năm" value={currency(yearInvested)} hint="Không gồm nợ / cho vay" />
        <Kpi icon="barChart" label="TB % thu nhập / tháng" value={`${avgPct}%`} hint="Các tháng có thu nhập > 0" />
        <Kpi icon="sparkles" label={`Tháng đầu tư nhiều nhất (T${peak.month})`} value={compact(investedTotal(peak))} hint={currency(investedTotal(peak))} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Cơ cấu vốn 12 tháng</h2>
          <p className="mt-1 text-xs text-slate-500">Click cột để xem chi tiết tháng. Màu = loại tài sản.</p>
          <div className="mt-5 flex h-64 gap-2">
            <div className="flex w-8 shrink-0 flex-col justify-between pb-6 text-right text-[10px] text-slate-400">
              <span>{compact(maxInvested)}</span>
              <span>{compact(maxInvested / 2)}</span>
              <span>0</span>
            </div>
            <div className="relative flex flex-1 items-end justify-between gap-1 pb-6">
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-6">
                <div className="border-t border-slate-200" />
                <div className="border-t border-dashed border-slate-200" />
                <div className="mb-px border-t border-slate-200" />
              </div>
              {months.map((row) => {
                const total = investedTotal(row);
                const height = (total / maxInvested) * 100;
                const active = selectedMonth === row.month;
                return (
                  <button
                    className="group relative z-10 flex h-full w-full flex-col items-center justify-end"
                    key={row.month}
                    onClick={() => setSelectedMonth(row.month)}
                    type="button"
                  >
                    <span className="mb-1 text-[9px] font-semibold text-slate-500">{total > 0 ? compact(total) : ""}</span>
                    <div
                      className={cn(
                        "flex w-full max-w-[28px] flex-col-reverse overflow-hidden rounded-t",
                        active && "ring-2 ring-slate-900 ring-offset-1",
                      )}
                      style={{ height: `${Math.max(height, total > 0 ? 6 : 1)}%` }}
                    >
                      {ASSET_ORDER.map((key) => {
                        const amount = row.byType[key] ?? 0;
                        if (amount <= 0 || total <= 0) return null;
                        return (
                          <div
                            key={key}
                            style={{ backgroundColor: assetMeta[key].chart, height: `${(amount / total) * 100}%` }}
                            title={`${assetMeta[key].short}: ${compact(amount)}`}
                          />
                        );
                      })}
                    </div>
                    <span className={cn("mt-1 text-[10px] font-medium", active ? "font-bold text-slate-900" : "text-slate-500")}>
                      T{row.month}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {ASSET_ORDER.map((key) => (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600" key={key}>
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: assetMeta[key].chart }} />
                {assetMeta[key].short}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Đầu tư / thu nhập theo tháng</h2>
          <p className="mt-1 text-xs text-slate-500">Vốn bỏ vào tháng đó so với tổng thu nhập cùng tháng.</p>
          <div className="mt-5 flex h-64 gap-2">
            <div className="flex w-8 shrink-0 flex-col justify-between pb-6 text-right text-[10px] text-slate-400">
              <span>{Math.ceil(maxPct)}%</span>
              <span>{Math.round(maxPct / 2)}%</span>
              <span>0</span>
            </div>
            <div className="relative flex flex-1 items-end justify-between gap-1 pb-6">
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-6">
                <div className="border-t border-slate-200" />
                <div className="border-t border-dashed border-slate-200" />
                <div className="mb-px border-t border-slate-200" />
              </div>
              {months.map((row) => {
                const total = investedTotal(row);
                const pct = pctOfIncome(total, row.income);
                const height = pct != null ? (pct / maxPct) * 100 : 0;
                const active = selectedMonth === row.month;
                return (
                  <button
                    className="relative z-10 flex h-full w-full flex-col items-center justify-end"
                    key={row.month}
                    onClick={() => setSelectedMonth(row.month)}
                    title={pct == null ? `T${row.month}: không có thu nhập` : `T${row.month}: ${compact(total)} / ${compact(row.income)} = ${pct}%`}
                    type="button"
                  >
                    <span className="mb-1 text-[9px] font-semibold text-slate-500">{pct != null && pct > 0 ? `${pct}%` : ""}</span>
                    <div
                      className={cn("w-full max-w-[28px] rounded-t bg-emerald-500", active && "bg-emerald-700")}
                      style={{ height: `${Math.max(height, pct && pct > 0 ? 4 : 1)}%` }}
                    />
                    <span className={cn("mt-1 text-[10px] font-medium", active ? "font-bold text-slate-900" : "text-slate-500")}>
                      T{row.month}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Tháng {selectedMonth}: {currency(selectedInvested)}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {selectedPct == null
              ? "Tháng này chưa có thu nhập để tính tỷ lệ."
              : `Chiếm ${selectedPct}% thu nhập tháng (${currency(selected.income)}).`}
          </p>
          {selectedInvested <= 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Không bỏ vốn đầu tư trong tháng này.</p>
          ) : (
            <div className="mt-5 grid gap-6 sm:grid-cols-[200px_1fr] sm:items-center">
              <AllocationDonut slices={selectedSlices} total={selectedInvested} />
              <div className="space-y-3">
                {selectedSlices.map((item) => {
                  const percent = Math.round((item.amount / selectedInvested) * 100);
                  const meta = assetMeta[item.key];
                  return (
                    <div key={item.key}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2 font-medium text-slate-800">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: meta.chart }} />
                          {meta.label}
                        </span>
                        <span className="text-right text-xs font-semibold text-slate-600">
                          {compact(item.amount)} · {percent}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: meta.chart }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Bảng 12 tháng</h2>
          <table className="mt-3 w-full min-w-[18rem] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="pb-2 font-semibold">Tháng</th>
                <th className="pb-2 text-right font-semibold">Đầu tư</th>
                <th className="pb-2 text-right font-semibold">Thu nhập</th>
                <th className="pb-2 text-right font-semibold">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {months.map((row) => {
                const total = investedTotal(row);
                const pct = pctOfIncome(total, row.income);
                const active = selectedMonth === row.month;
                return (
                  <tr
                    className={cn("cursor-pointer", active ? "bg-amber-50" : "hover:bg-slate-50")}
                    key={row.month}
                    onClick={() => setSelectedMonth(row.month)}
                  >
                    <td className="py-2 font-medium text-slate-800">T{row.month}</td>
                    <td className="py-2 text-right text-slate-700">{total ? compact(total) : "—"}</td>
                    <td className="py-2 text-right text-slate-700">{row.income ? compact(row.income) : "—"}</td>
                    <td className="py-2 text-right font-semibold text-slate-800">{pct == null ? "—" : `${pct}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon, label, value, hint }: { icon: "wallet" | "barChart" | "sparkles"; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
          <Icon className="h-5 w-5" name={icon} />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
      </div>
    </div>
  );
}

function AllocationDonut({ slices, total }: { slices: Array<{ key: AssetKey; amount: number }>; total: number }) {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="relative mx-auto h-44 w-44">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 180 180">
        <circle cx="90" cy="90" fill="none" r={radius} stroke="#f1f5f9" strokeWidth="22" />
        {slices.map((item) => {
          const length = total > 0 ? (item.amount / total) * circumference : 0;
          const segment = (
            <circle
              cx="90"
              cy="90"
              fill="none"
              key={item.key}
              r={radius}
              stroke={assetMeta[item.key].chart}
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
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Tổng</p>
          <p className="text-sm font-bold text-slate-950">{compact(total)}</p>
        </div>
      </div>
    </div>
  );
}
