"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { vietnamToday } from "@/lib/vietnam-date";
import { Icon } from "./icons";
import { actualForType, InvestmentYearTargets, type TargetRow } from "./investment-year-targets";

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
  byType: Partial<Record<AssetKey, number>>;
};

type InvestmentRow = {
  type: string;
  quantity: number;
  purchasePrice: number;
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

export function YearlyInvestmentDashboard() {
  const currentYear = vietnamToday().slice(0, 4);
  const currentMonth = Number(vietnamToday().slice(5, 7));
  const [year, setYear] = useState(currentYear);
  const [investments, setInvestments] = useState<InvestmentRow[]>([]);
  const [targets, setTargets] = useState<TargetRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const availableYears = useMemo(() => {
    const y = Number(currentYear);
    return [y - 2, y - 1, y, y + 1].map(String);
  }, [currentYear]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [investmentRes, targetRes] = await Promise.all([
        fetch(`/api/investments?year=${encodeURIComponent(year)}`),
        fetch(`/api/investments/targets?year=${encodeURIComponent(year)}`),
      ]);
      if (!investmentRes.ok) {
        throw new Error("Không tải được danh mục đầu tư.");
      }
      const investmentData = (await investmentRes.json()) as { investments?: InvestmentRow[] };
      setInvestments(Array.isArray(investmentData.investments) ? investmentData.investments : []);
      if (targetRes.ok) {
        const targetData = (await targetRes.json()) as { targets?: TargetRow[] };
        setTargets(Array.isArray(targetData.targets) ? targetData.targets : []);
      } else {
        setTargets([]);
      }
    } catch (error) {
      setInvestments([]);
      setTargets([]);
      setLoadError(error instanceof Error ? error.message : "Không tải được báo cáo năm.");
    } finally {
      setIsLoading(false);
    }
  }, [year]);

  useEffect(() => {
    void load();
  }, [load]);

  const months = useMemo(() => {
    const rows: MonthRow[] = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
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

    return rows;
  }, [investments]);

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

  const targetStats = useMemo(() => {
    const scored = targets
      .filter((row) => row.targetValue > 0)
      .map((row) => {
        const actual = actualForType(investments, row.type);
        const pct = (actual / row.targetValue) * 100;
        return { type: row.type, pct };
      });
    const reached = scored.filter((row) => row.pct >= 100).length;
    const slowest = scored.length
      ? scored.reduce((best, row) => (row.pct < best.pct ? row : best))
      : null;
    return { reached, total: scored.length, slowest };
  }, [targets, investments]);

  const selected = months[selectedMonth - 1];
  const selectedInvested = investedTotal(selected);
  const selectedSlices = ASSET_ORDER.map((key) => ({
    key,
    amount: selected.byType[key] ?? 0,
  })).filter((item) => item.amount > 0);

  const maxInvested = Math.max(...months.map(investedTotal), 1);
  const largestType = (row: MonthRow) => {
    let best: AssetKey | null = null;
    let max = 0;
    for (const key of ASSET_ORDER) {
      const amount = row.byType[key] ?? 0;
      if (amount > max) {
        max = amount;
        best = key;
      }
    }
    return best;
  };

  return (
    <div className="flex w-full flex-col gap-6 px-2.5 py-4 sm:py-5">
      <header className="rounded-lg border border-amber-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-700">Đầu tư</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950">Báo cáo năm {year}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Cơ cấu vốn từng tháng và tiến độ mục tiêu năm (thực tế / hạn mức), giống 6 lọ tài chính.
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
        <Kpi
          icon="check"
          label="Loại đã đạt mục tiêu"
          value={targetStats.total ? `${targetStats.reached}/${targetStats.total}` : "—"}
          hint="Các loại đã đặt hạn mức năm"
        />
        <Kpi
          icon="target"
          label="Loại chậm nhất"
          value={
            targetStats.slowest
              ? `${assetMeta[targetStats.slowest.type].short} ${Math.round(targetStats.slowest.pct * 10) / 10}%`
              : "—"
          }
          hint="Thấp nhất so với mục tiêu"
        />
      </section>

      <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Cơ cấu vốn 12 tháng</h2>
          <p className="mt-1 text-xs text-slate-500">Click cột để xem chi tiết tháng. Màu = loại tài sản.</p>
          <div className="mt-4 flex h-48 gap-2">
            <div className="flex w-9 shrink-0 flex-col justify-between pb-5 text-right text-[10px] text-slate-400">
              <span>{compact(maxInvested)}</span>
              <span>{compact(maxInvested / 2)}</span>
              <span>0</span>
            </div>
            <div className="relative flex flex-1 items-end gap-1.5 pb-5">
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-5">
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
                    className="group relative z-10 flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                    key={row.month}
                    onClick={() => setSelectedMonth(row.month)}
                    type="button"
                  >
                    <span className="mb-0.5 text-[9px] font-semibold leading-none text-slate-500">
                      {total > 0 ? compact(total) : ""}
                    </span>
                    <div
                      className={cn(
                        "flex w-full max-w-[36px] flex-col-reverse overflow-hidden rounded-t",
                        active && "ring-2 ring-slate-900 ring-offset-1",
                      )}
                      style={{ height: `${Math.max(height, total > 0 ? 8 : 1)}%` }}
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
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
            {ASSET_ORDER.map((key) => (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600" key={key}>
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: assetMeta[key].chart }} />
                {assetMeta[key].short}
              </span>
            ))}
          </div>
        </div>

        <InvestmentYearTargets investments={investments} onSaved={() => void load()} targets={targets} year={year} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Tháng {selectedMonth}: {currency(selectedInvested)}</h2>
          <p className="mt-1 text-sm text-slate-600">Cơ cấu vốn bỏ vào trong tháng này.</p>
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
                <th className="pb-2 text-right font-semibold">Vốn</th>
                <th className="pb-2 text-right font-semibold">Loại lớn nhất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {months.map((row) => {
                const total = investedTotal(row);
                const top = largestType(row);
                const active = selectedMonth === row.month;
                return (
                  <tr
                    className={cn("cursor-pointer", active ? "bg-amber-50" : "hover:bg-slate-50")}
                    key={row.month}
                    onClick={() => setSelectedMonth(row.month)}
                  >
                    <td className="py-2 font-medium text-slate-800">T{row.month}</td>
                    <td className="py-2 text-right text-slate-700">{total ? compact(total) : "—"}</td>
                    <td className="py-2 text-right text-slate-700">{top && total ? assetMeta[top].short : "—"}</td>
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

function Kpi({ icon, label, value, hint }: { icon: "wallet" | "check" | "target"; label: string; value: string; hint: string }) {
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
