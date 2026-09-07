"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { readMoney } from "@/app/utils/read-money";
import { vietnamToday } from "@/lib/vietnam-date";
import { Icon, IconName } from "./icons";

type AssetType =
  | "GOLD"
  | "STOCK"
  | "SAVING"
  | "REAL_ESTATE"
  | "CRYPTO"
  | "DEBT"
  | "LOAN"
  | "OTHER"
  | "FUND_DCDS"
  | "FUND_ETF_VN30"
  | "DEBT_INTEREST";
type FamilyMember = "CK" | "VK" | "CON";

type TabKey = "overview" | "gold" | "stock" | "saving" | "fund" | "crypto" | "debt" | "other";

const ASSET_TYPES: AssetType[] = [
  "GOLD",
  "STOCK",
  "SAVING",
  "FUND_DCDS",
  "FUND_ETF_VN30",
  "REAL_ESTATE",
  "CRYPTO",
  "DEBT",
  "DEBT_INTEREST",
  "LOAN",
  "OTHER",
];

const TAB_ASSET_MAP: Record<Exclude<TabKey, "overview">, AssetType[]> = {
  gold: ["GOLD"],
  stock: ["STOCK"],
  saving: ["SAVING"],
  fund: ["FUND_DCDS", "FUND_ETF_VN30"],
  crypto: ["CRYPTO"],
  debt: ["DEBT", "DEBT_INTEREST", "LOAN"],
  other: ["REAL_ESTATE", "OTHER"],
};

const ZERO_PNL_TYPES: AssetType[] = ["DEBT", "LOAN", "DEBT_INTEREST"];
const FUND_DEFAULT_NAMES: Partial<Record<AssetType, string>> = {
  FUND_DCDS: "CCQ CP DCDS",
  FUND_ETF_VN30: "CCQ ETF VN30",
};

function isFundType(type: AssetType) {
  return type === "FUND_DCDS" || type === "FUND_ETF_VN30";
}

function usesQuantityPresets(type: AssetType) {
  return type === "GOLD" || isFundType(type);
}

const QUANTITY_PRESETS = ["0.5", "1", "2", "3", "4", "5"] as const;

/** Canonical stored value uses JS decimal (14000000, 0.5). Display is vi-VN: 14.000.000 / 0,5. */
function parseStoredNumber(canonical: string) {
  const trimmed = canonical.trim();
  if (!trimmed) return NaN;
  return Number(trimmed);
}

function canonicalizeNumberInput(value: string) {
  const cleaned = String(value).replace(/[^\d.,]/g, "");
  if (!cleaned) return "";

  const lastComma = cleaned.lastIndexOf(",");
  if (lastComma >= 0) {
    const intPart = cleaned.slice(0, lastComma).replace(/[.,]/g, "");
    const frac = cleaned.slice(lastComma + 1).replace(/\D/g, "");
    if (cleaned.endsWith(",")) return intPart ? `${intPart}.` : "";
    return frac ? `${intPart}.${frac}` : intPart;
  }

  // In vi-VN the dot is a thousand separator, never a decimal.
  return cleaned.replace(/\./g, "");
}

/** Quantity uses `.` as the decimal point (10.56), not vi-VN comma. */
function canonicalizeQuantityInput(value: string) {
  const cleaned = String(value).replace(/,/g, ".").replace(/[^\d.]/g, "");
  if (!cleaned) return "";
  const dot = cleaned.indexOf(".");
  if (dot < 0) return cleaned;
  return `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\./g, "")}`;
}

function formatNumberInput(canonical: string) {
  if (!canonical) return "";
  const hasTrailingDecimal = canonical.endsWith(".");
  const [intPart, frac] = canonical.split(".");
  const formattedInt = new Intl.NumberFormat("vi-VN").format(Number(intPart || "0"));
  if (hasTrailingDecimal) return `${formattedInt},`;
  if (frac != null && canonical.includes(".")) return `${formattedInt},${frac}`;
  return formattedInt;
}

function isAllowedUnitQuantity(value: number) {
  if (!Number.isFinite(value) || value <= 0) return false;
  if (value === 0.5) return true;
  return Number.isInteger(value);
}

function isZeroPnlType(type: AssetType) {
  return ZERO_PNL_TYPES.includes(type);
}

function effectiveUnitPrice(item: { type: AssetType; purchasePrice: number; currentPrice: number }) {
  return item.currentPrice > 0 ? item.currentPrice : item.purchasePrice;
}

function assetPresentValue(item: Investment) {
  if (item.type === "DEBT") {
    return -(effectiveUnitPrice(item) * item.quantity);
  }
  if (item.type === "DEBT_INTEREST") {
    return 0;
  }
  if (item.type === "SAVING" && item.interestRate && item.term) {
    const pnl = (item.purchasePrice * item.quantity) * (item.interestRate / 100) / 12 * Number(item.term);
    return item.purchasePrice * item.quantity + pnl;
  }
  return effectiveUnitPrice(item) * item.quantity;
}

function assetCostValue(item: Investment) {
  if (item.type === "DEBT" || item.type === "LOAN" || item.type === "DEBT_INTEREST") {
    return 0;
  }
  return item.purchasePrice * item.quantity;
}

function formatQuantity(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 6, useGrouping: false });
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

type Investment = {
  id: number;
  name: string;
  type: AssetType;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  interestRate?: number | null;
  term?: string | null;
  member: FamilyMember;
  note: string;
  date: string;
};

type InvestmentForm = {
  name: string;
  type: AssetType;
  quantity: string;
  purchasePrice: string;
  currentPrice: string;
  interestRate: string;
  term: string;
  member: FamilyMember;
  note: string;
  date: string;
};

function createEmptyForm(defaultType: AssetType = "GOLD"): InvestmentForm {
  return {
    name: FUND_DEFAULT_NAMES[defaultType] ?? "",
    type: defaultType,
    quantity: "1",
    purchasePrice: "",
    currentPrice: "",
    interestRate: "",
    term: "",
    member: "CK",
    note: "",
    date: vietnamToday(),
  };
}

function defaultTypeForTab(tab: TabKey): AssetType {
  switch (tab) {
    case "gold": return "GOLD";
    case "stock": return "STOCK";
    case "saving": return "SAVING";
    case "fund": return "FUND_DCDS";
    case "debt": return "DEBT";
    case "other": return "REAL_ESTATE";
    default: return "GOLD";
  }
}

const assetMeta: Record<AssetType, { label: string; icon: IconName; chart: string; badge: string }> = {
  GOLD: { label: "Vàng", icon: "sparkles", chart: "#eab308", badge: "bg-yellow-50 text-yellow-700 ring-yellow-100" },
  STOCK: { label: "Chứng khoán", icon: "trendingUp", chart: "#3b82f6", badge: "bg-blue-50 text-blue-700 ring-blue-100" },
  SAVING: { label: "Sổ tiết kiệm", icon: "wallet", chart: "#10b981", badge: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  FUND_DCDS: { label: "CCQ CP DCDS", icon: "briefcase", chart: "#6366f1", badge: "bg-indigo-50 text-indigo-700 ring-indigo-100" },
  FUND_ETF_VN30: { label: "CCQ ETF VN30", icon: "barChart", chart: "#14b8a6", badge: "bg-teal-50 text-teal-700 ring-teal-100" },
  REAL_ESTATE: { label: "Bất động sản", icon: "home", chart: "#f97316", badge: "bg-orange-50 text-orange-700 ring-orange-100" },
  CRYPTO: { label: "Crypto", icon: "banknote", chart: "#a855f7", badge: "bg-purple-50 text-purple-700 ring-purple-100" },
  DEBT: { label: "Nợ", icon: "trendingDown", chart: "#f43f5e", badge: "bg-rose-50 text-rose-700 ring-rose-100" },
  DEBT_INTEREST: { label: "Trả nợ lãi vay", icon: "trendingDown", chart: "#be123c", badge: "bg-rose-50 text-rose-800 ring-rose-100" },
  LOAN: { label: "Cho vay", icon: "trendingUp", chart: "#0ea5e9", badge: "bg-sky-50 text-sky-700 ring-sky-100" },
  OTHER: { label: "Khác", icon: "target", chart: "#64748b", badge: "bg-slate-50 text-slate-700 ring-slate-100" },
};

const familyMembers: FamilyMember[] = ["CK", "VK", "CON"];

const memberMeta: Record<FamilyMember, { label: string; role: string; badge: string; dot: string }> = {
  CK: { label: "CK", role: "Chồng", badge: "bg-blue-50 text-blue-700 ring-blue-100", dot: "bg-blue-500" },
  VK: { label: "VK", role: "Vợ", badge: "bg-pink-50 text-pink-700 ring-pink-100", dot: "bg-pink-500" },
  CON: { label: "CON", role: "Con", badge: "bg-lime-50 text-lime-700 ring-lime-100", dot: "bg-lime-500" },
};

const tabMeta: Record<TabKey, { label: string; icon: IconName; color: string; badge: string; iconColor: string }> = {
  overview: { label: "Tổng quan", icon: "barChart", color: "purple", badge: "bg-purple-50 text-purple-700 ring-purple-200 hover:bg-purple-100", iconColor: "text-purple-500" },
  gold: { label: "Vàng", icon: "sparkles", color: "yellow", badge: "bg-yellow-50 text-yellow-700 ring-yellow-200 hover:bg-yellow-100", iconColor: "text-yellow-500" },
  stock: { label: "Chứng khoán", icon: "trendingUp", color: "blue", badge: "bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100", iconColor: "text-blue-500" },
  saving: { label: "Tiết kiệm", icon: "wallet", color: "emerald", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100", iconColor: "text-emerald-500" },
  fund: { label: "Chứng chỉ quỹ", icon: "briefcase", color: "indigo", badge: "bg-indigo-50 text-indigo-700 ring-indigo-200 hover:bg-indigo-100", iconColor: "text-indigo-500" },
  crypto: { label: "Bitcoin", icon: "bitcoin", color: "orange", badge: "bg-orange-50 text-orange-700 ring-orange-200 hover:bg-orange-100", iconColor: "text-orange-500" },
  debt: { label: "Nợ & Cho vay", icon: "trendingDown", color: "rose", badge: "bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100", iconColor: "text-rose-500" },
  other: { label: "Khác", icon: "target", color: "slate", badge: "bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200", iconColor: "text-slate-500" },
};

const TAB_KEYS: TabKey[] = ["overview", "gold", "stock", "saving", "fund", "crypto", "debt", "other"];

// ─── Shared UI primitives ───────────────────────────────────────────────────

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
  variant?: "primary" | "secondary" | "danger" | "outline";
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
        variant === "outline" && "border-2 border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
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

function QuantityCombobox({
  id,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <input
        className={cn(inputClass(), "w-full pr-10")}
        id={id}
        inputMode="decimal"
        onChange={(event) => onChange(canonicalizeQuantityInput(event.target.value))}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        required
        value={value}
      />
      <button
        aria-label="Chọn số lượng"
        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-500 hover:text-slate-950"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Icon className={cn("h-4 w-4 transition", open && "rotate-90")} name="chevronRight" />
      </button>
      {open ? (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {QUANTITY_PRESETS.map((preset) => (
            <li key={preset}>
              <button
                className={cn(
                  "flex w-full px-3 py-2 text-left text-sm hover:bg-emerald-50",
                  value === preset ? "font-semibold text-emerald-700" : "text-slate-800",
                )}
                onClick={() => {
                  onChange(preset);
                  setOpen(false);
                }}
                type="button"
              >
                {preset}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Dialog({ open, title, description, children, onClose }: { open: boolean; title: string; description?: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 px-4 py-6" role="presentation">
      <div className="flex min-h-full items-center justify-center">
        <div aria-modal="true" className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl" role="dialog">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-lg border-b border-slate-100 bg-white p-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
              {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
            </div>
            <IconButton label="Đóng" onClick={onClose}>
              <Icon className="h-4 w-4" name="x" />
            </IconButton>
          </div>
          <div className="p-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function InvestmentDonut({
  data,
  total,
}: {
  data: Array<{ type: AssetType; amount: number }>;
  total: number;
}) {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const sumOfAmounts = data.reduce((sum, item) => sum + item.amount, 0);
  let offset = 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-center">
      <div className="relative mx-auto h-56 w-56">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 180 180">
          <circle cx="90" cy="90" fill="none" r={radius} stroke="#f1f5f9" strokeWidth="22" />
          {data.map((item) => {
            const length = sumOfAmounts > 0 ? (item.amount / sumOfAmounts) * circumference : 0;
            const meta = assetMeta[item.type];
            const segment = (
              <circle
                cx="90"
                cy="90"
                fill="none"
                key={item.type}
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
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tài sản ròng</p>
            <p className="mt-1 text-sm font-bold text-slate-950">{currency(total)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {data.map((item) => {
          const percent = sumOfAmounts ? Math.round((item.amount / sumOfAmounts) * 100) : 0;
          const meta = assetMeta[item.type];
          return (
            <div key={item.type}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: meta.chart }} />
                  {meta.label}
                </div>
                <span className="text-slate-500">{percent}%</span>
              </div>
              <div className={cn("mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100")}>
                <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: meta.chart }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Monthly Bar Chart Component ────────────────────────────────────────────

function MonthlyBarChart({
  data,
}: {
  data: Array<{ month: string; label: string; value: number }>;
}) {
  if (data.length === 0) {
    return <div className="grid h-48 place-items-center text-slate-400 italic">Chưa có dữ liệu</div>;
  }

  const maxVal = Math.max(...data.map((d) => d.value)) || 1;

  return (
    <div className="relative h-56 w-full pt-4">
      <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-400 pb-6 pointer-events-none">
        <div className="border-b border-slate-100 flex-1 relative"><span className="absolute -top-2 bg-white pr-2">{currency(maxVal)}</span></div>
        <div className="border-b border-slate-100 flex-1 relative"><span className="absolute -top-2 bg-white pr-2">{currency(maxVal * 0.66)}</span></div>
        <div className="border-b border-slate-100 flex-1 relative"><span className="absolute -top-2 bg-white pr-2">{currency(maxVal * 0.33)}</span></div>
        <div className="flex-1 relative"><span className="absolute -top-2 bg-white pr-2">0 ₫</span></div>
      </div>
      <div className="absolute inset-0 pb-6 pl-16 pr-2 flex items-end justify-between gap-1 overflow-hidden">
        {data.map((item) => {
          const hPercent = (item.value / maxVal) * 100;
          return (
            <div key={item.month} className="group relative flex w-full flex-col items-center justify-end h-full">
              <div 
                className="w-full max-w-[40px] rounded-t-sm bg-purple-500 transition-all hover:bg-purple-600" 
                style={{ height: `${Math.max(hPercent, 2)}%` }} 
              />
              <div className="absolute -bottom-6 w-full text-center text-xs text-slate-500 truncate">{item.label}</div>
              {/* Tooltip */}
              <div className="pointer-events-none absolute -top-10 z-10 hidden whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white shadow-md group-hover:block">
                {item.label}: {currency(item.value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Gold Monthly Bar Chart Component ───────────────────────────────────────

function GoldMonthlyBarChart({ data }: { data: Investment[] }) {
  // Extract all years from gold data
  const years = Array.from(new Set(data.map(inv => inv.date.substring(0, 4)))).sort((a, b) => b.localeCompare(a));
  const currentYear = new Date().getFullYear().toString();
  const defaultYear = years.includes(currentYear) ? currentYear : (years[0] || currentYear);
  const [selectedYear, setSelectedYear] = useState(defaultYear);

  // Group by month for the selected year
  const monthlyData = useMemo(() => {
    const result = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      quantity: 0,
      cost: 0,
    }));
    
    data.forEach((inv) => {
      if (inv.date.startsWith(selectedYear)) {
        const m = parseInt(inv.date.substring(5, 7), 10);
        if (m >= 1 && m <= 12) {
          result[m - 1].quantity += inv.quantity;
          result[m - 1].cost += inv.quantity * inv.purchasePrice;
        }
      }
    });
    return result;
  }, [data, selectedYear]);

  if (data.length === 0) {
    return <div className="grid h-48 place-items-center text-slate-400 italic">Chưa có giao dịch</div>;
  }

  const maxQty = Math.max(...monthlyData.map((d) => d.quantity)) || 1;
  const maxCost = Math.max(...monthlyData.map((d) => d.cost)) || 1;

  const renderHalfYear = (start: number, end: number) => (
    <div className="relative h-40 w-full pt-4 mt-2">
      <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-slate-400 pb-6 pointer-events-none opacity-30">
        <div className="border-b border-slate-300 flex-1 relative" />
        <div className="border-b border-slate-300 flex-1 relative" />
        <div className="border-b border-slate-300 flex-1 relative" />
        <div className="flex-1 relative border-b border-slate-300" />
      </div>
      <div className="absolute inset-0 pb-6 flex items-end justify-around gap-1 overflow-visible">
        {monthlyData.slice(start, end).map((item) => {
          const qtyH = (item.quantity / maxQty) * 100;
          const costH = (item.cost / maxCost) * 100;
          return (
            <div key={item.month} className="group relative flex w-full flex-col items-center justify-end h-full">
              <div className="flex items-end justify-center w-full gap-1 h-full">
                {/* Quantity bar (Yellow) */}
                <div 
                  className="w-[12px] sm:w-[16px] rounded-t-sm bg-yellow-400 transition-all group-hover:bg-yellow-500 relative" 
                  style={{ height: `${Math.max(qtyH, item.quantity > 0 ? 2 : 0)}%` }} 
                />
                {/* Cost bar (Blue) */}
                <div 
                  className="w-[12px] sm:w-[16px] rounded-t-sm bg-blue-400 transition-all group-hover:bg-blue-500 relative" 
                  style={{ height: `${Math.max(costH, item.cost > 0 ? 2 : 0)}%` }} 
                />
              </div>
              <div className="absolute -bottom-6 w-full text-center text-xs text-slate-500 font-medium">T{item.month}</div>
              
              {/* Tooltip */}
              <div className="pointer-events-none absolute -top-12 z-20 hidden whitespace-nowrap rounded-md bg-slate-800 px-3 py-2 text-xs text-white shadow-xl group-hover:block left-1/2 -translate-x-1/2">
                <p className="font-bold border-b border-slate-600 pb-1 mb-1">Tháng {item.month}/{selectedYear}</p>
                <div className="flex items-center gap-2"><span className="w-2 h-2 bg-yellow-400 rounded-sm"/> Khối lượng: <span className="font-mono font-semibold">{item.quantity} chỉ</span></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-400 rounded-sm"/> Số tiền: <span className="font-mono font-semibold">{currency(item.cost)}</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-400"/> Số chỉ</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-400"/> Tiền vốn</div>
        </div>
        <select 
          className="rounded-md border-slate-200 text-sm py-1 pl-2 pr-6 bg-slate-50"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
          {!years.includes(currentYear) && <option value={currentYear}>{currentYear}</option>}
        </select>
      </div>
      
      {/* 6 months top */}
      {renderHalfYear(0, 6)}
      
      {/* 6 months bottom */}
      <div className="mt-4">
        {renderHalfYear(6, 12)}
      </div>
    </div>
  );
}

// ─── PnL calculation helper ─────────────────────────────────────────────────

function computePnl(inv: Investment) {
  if (isZeroPnlType(inv.type)) return 0;
  if (inv.type === "SAVING" && inv.interestRate && inv.term) {
    return (inv.purchasePrice * inv.quantity) * (inv.interestRate / 100) / 12 * Number(inv.term);
  }
  return (effectiveUnitPrice(inv) - inv.purchasePrice) * inv.quantity;
}

// ─── Mobile Card component ──────────────────────────────────────────────────

function InvestmentCard({
  inv,
  isSelected,
  showType,
  onToggleSelect,
  onEdit,
  onDelete,
}: {
  inv: Investment;
  isSelected: boolean;
  showType: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = assetMeta[inv.type];
  const hidePnl = isZeroPnlType(inv.type);
  const pnl = computePnl(inv);
  const pnlPercent = inv.purchasePrice > 0 ? (pnl / (inv.purchasePrice * inv.quantity)) * 100 : 0;
  const isSaving = inv.type === "SAVING";

  return (
    <div className={cn(
      "rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md",
      isSelected ? "border-emerald-300 bg-emerald-50/50 ring-1 ring-emerald-200" : "border-slate-200",
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <input
            aria-label={`Chọn ${inv.name}`}
            checked={isSelected}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            onChange={onToggleSelect}
            type="checkbox"
          />
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg" style={{ backgroundColor: meta.chart + '20', color: meta.chart }}>
            <Icon name={meta.icon} className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900">{inv.name}</p>
            {showType && <Badge className={cn("mt-1 text-[10px] px-1.5 py-0.5", meta.badge)}>{meta.label}</Badge>}
            <p className="mt-1 text-xs text-slate-500">
              <span className="font-medium">{memberMeta[inv.member].role}</span> · {dateLabel(inv.date)}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <IconButton label="Sửa" onClick={onEdit}>
            <Icon className="h-3.5 w-3.5" name="edit" />
          </IconButton>
          <IconButton label="Xóa" onClick={onDelete} tone="danger">
            <Icon className="h-3.5 w-3.5" name="trash" />
          </IconButton>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
        {isSaving ? (
          <>
            <div className="flex justify-between">
              <span className="text-slate-500">Số tiền gửi</span>
              <span className="font-semibold text-slate-900">{currency(inv.purchasePrice * inv.quantity)}</span>
            </div>
            {inv.interestRate ? (
              <div className="flex justify-between">
                <span className="text-slate-500">Lãi suất</span>
                <span className="font-medium text-slate-700">{inv.interestRate}%/năm{inv.term ? ` · ${inv.term} tháng` : ""}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-slate-500">Lãi dự kiến</span>
              <span className="font-bold text-emerald-600">+{currency(pnl)}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between">
              <span className="text-slate-500">SL × Giá mua</span>
              <span className="font-medium text-slate-700">{formatQuantity(inv.quantity)} × {currency(inv.purchasePrice)}</span>
            </div>
            {inv.currentPrice > 0 && !hidePnl && (
              <div className="flex justify-between">
                <span className="text-slate-500">Giá hiện tại</span>
                <span className="font-semibold text-slate-900">{currency(inv.currentPrice)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Tổng vốn</span>
              <span className="font-medium text-slate-700">{currency(inv.purchasePrice * inv.quantity)}</span>
            </div>
            {!hidePnl && (
              <div className="flex justify-between">
                <span className="text-slate-500">Lãi/Lỗ</span>
                <span className={cn("font-bold", pnl >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {pnl >= 0 ? "+" : ""}{currency(pnl)}
                  <span className="ml-1 text-xs font-semibold">({pnl >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)</span>
                </span>
              </div>
            )}
            {hidePnl && (
              <div className="flex justify-between">
                <span className="text-slate-500">Số tiền</span>
                <span className="font-semibold text-slate-900">{currency(inv.currentPrice > 0 ? inv.currentPrice * inv.quantity : inv.purchasePrice * inv.quantity)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {inv.note && (
        <p className="mt-2 truncate text-xs italic text-slate-400">{inv.note}</p>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function InvestmentDashboard() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<InvestmentForm>(createEmptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Investment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingGold, setIsFetchingGold] = useState(false);
  const [isFetchingCcq, setIsFetchingCcq] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [goldPriceStr, setGoldPriceStr] = useState<string>("");
  const [ccqPriceStr, setCcqPriceStr] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // ─── Data loading ─────────────────────────────────────────────────────────

  useEffect(() => {
    let isActive = true;

    async function loadInvestments() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/investments");
        if (!response.ok) throw new Error("Không thể tải danh sách tài sản.");
        const data = await response.json();
        if (isActive) setInvestments(data.investments);
      } catch (loadError) {
        if (isActive) {
          setInvestments([]);
          setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách tài sản.");
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadInvestments();
    return () => { isActive = false; };
  }, []);

  // ─── Derived data ─────────────────────────────────────────────────────────

  const totalAssets = useMemo(() => investments.reduce((sum, item) => {
    if (item.type === "DEBT") {
      return sum - (item.currentPrice * item.quantity);
    }
    if (item.type === "DEBT_INTEREST") {
      return sum;
    }
    if (item.type === "SAVING" && item.interestRate && item.term) {
      const pnl = (item.purchasePrice * item.quantity) * (item.interestRate / 100) / 12 * Number(item.term);
      return sum + (item.purchasePrice * item.quantity) + pnl;
    }
    return sum + (effectiveUnitPrice(item) * item.quantity);
  }, 0), [investments]);

  const totalCost = useMemo(() => investments.reduce((sum, item) => {
    if (item.type === "DEBT" || item.type === "LOAN" || item.type === "DEBT_INTEREST") {
      return sum;
    }
    return sum + (item.purchasePrice * item.quantity);
  }, 0), [investments]);
  
  const totalPnL = useMemo(() => investments.reduce((sum, item) => {
    if (isZeroPnlType(item.type)) {
      return sum;
    }
    if (item.type === "SAVING" && item.interestRate && item.term) {
      return sum + ((item.purchasePrice * item.quantity) * (item.interestRate / 100) / 12 * Number(item.term));
    }
    return sum + (effectiveUnitPrice(item) - item.purchasePrice) * item.quantity;
  }, 0), [investments]);

  const pnlPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  const assetsByType = useMemo(() => {
    return ASSET_TYPES.map((type) => {
      const amount = investments.filter((i) => i.type === type).reduce((sum, item) => {
        if (item.type === "DEBT_INTEREST") return sum;
        if (item.type === "SAVING" && item.interestRate && item.term) {
          const pnl = (item.purchasePrice * item.quantity) * (item.interestRate / 100) / 12 * Number(item.term);
          return sum + (item.purchasePrice * item.quantity) + pnl;
        }
        return sum + (effectiveUnitPrice(item) * item.quantity);
      }, 0);
      return { type, amount };
    }).filter((i) => i.amount > 0).sort((a, b) => b.amount - a.amount);
  }, [investments]);

  /** Count items per tab for the badge */
  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { overview: investments.length, gold: 0, stock: 0, saving: 0, fund: 0, crypto: 0, debt: 0, other: 0 };
    for (const inv of investments) {
      for (const [tab, types] of Object.entries(TAB_ASSET_MAP)) {
        if (types.includes(inv.type)) {
          counts[tab as TabKey]++;
        }
      }
    }
    return counts;
  }, [investments]);

  /** Investments filtered to the active tab + search query */
  const tabInvestments = useMemo(() => {
    if (activeTab === "overview") return [];
    const tabTypes = TAB_ASSET_MAP[activeTab];
    const normalizedQuery = query.trim().toLowerCase();
    return investments
      .filter((item) => tabTypes.includes(item.type))
      .filter((item) => {
        if (!normalizedQuery) return true;
        return (
          item.name.toLowerCase().includes(normalizedQuery) ||
          item.note.toLowerCase().includes(normalizedQuery) ||
          assetMeta[item.type].label.toLowerCase().includes(normalizedQuery)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeTab, investments, query]);

  const tabInvestmentIds = useMemo(() => tabInvestments.map((item) => item.id), [tabInvestments]);

  const allVisibleSelected =
    tabInvestmentIds.length > 0 && tabInvestmentIds.every((id) => selectedIds.includes(id));

  const someVisibleSelected =
    tabInvestmentIds.some((id) => selectedIds.includes(id)) && !allVisibleSelected;

  const selectedInvestments = useMemo(
    () => tabInvestments.filter((item) => selectedIds.includes(item.id)),
    [tabInvestments, selectedIds],
  );

  const selectedPresentValue = useMemo(
    () => selectedInvestments.reduce((sum, item) => sum + assetPresentValue(item), 0),
    [selectedInvestments],
  );

  const selectedCostValue = useMemo(
    () => selectedInvestments.reduce((sum, item) => sum + assetCostValue(item), 0),
    [selectedInvestments],
  );

  const selectedPnlValue = useMemo(
    () => selectedInvestments.reduce((sum, item) => sum + computePnl(item), 0),
    [selectedInvestments],
  );

  useEffect(() => {
    setSelectedIds((current) => {
      const next = current.filter((id) => tabInvestmentIds.includes(id));
      return next.length === current.length ? current : next;
    });
  }, [tabInvestmentIds]);

  // ─── Selection helpers ────────────────────────────────────────────────────

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !tabInvestmentIds.includes(id)));
      return;
    }
    setSelectedIds((current) => Array.from(new Set([...current, ...tabInvestmentIds])));
  }

  function toggleSelectInvestment(id: number) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id],
    );
  }

  // ─── Form actions ─────────────────────────────────────────────────────────

  function openCreateDialog() {
    setEditingId(null);
    const dt = defaultTypeForTab(activeTab);
    setForm(createEmptyForm(dt));
    setIsFormOpen(true);
  }

  function openEditDialog(investment: Investment) {
    setEditingId(investment.id);
    setForm({
      name: investment.name,
      type: investment.type,
      quantity: String(investment.quantity),
      purchasePrice: String(investment.purchasePrice),
      currentPrice: investment.currentPrice > 0 ? String(investment.currentPrice) : "",
      interestRate: investment.interestRate ? String(investment.interestRate) : "",
      term: investment.term || "",
      member: investment.member,
      note: investment.note,
      date: investment.date,
    });
    setIsFormOpen(true);
  }

  function closeFormDialog() {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(createEmptyForm(defaultTypeForTab(activeTab)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = parseStoredNumber(form.quantity);
    const purchasePrice = parseStoredNumber(form.purchasePrice);
    const currentPrice = form.currentPrice.trim() === "" ? 0 : parseStoredNumber(form.currentPrice);
    const goldQuantityInvalid = form.type === "GOLD" && !isAllowedUnitQuantity(quantity);

    if (
      !quantity ||
      quantity <= 0 ||
      goldQuantityInvalid ||
      purchasePrice < 0 ||
      Number.isNaN(currentPrice) ||
      currentPrice < 0 ||
      !form.name
    ) {
      return;
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      quantity,
      purchasePrice,
      currentPrice,
      interestRate: form.interestRate ? Number(form.interestRate) : null,
      term: form.term.trim() || null,
      member: form.member,
      note: form.note.trim(),
      date: form.date,
    };

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(editingId ? `/api/investments/${editingId}` : "/api/investments", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: editingId ? "PATCH" : "POST",
      });

      if (!response.ok) throw new Error(editingId ? "Không thể lưu thay đổi tài sản." : "Không thể thêm tài sản.");
      const data = await response.json();
      const investment = data.investment;

      setInvestments((current) => {
        if (editingId) return current.map((item) => (item.id === investment.id ? investment : item));
        return [investment, ...current];
      });

      closeFormDialog();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể lưu tài sản.");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/investments/${pendingDelete.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Không thể xóa tài sản.");
      setInvestments((current) => current.filter((item) => item.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Không thể xóa tài sản.");
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Market price fetch ───────────────────────────────────────────────────

  async function fetchGoldPrice() {
    setIsFetchingGold(true);
    setPriceError(null);

    try {
      const response = await fetch("/api/market/gold");
      const data = await readJsonResponse(response);
      const payload = data as {
        success?: boolean;
        error?: string;
        data?: { ring?: { buy: number; sell: number } };
      } | null;

      if (!response.ok || !payload?.success || !payload.data?.ring) {
        throw new Error(payload?.error || "Không thể tải giá vàng SJC.");
      }

      const ringBuyPerChi = payload.data.ring.buy / 10;
      const ringSellPerChi = payload.data.ring.sell / 10;
      setGoldPriceStr(`Vàng nhẫn SJC/chỉ - Mua: ${currency(ringBuyPerChi)} | Bán: ${currency(ringSellPerChi)}`);

      const goldAssets = investments.filter((item) => item.type === "GOLD");
      if (goldAssets.length > 0) {
        await Promise.all(
          goldAssets.map((asset) =>
            fetch(`/api/investments/${asset.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ currentPrice: ringBuyPerChi }),
            }),
          ),
        );

        setInvestments((current) =>
          current.map((item) => (item.type === "GOLD" ? { ...item, currentPrice: ringBuyPerChi } : item)),
        );
      }
    } catch (err) {
      setPriceError(err instanceof Error ? err.message : "Không thể tải giá vàng SJC.");
    } finally {
      setIsFetchingGold(false);
    }
  }

  function quoteLabel(quote: { price: number; asOf?: string | null; kind: string } | null, fallback: string) {
    if (!quote) return fallback;
    const datePart = quote.asOf ? ` (${dateLabel(quote.asOf)})` : "";
    const kindPart = quote.kind === "nav" ? "NAV" : "Khớp";
    return `${kindPart}: ${currency(quote.price)}${datePart}`;
  }

  async function fetchCcqPrices() {
    setIsFetchingCcq(true);
    setPriceError(null);

    try {
      const response = await fetch("/api/market/ccq");
      const data = (await readJsonResponse(response)) as {
        success?: boolean;
        error?: string;
        data?: {
          dcds?: { price: number; asOf?: string | null; kind: string };
          etfVn30?: { price: number; asOf?: string | null; kind: string };
        };
      } | null;
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Không thể tải giá chứng chỉ quỹ.");
      }

      const dcdsQuote = data.data?.dcds ?? null;
      const etfQuote = data.data?.etfVn30 ?? null;
      const parts = [
        dcdsQuote ? `DCDS ${quoteLabel(dcdsQuote, "")}` : null,
        etfQuote ? `E1VFVN30 ${quoteLabel(etfQuote, "")}` : null,
      ].filter(Boolean);
      setCcqPriceStr(parts.join("  ·  "));

      const dcdsPrice = typeof dcdsQuote?.price === "number" ? dcdsQuote.price : null;
      const etfPrice = typeof etfQuote?.price === "number" ? etfQuote.price : null;

      const targets = investments.filter((item) => isFundType(item.type));
      if (targets.length > 0) {
        await Promise.all(
          targets.map(async (asset) => {
            const currentPrice = asset.type === "FUND_DCDS" ? dcdsPrice : etfPrice;
            if (currentPrice == null) return null;
            await fetch(`/api/investments/${asset.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ currentPrice }),
            });
          }),
        );

        setInvestments((current) =>
          current.map((item) => {
            if (item.type === "FUND_DCDS" && dcdsPrice != null) return { ...item, currentPrice: dcdsPrice };
            if (item.type === "FUND_ETF_VN30" && etfPrice != null) return { ...item, currentPrice: etfPrice };
            return item;
          }),
        );
      }
    } catch (err) {
      setPriceError(err instanceof Error ? err.message : "Không thể tải giá chứng chỉ quỹ.");
    } finally {
      setIsFetchingCcq(false);
    }
  }

  // ─── Tab-specific table renderers ─────────────────────────────────────────

  function renderGoldTable() {
    return (
      <table className="w-full min-w-[700px] border-collapse text-left text-xs">
        <thead className="bg-slate-50 uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-10 px-3 py-3">{selectAllCheckbox()}</th>
            <th className="px-3 py-3 font-semibold">Tên</th>
            <th className="px-3 py-3 font-semibold">Ngày mua</th>
            <th className="px-3 py-3 text-right font-semibold">Số chỉ</th>
            <th className="px-3 py-3 text-right font-semibold">Giá mua/chỉ</th>
            <th className="px-3 py-3 text-right font-semibold">Giá HT/chỉ</th>
            <th className="px-3 py-3 text-right font-semibold">Tổng vốn</th>
            <th className="px-3 py-3 text-right font-semibold">Lãi/Lỗ</th>
            <th className="px-3 py-3 text-right font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tableBody(tabInvestments, (inv) => {
            const pnl = computePnl(inv);
            const pnlPct = inv.purchasePrice > 0 ? (pnl / (inv.purchasePrice * inv.quantity)) * 100 : 0;
            return (
              <>
                <td className="px-3 py-3 text-right font-medium">{formatQuantity(inv.quantity)}</td>
                <td className="px-3 py-3 text-right text-slate-500">{currency(inv.purchasePrice)}</td>
                <td className="px-3 py-3 text-right font-bold text-slate-900">{inv.currentPrice > 0 ? currency(inv.currentPrice) : "—"}</td>
                <td className="px-3 py-3 text-right text-slate-500">{currency(inv.purchasePrice * inv.quantity)}</td>
                <td className="px-3 py-3 text-right">{pnlCell(pnl, pnlPct)}</td>
              </>
            );
          })}
        </tbody>
      </table>
    );
  }

  function renderStockTable() {
    return (
      <table className="w-full min-w-[700px] border-collapse text-left text-xs">
        <thead className="bg-slate-50 uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-10 px-3 py-3">{selectAllCheckbox()}</th>
            <th className="px-3 py-3 font-semibold">Mã CK</th>
            <th className="px-3 py-3 font-semibold">Ngày mua</th>
            <th className="px-3 py-3 text-right font-semibold">Số CP</th>
            <th className="px-3 py-3 text-right font-semibold">Giá mua</th>
            <th className="px-3 py-3 text-right font-semibold">Giá HT</th>
            <th className="px-3 py-3 text-right font-semibold">Tổng vốn</th>
            <th className="px-3 py-3 text-right font-semibold">Lãi/Lỗ</th>
            <th className="px-3 py-3 text-right font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tableBody(tabInvestments, (inv) => {
            const pnl = computePnl(inv);
            const pnlPct = inv.purchasePrice > 0 ? (pnl / (inv.purchasePrice * inv.quantity)) * 100 : 0;
            return (
              <>
                <td className="px-3 py-3 text-right font-medium">{formatQuantity(inv.quantity)}</td>
                <td className="px-3 py-3 text-right text-slate-500">{currency(inv.purchasePrice)}</td>
                <td className="px-3 py-3 text-right font-bold text-slate-900">{inv.currentPrice > 0 ? currency(inv.currentPrice) : "—"}</td>
                <td className="px-3 py-3 text-right text-slate-500">{currency(inv.purchasePrice * inv.quantity)}</td>
                <td className="px-3 py-3 text-right">{pnlCell(pnl, pnlPct)}</td>
              </>
            );
          })}
        </tbody>
      </table>
    );
  }

  function renderCryptoTable() {
    return (
      <table className="w-full min-w-[700px] border-collapse text-left text-xs">
        <thead className="bg-slate-50 uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-10 px-3 py-3">{selectAllCheckbox()}</th>
            <th className="px-3 py-3 font-semibold">Mã Coin</th>
            <th className="px-3 py-3 font-semibold">Ngày mua</th>
            <th className="px-3 py-3 text-right font-semibold">Số lượng</th>
            <th className="px-3 py-3 text-right font-semibold">Giá mua</th>
            <th className="px-3 py-3 text-right font-semibold">Giá HT</th>
            <th className="px-3 py-3 text-right font-semibold">Tổng vốn</th>
            <th className="px-3 py-3 text-right font-semibold">Lãi/Lỗ</th>
            <th className="px-3 py-3 text-right font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tableBody(tabInvestments, (inv) => {
            const pnl = computePnl(inv);
            const pnlPct = inv.purchasePrice > 0 ? (pnl / (inv.purchasePrice * inv.quantity)) * 100 : 0;
            return (
              <>
                <td className="px-3 py-3 font-medium text-slate-900">{inv.name}</td>
                <td className="px-3 py-3 text-slate-500">{dateLabel(inv.date)}</td>
                <td className="px-3 py-3 text-right font-medium">{formatQuantity(inv.quantity)}</td>
                <td className="px-3 py-3 text-right text-slate-500">{currency(inv.purchasePrice)}</td>
                <td className="px-3 py-3 text-right font-bold text-slate-900">{inv.currentPrice > 0 ? currency(inv.currentPrice) : "—"}</td>
                <td className="px-3 py-3 text-right text-slate-500">{currency(inv.purchasePrice * inv.quantity)}</td>
                <td className="px-3 py-3 text-right">{pnlCell(pnl, pnlPct)}</td>
              </>
            );
          })}
        </tbody>
      </table>
    );
  }

  function renderSavingTable() {
    return (
      <table className="w-full min-w-[750px] border-collapse text-left text-xs">
        <thead className="bg-slate-50 uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-10 px-3 py-3">{selectAllCheckbox()}</th>
            <th className="px-3 py-3 font-semibold">Ngân hàng / Tên</th>
            <th className="px-3 py-3 font-semibold">Ngày gửi</th>
            <th className="px-3 py-3 text-right font-semibold">Số tiền gửi</th>
            <th className="px-3 py-3 text-right font-semibold">Lãi suất</th>
            <th className="px-3 py-3 text-right font-semibold">Kỳ hạn</th>
            <th className="px-3 py-3 text-right font-semibold">Lãi dự kiến</th>
            <th className="px-3 py-3 text-right font-semibold">Tổng đáo hạn</th>
            <th className="px-3 py-3 text-right font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tableBody(tabInvestments, (inv) => {
            const depositAmount = inv.purchasePrice * inv.quantity;
            const pnl = computePnl(inv);
            return (
              <>
                <td className="px-3 py-3 text-right font-semibold text-slate-900">{currency(depositAmount)}</td>
                <td className="px-3 py-3 text-right text-slate-700">{inv.interestRate ? `${inv.interestRate}%/năm` : "—"}</td>
                <td className="px-3 py-3 text-right text-slate-700">{inv.term ? `${inv.term} tháng` : "—"}</td>
                <td className="px-3 py-3 text-right font-bold text-emerald-600">+{currency(pnl)}</td>
                <td className="px-3 py-3 text-right font-bold text-slate-900">{currency(depositAmount + pnl)}</td>
              </>
            );
          })}
        </tbody>
      </table>
    );
  }

  function renderFundTable() {
    return (
      <table className="w-full min-w-[800px] border-collapse text-left text-xs">
        <thead className="bg-slate-50 uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-10 px-3 py-3">{selectAllCheckbox()}</th>
            <th className="px-3 py-3 font-semibold">Tên CCQ</th>
            <th className="px-3 py-3 font-semibold">Loại quỹ</th>
            <th className="px-3 py-3 font-semibold">Ngày mua</th>
            <th className="px-3 py-3 text-right font-semibold">Số CCQ</th>
            <th className="px-3 py-3 text-right font-semibold">NAV mua</th>
            <th className="px-3 py-3 text-right font-semibold">NAV HT</th>
            <th className="px-3 py-3 text-right font-semibold">Tổng vốn</th>
            <th className="px-3 py-3 text-right font-semibold">Lãi/Lỗ</th>
            <th className="px-3 py-3 text-right font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tableBody(tabInvestments, (inv) => {
            const meta = assetMeta[inv.type];
            const pnl = computePnl(inv);
            const pnlPct = inv.purchasePrice > 0 ? (pnl / (inv.purchasePrice * inv.quantity)) * 100 : 0;
            return (
              <>
                <td className="px-3 py-3"><Badge className={cn("text-[10px] px-1.5 py-0.5", meta.badge)}>{meta.label}</Badge></td>
                <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-700">{dateLabel(inv.date)}</td>
                <td className="px-3 py-3 text-right font-medium">{formatQuantity(inv.quantity)}</td>
                <td className="px-3 py-3 text-right text-slate-500">{currency(inv.purchasePrice)}</td>
                <td className="px-3 py-3 text-right font-bold text-slate-900">{inv.currentPrice > 0 ? currency(inv.currentPrice) : "—"}</td>
                <td className="px-3 py-3 text-right text-slate-500">{currency(inv.purchasePrice * inv.quantity)}</td>
                <td className="px-3 py-3 text-right">{pnlCell(pnl, pnlPct)}</td>
              </>
            );
          }, /* skipDateColumn */ true)}
        </tbody>
      </table>
    );
  }

  function renderDebtTable() {
    return (
      <table className="w-full min-w-[600px] border-collapse text-left text-xs">
        <thead className="bg-slate-50 uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-10 px-3 py-3">{selectAllCheckbox()}</th>
            <th className="px-3 py-3 font-semibold">Tên khoản</th>
            <th className="px-3 py-3 font-semibold">Loại</th>
            <th className="px-3 py-3 font-semibold">Ngày</th>
            <th className="px-3 py-3 text-right font-semibold">Số tiền</th>
            <th className="px-3 py-3 font-semibold">Người QL</th>
            <th className="px-3 py-3 font-semibold">Ghi chú</th>
            <th className="px-3 py-3 text-right font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tableBody(tabInvestments, (inv) => {
            const meta = assetMeta[inv.type];
            const amount = inv.currentPrice > 0 ? inv.currentPrice * inv.quantity : inv.purchasePrice * inv.quantity;
            return (
              <>
                <td className="px-3 py-3"><Badge className={cn("text-[10px] px-1.5 py-0.5", meta.badge)}>{meta.label}</Badge></td>
                <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-700">{dateLabel(inv.date)}</td>
                <td className="px-3 py-3 text-right font-semibold text-slate-900">{currency(amount)}</td>
                <td className="px-3 py-3 text-slate-600">{memberMeta[inv.member].role}</td>
                <td className="px-3 py-3 max-w-[160px] truncate text-slate-500">{inv.note || "—"}</td>
              </>
            );
          }, /* skipDateColumn */ true)}
        </tbody>
      </table>
    );
  }

  function renderOtherTable() {
    return (
      <table className="w-full min-w-[800px] border-collapse text-left text-xs">
        <thead className="bg-slate-50 uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-10 px-3 py-3">{selectAllCheckbox()}</th>
            <th className="px-3 py-3 font-semibold">Tên</th>
            <th className="px-3 py-3 font-semibold">Loại</th>
            <th className="px-3 py-3 font-semibold">Ngày mua</th>
            <th className="px-3 py-3 text-right font-semibold">SL</th>
            <th className="px-3 py-3 text-right font-semibold">Giá mua</th>
            <th className="px-3 py-3 text-right font-semibold">Giá HT</th>
            <th className="px-3 py-3 text-right font-semibold">Tổng vốn</th>
            <th className="px-3 py-3 text-right font-semibold">Lãi/Lỗ</th>
            <th className="px-3 py-3 text-right font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tableBody(tabInvestments, (inv) => {
            const meta = assetMeta[inv.type];
            const pnl = computePnl(inv);
            const pnlPct = inv.purchasePrice > 0 ? (pnl / (inv.purchasePrice * inv.quantity)) * 100 : 0;
            return (
              <>
                <td className="px-3 py-3"><Badge className={cn("text-[10px] px-1.5 py-0.5", meta.badge)}>{meta.label}</Badge></td>
                <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-700">{dateLabel(inv.date)}</td>
                <td className="px-3 py-3 text-right font-medium">{formatQuantity(inv.quantity)}</td>
                <td className="px-3 py-3 text-right text-slate-500">{currency(inv.purchasePrice)}</td>
                <td className="px-3 py-3 text-right font-bold text-slate-900">{inv.currentPrice > 0 ? currency(inv.currentPrice) : "—"}</td>
                <td className="px-3 py-3 text-right text-slate-500">{currency(inv.purchasePrice * inv.quantity)}</td>
                <td className="px-3 py-3 text-right">{pnlCell(pnl, pnlPct)}</td>
              </>
            );
          }, /* skipDateColumn */ true)}
        </tbody>
      </table>
    );
  }

  // ─── Shared table helpers ─────────────────────────────────────────────────

  function selectAllCheckbox() {
    return (
      <input
        aria-label="Chọn tất cả"
        checked={allVisibleSelected}
        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        disabled={isLoading || tabInvestmentIds.length === 0}
        onChange={toggleSelectAllVisible}
        ref={(input) => {
          if (input) input.indeterminate = someVisibleSelected;
        }}
        type="checkbox"
      />
    );
  }

  function pnlCell(pnl: number, pnlPct: number) {
    return (
      <>
        <div className={cn("font-bold", pnl >= 0 ? "text-emerald-600" : "text-rose-600")}>
          {pnl >= 0 ? "+" : ""}{currency(pnl)}
        </div>
        <div className={cn("text-[10px] font-semibold", pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
          {pnl >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
        </div>
      </>
    );
  }

  function tableBody(items: Investment[], renderExtraCells: (inv: Investment) => ReactNode, skipDateColumn = false) {
    if (isLoading) {
      return <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={12}>Đang tải...</td></tr>;
    }
    if (error) {
      return <tr><td className="px-3 py-8 text-center text-rose-600" colSpan={12}>{error}</td></tr>;
    }
    if (items.length === 0) {
      return <tr><td className="px-3 py-8 text-center text-slate-400 italic" colSpan={12}>Chưa có dữ liệu</td></tr>;
    }
    return items.map((inv) => {
      const meta = assetMeta[inv.type];
      const isSelected = selectedIds.includes(inv.id);
      return (
        <tr className={cn("bg-white transition hover:bg-purple-50/40", isSelected && "bg-emerald-50/70")} key={inv.id}>
          <td className="px-3 py-3">
            <input
              aria-label={`Chọn ${inv.name}`}
              checked={isSelected}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              onChange={() => toggleSelectInvestment(inv.id)}
              type="checkbox"
            />
          </td>
          <td className="px-3 py-3">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-lg" style={{ backgroundColor: meta.chart + '20', color: meta.chart }}>
                <Icon name={meta.icon} className="h-3.5 w-3.5" />
              </div>
              <p className="font-bold text-slate-900">{inv.name}</p>
            </div>
          </td>
          {!skipDateColumn && <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-700">{dateLabel(inv.date)}</td>}
          {renderExtraCells(inv)}
          <td className="px-3 py-3">
            <div className="flex justify-end gap-1">
              <IconButton label="Sửa" onClick={() => openEditDialog(inv)}>
                <Icon className="h-3.5 w-3.5" name="edit" />
              </IconButton>
              <IconButton label="Xóa" onClick={() => setPendingDelete(inv)} tone="danger">
                <Icon className="h-3.5 w-3.5" name="trash" />
              </IconButton>
            </div>
          </td>
        </tr>
      );
    });
  }

  // ─── Tab-specific forms ───────────────────────────────────────────────────

  function renderForm() {
    const tab = activeTab === "overview" ? "gold" : activeTab;
    switch (tab) {
      case "gold": return renderGoldForm();
      case "stock": return renderStockForm();
      case "saving": return renderSavingForm();
      case "fund": return renderFundForm();
      case "debt": return renderDebtForm();
      case "other": return renderOtherForm();
    }
  }

  function renderGoldForm() {
    return (
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <Field id="name" label="Tên tài sản (VD: Vàng nhẫn SJC 24k)">
          <input className={inputClass()} id="name" onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required type="text" value={form.name} />
        </Field>

        <Field id="quantity" label="Số chỉ">
          <div className="grid gap-2">
            <QuantityCombobox
              id="quantity"
              onChange={(quantity) => setForm((c) => ({ ...c, quantity }))}
              placeholder="Chọn 0.5–5 hoặc nhập tay"
              value={form.quantity}
            />
            {form.quantity.trim() && !isAllowedUnitQuantity(parseStoredNumber(form.quantity)) ? (
              <p className="text-xs font-medium text-rose-600">Số lượng không hợp lệ. Dùng 0.5 hoặc 1, 2, 3…</p>
            ) : null}
          </div>
        </Field>

        {priceFields("Giá mua/chỉ", "Giá HT/chỉ (không bắt buộc)")}
        {memberDateFields()}
        {noteField()}
        {formButtons()}
      </form>
    );
  }

  function renderStockForm() {
    return (
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <Field id="name" label="Mã cổ phiếu (VD: FPT, VNM, VIC)">
          <input className={inputClass()} id="name" onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required type="text" value={form.name} />
        </Field>

        <Field id="quantity" label="Số lượng cổ phiếu">
          <input className={inputClass()} id="quantity" inputMode="decimal" onChange={(e) => setForm((c) => ({ ...c, quantity: canonicalizeQuantityInput(e.target.value) }))} required value={form.quantity} />
        </Field>

        {priceFields("Giá mua", "Giá hiện tại (không bắt buộc)")}
        {memberDateFields()}
        {noteField()}
        {formButtons()}
      </form>
    );
  }

  function renderSavingForm() {
    return (
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <Field id="name" label="Ngân hàng / Tên sổ (VD: STK Vietcombank)">
          <input className={inputClass()} id="name" onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required type="text" value={form.name} />
        </Field>

        <Field id="purchasePrice" label="Số tiền gửi">
          <input
            className={inputClass()}
            id="purchasePrice"
            inputMode="decimal"
            onChange={(e) => setForm((c) => ({ ...c, purchasePrice: canonicalizeNumberInput(e.target.value) }))}
            required
            value={formatNumberInput(form.purchasePrice)}
          />
          {form.purchasePrice && <p className="text-xs italic text-rose-600">{readMoney(form.purchasePrice)}</p>}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2 rounded-md bg-emerald-50 p-4 border border-emerald-100">
          <Field id="interestRate" label="Lãi suất (%/năm)">
            <input className={inputClass()} id="interestRate" min="0" step="any" onChange={(e) => setForm((c) => ({ ...c, interestRate: e.target.value }))} placeholder="VD: 5.5" type="number" value={form.interestRate} />
          </Field>
          <Field id="term" label="Kỳ hạn (Tháng)">
            <input className={inputClass()} id="term" min="1" step="1" onChange={(e) => setForm((c) => ({ ...c, term: e.target.value }))} placeholder="VD: 6" type="number" value={form.term} />
          </Field>
        </div>

        {memberDateFields()}
        {noteField()}
        {formButtons()}
      </form>
    );
  }

  function renderFundForm() {
    return (
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="type" label="Loại quỹ">
            <select
              className={inputClass()}
              id="type"
              onChange={(e) => {
                const nextType = e.target.value as AssetType;
                setForm((c) => ({
                  ...c,
                  type: nextType,
                  name: FUND_DEFAULT_NAMES[nextType] ?? c.name,
                }));
              }}
              value={form.type}
            >
              <option value="FUND_DCDS">{assetMeta.FUND_DCDS.label}</option>
              <option value="FUND_ETF_VN30">{assetMeta.FUND_ETF_VN30.label}</option>
            </select>
          </Field>
          <Field id="name" label="Tên CCQ">
            <input className={inputClass()} id="name" onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required type="text" value={form.name} />
          </Field>
        </div>

        <Field id="quantity" label="Số CCQ">
          <div className="grid gap-2">
            <QuantityCombobox
              id="quantity"
              onChange={(quantity) => setForm((c) => ({ ...c, quantity }))}
              placeholder="Chọn 0.5–5 hoặc nhập tay (vd: 10.56)"
              value={form.quantity}
            />
          </div>
        </Field>

        {priceFields("Giá NAV mua / CCQ", "Giá NAV hiện tại / CCQ (không bắt buộc)")}
        {memberDateFields()}
        {noteField()}
        {formButtons()}
      </form>
    );
  }

  function renderDebtForm() {
    return (
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <Field id="type" label="Loại">
          <select
            className={inputClass()}
            id="type"
            onChange={(e) => setForm((c) => ({ ...c, type: e.target.value as AssetType }))}
            value={form.type}
          >
            <option value="DEBT">{assetMeta.DEBT.label}</option>
            <option value="DEBT_INTEREST">{assetMeta.DEBT_INTEREST.label}</option>
            <option value="LOAN">{assetMeta.LOAN.label}</option>
          </select>
        </Field>

        <Field id="name" label="Tên khoản (VD: Vay mua nhà, Cho bạn A vay)">
          <input className={inputClass()} id="name" onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required type="text" value={form.name} />
        </Field>

        <Field id="purchasePrice" label="Số tiền">
          <input
            className={inputClass()}
            id="purchasePrice"
            inputMode="decimal"
            onChange={(e) => setForm((c) => ({ ...c, purchasePrice: canonicalizeNumberInput(e.target.value) }))}
            required
            value={formatNumberInput(form.purchasePrice)}
          />
          {form.purchasePrice && <p className="text-xs italic text-rose-600">{readMoney(form.purchasePrice)}</p>}
        </Field>

        {memberDateFields()}
        {noteField()}
        {formButtons()}
      </form>
    );
  }

  function renderOtherForm() {
    return (
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="type" label="Loại hình">
            <select
              className={inputClass()}
              id="type"
              onChange={(e) => setForm((c) => ({ ...c, type: e.target.value as AssetType }))}
              value={form.type}
            >
              <option value="REAL_ESTATE">{assetMeta.REAL_ESTATE.label}</option>
              <option value="CRYPTO">{assetMeta.CRYPTO.label}</option>
              <option value="OTHER">{assetMeta.OTHER.label}</option>
            </select>
          </Field>
          <Field id="name" label="Tên tài sản">
            <input className={inputClass()} id="name" onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required type="text" value={form.name} />
          </Field>
        </div>

        <Field id="quantity" label="Số lượng">
          <input className={inputClass()} id="quantity" inputMode="decimal" onChange={(e) => setForm((c) => ({ ...c, quantity: canonicalizeQuantityInput(e.target.value) }))} required value={form.quantity} />
        </Field>

        {priceFields("Giá mua (trên 1 đơn vị)", "Giá hiện tại (không bắt buộc)")}
        {memberDateFields()}
        {noteField()}
        {formButtons()}
      </form>
    );
  }

  // ─── Shared form field helpers ────────────────────────────────────────────

  function priceFields(buyLabel: string, currentLabel: string) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="purchasePrice" label={buyLabel}>
          <input
            className={inputClass()}
            id="purchasePrice"
            inputMode="decimal"
            onChange={(e) => setForm((c) => ({ ...c, purchasePrice: canonicalizeNumberInput(e.target.value) }))}
            required
            value={formatNumberInput(form.purchasePrice)}
          />
          {form.purchasePrice && <p className="text-xs italic text-rose-600">{readMoney(form.purchasePrice)}</p>}
        </Field>
        <Field id="currentPrice" label={currentLabel}>
          <input
            className={inputClass()}
            id="currentPrice"
            inputMode="decimal"
            onChange={(e) => setForm((c) => ({ ...c, currentPrice: canonicalizeNumberInput(e.target.value) }))}
            value={formatNumberInput(form.currentPrice)}
          />
          {form.currentPrice && <p className="text-xs italic text-rose-600">{readMoney(form.currentPrice)}</p>}
        </Field>
      </div>
    );
  }

  function memberDateFields() {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="member" label="Người quản lý">
          <select className={inputClass()} id="member" onChange={(e) => setForm((c) => ({ ...c, member: e.target.value as FamilyMember }))} value={form.member}>
            {familyMembers.map((member) => (
              <option key={member} value={member}>
                {memberMeta[member].role}
              </option>
            ))}
          </select>
        </Field>
        <Field id="date" label="Ngày mua/bắt đầu">
          <input className={inputClass()} id="date" onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))} required type="date" value={form.date} />
        </Field>
      </div>
    );
  }

  function noteField() {
    return (
      <Field id="note" label="Ghi chú">
        <input className={inputClass()} id="note" onChange={(e) => setForm((c) => ({ ...c, note: e.target.value }))} type="text" value={form.note} />
      </Field>
    );
  }

  function formButtons() {
    return (
      <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button className="w-full sm:w-fit" disabled={isSaving} onClick={closeFormDialog} variant="secondary">Hủy</Button>
        <Button className="w-full sm:w-fit" disabled={isSaving} type="submit">
          {isSaving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Thêm tài sản"}
        </Button>
      </div>
    );
  }

  // ─── Form dialog title/description per tab ────────────────────────────────

  function formTitle() {
    if (editingId) return "Sửa tài sản";
    const tab = activeTab === "overview" ? "gold" : activeTab;
    const meta = tabMeta[tab];
    return `Thêm ${meta.label}`;
  }

  function formDescription() {
    const tab = activeTab === "overview" ? "gold" : activeTab;
    switch (tab) {
      case "gold": return "Nhập thông tin vàng, số chỉ và giá mua.";
      case "stock": return "Nhập mã cổ phiếu, số lượng và giá mua.";
      case "saving": return "Nhập thông tin sổ tiết kiệm, lãi suất và kỳ hạn.";
      case "fund": return "Nhập thông tin chứng chỉ quỹ, NAV mua và số CCQ.";
      case "debt": return "Nhập thông tin khoản nợ hoặc cho vay.";
      case "other": return "Nhập thông tin tài sản.";
    }
  }

  // ─── Render tab content ───────────────────────────────────────────────────

  function renderTabContent() {
    if (activeTab === "overview") return renderOverview();
    return renderCategoryTab();
  }

  /** Monthly cumulative portfolio value for the bar chart */
  const monthlyPortfolioData = useMemo(() => {
    if (investments.length === 0) return [];

    // Build a map of month → cumulative present value at that point
    // We sort all investments by date, then compute running totals by month
    const sorted = [...investments].sort((a, b) => a.date.localeCompare(b.date));
    const monthMap = new Map<string, number>();

    for (const inv of sorted) {
      const month = inv.date.slice(0, 7); // "YYYY-MM"
      const value = assetPresentValue(inv);
      monthMap.set(month, (monthMap.get(month) || 0) + value);
    }

    // Convert to cumulative
    const entries = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    let cumulative = 0;
    return entries.map(([month, value]) => {
      cumulative += value;
      const [year, m] = month.split("-");
      const label = `T${parseInt(m)}/${year.slice(2)}`;
      return { month, label, value: cumulative };
    });
  }, [investments]);

  function renderOverview() {
    return (
      <>
        {/* KPI Cards */}
        <section className="grid gap-4 md:grid-cols-2">
          <Card className="p-5 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Tổng tài sản hiện tại</p>
                <p className="mt-3 text-3xl font-bold text-slate-950">{currency(totalAssets)}</p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-purple-50 text-purple-600">
                <Icon name="barChart" className="w-6 h-6" />
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500">Tổng vốn đầu tư: {currency(totalCost)}</p>
          </Card>

          <Card className={cn("p-5 border-l-4", totalPnL >= 0 ? "border-l-emerald-500" : "border-l-rose-500")}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Lãi / Lỗ (PnL)</p>
                <p className={cn("mt-3 text-3xl font-bold", totalPnL >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {totalPnL >= 0 ? "+" : ""}{currency(totalPnL)}
                </p>
              </div>
              <div className={cn("grid h-12 w-12 place-items-center rounded-xl", totalPnL >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                <Icon name="trendingUp" className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
               <Badge className={totalPnL >= 0 ? "bg-emerald-100 text-emerald-800 ring-emerald-200" : "bg-rose-100 text-rose-800 ring-rose-200"}>
                 {totalPnL >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
               </Badge>
               <span className="text-sm text-slate-500">so với giá vốn</span>
            </div>
          </Card>
        </section>

        {/* Quick stats */}
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">Thống kê nhanh:</span>
            {TAB_KEYS.filter((k) => k !== "overview").map((tabKey) => {
              const count = tabCounts[tabKey];
              if (count === 0) return null;
              const meta = tabMeta[tabKey];
              return (
                <button
                  key={tabKey}
                  type="button"
                  className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition cursor-pointer", meta.badge)}
                  onClick={() => setActiveTab(tabKey)}
                >
                  <Icon name={meta.icon} className={cn("h-3 w-3", meta.iconColor)} />
                  {meta.label}: {count}
                </button>
              );
            })}
            {investments.length === 0 && (
              <span className="text-slate-400 italic">Chưa có dữ liệu</span>
            )}
          </div>
        </Card>

        {/* Bar chart (60%) + Donut chart (40%) */}
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          {/* Monthly bar chart */}
          <Card className="p-5">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-950">Tổng tài sản theo tháng</h2>
              <p className="mt-1 text-sm text-slate-500">Tổng giá trị tài sản tích lũy theo tháng mua/gửi.</p>
            </div>
            <MonthlyBarChart data={monthlyPortfolioData} />
          </Card>

          {/* Donut chart */}
          <Card className="p-5">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-950">Phân bổ tài sản</h2>
              <p className="mt-1 text-sm text-slate-500">Tỷ trọng theo loại hình đầu tư.</p>
            </div>
            <InvestmentDonut data={assetsByType} total={totalAssets} />
          </Card>
        </div>
      </>
    );
  }

  function renderCategoryTab() {
    const meta = tabMeta[activeTab];
    const showType = (TAB_ASSET_MAP[activeTab as Exclude<TabKey, "overview">] || []).length > 1;

    const categoryAssets = investments.filter((inv) =>
      TAB_ASSET_MAP[activeTab as Exclude<TabKey, "overview">]?.includes(inv.type)
    );
    const categoryTotalAssets = categoryAssets.reduce((sum, inv) => sum + assetPresentValue(inv), 0);
    const categoryAssetsByType = Object.entries(
      categoryAssets.reduce((acc, inv) => {
        acc[inv.type] = (acc[inv.type] || 0) + Math.abs(assetPresentValue(inv));
        return acc;
      }, {} as Record<string, number>)
    ).map(([type, amount]) => ({ type: type as AssetType, amount })).sort((a, b) => b.amount - a.amount);

    return (
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr] items-start">
        <Card className="overflow-hidden">
        {/* Sub-header */}
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-slate-950">{meta.label}</h2>
            <div className="flex flex-wrap gap-2">
              {/* Gold price button */}
              {activeTab === "gold" && (
                <Button variant="outline" onClick={fetchGoldPrice} disabled={isFetchingGold}>
                  <Icon name="sparkles" className="w-4 h-4 text-yellow-500" />
                  {isFetchingGold ? "Đang lấy giá..." : "Cập nhật Giá Vàng SJC"}
                </Button>
              )}
              {/* CCQ price button */}
              {activeTab === "fund" && (
                <Button variant="outline" onClick={fetchCcqPrices} disabled={isFetchingCcq}>
                  <Icon name="briefcase" className="w-4 h-4 text-indigo-500" />
                  {isFetchingCcq ? "Đang lấy giá..." : "Cập nhật giá CCQ"}
                </Button>
              )}
              <Button className="w-full sm:w-fit" disabled={isSaving} onClick={openCreateDialog}>
                <Icon className="h-4 w-4" name="plus" />
                Thêm {meta.label}
              </Button>
            </div>
          </div>

          {/* Market price info */}
          {activeTab === "gold" && goldPriceStr && <p className="text-xs font-bold text-yellow-600">{goldPriceStr}</p>}
          {activeTab === "fund" && ccqPriceStr && <p className="text-xs font-bold text-indigo-600">{ccqPriceStr}</p>}
          {priceError && <p className="text-xs font-semibold text-rose-600">{priceError}</p>}

          {/* Search */}
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon className="h-4 w-4" name="search" />
            </span>
            <input className={cn(inputClass(), "w-full pl-9")} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm tên tài sản..." type="search" value={query} />
          </div>
        </div>

        {/* Selection bar */}
        {selectedInvestments.length > 0 ? (
          <div className="flex flex-col gap-1 border-b border-emerald-200 bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-emerald-950">
              Đã chọn <span className="font-bold">{selectedInvestments.length}</span> tài sản
            </p>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
              <p className="text-slate-600">
                Vốn: <span className="font-semibold text-slate-800">{currency(selectedCostValue)}</span>
              </p>
              <p className="font-bold text-emerald-900">
                Tổng hiện tại: {currency(selectedPresentValue)}
              </p>
              <p className={cn("font-bold", selectedPnlValue >= 0 ? "text-emerald-600" : "text-rose-600")}>
                Lãi/lỗ: {selectedPnlValue >= 0 ? "+" : ""}{currency(selectedPnlValue)}
              </p>
            </div>
          </div>
        ) : null}

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          {activeTab === "gold" && renderGoldTable()}
          {activeTab === "stock" && renderStockTable()}
          {activeTab === "saving" && renderSavingTable()}
          {activeTab === "fund" && renderFundTable()}
          {activeTab === "crypto" && renderCryptoTable()}
          {activeTab === "debt" && renderDebtTable()}
          {activeTab === "other" && renderOtherTable()}
        </div>

        {/* Mobile card grid */}
        <div className="block md:hidden p-4">
          {isLoading ? (
            <p className="py-8 text-center text-slate-500">Đang tải...</p>
          ) : error ? (
            <p className="py-8 text-center text-rose-600">{error}</p>
          ) : tabInvestments.length === 0 ? (
            <p className="py-8 text-center text-slate-400 italic">Chưa có dữ liệu</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {tabInvestments.map((inv) => (
                <InvestmentCard
                  key={inv.id}
                  inv={inv}
                  isSelected={selectedIds.includes(inv.id)}
                  showType={showType}
                  onToggleSelect={() => toggleSelectInvestment(inv.id)}
                  onEdit={() => openEditDialog(inv)}
                  onDelete={() => setPendingDelete(inv)}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
      
      {/* Right side chart for category */}
      <Card className="p-5 xl:sticky xl:top-24">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-950">
            {activeTab === "gold" ? "Biểu đồ Mua Vàng theo tháng" : `Phân bổ ${meta.label.toLowerCase()}`}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {activeTab === "gold" ? "Khối lượng và số tiền đầu tư theo tháng." : "Tỷ trọng các tài sản trong danh mục này."}
          </p>
        </div>
        {activeTab === "gold" ? (
          <GoldMonthlyBarChart data={categoryAssets} />
        ) : categoryAssets.length > 0 ? (
          <InvestmentDonut data={categoryAssetsByType} total={categoryTotalAssets} />
        ) : (
          <div className="grid h-48 place-items-center text-sm italic text-slate-400">
            Chưa có tài sản
          </div>
        )}
      </Card>
    </div>
  );
}

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="flex w-full flex-col gap-6 px-2.5 py-4 sm:py-5">
      {/* Page header */}
      <header className="flex flex-col gap-5 rounded-lg border border-purple-100 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-purple-700">Investment Management</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 md:text-4xl">Quản lý Đầu tư</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Theo dõi tổng tài sản, tính toán lãi/lỗ của các danh mục đầu tư Vàng, Chứng khoán, và Tiết kiệm.
          </p>
        </div>
      </header>

      {/* Tab bar */}
      <div className="overflow-x-auto -mx-2.5 px-2.5">
        <div className="flex gap-1.5 min-w-max rounded-xl bg-slate-100 p-1.5">
          {TAB_KEYS.map((tabKey) => {
            const meta = tabMeta[tabKey];
            const count = tabCounts[tabKey];
            const isActive = activeTab === tabKey;
            return (
              <button
                key={tabKey}
                type="button"
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-all whitespace-nowrap",
                  isActive
                    ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/50",
                )}
                onClick={() => {
                  setActiveTab(tabKey);
                  setQuery("");
                  setSelectedIds([]);
                }}
              >
                <Icon name={meta.icon} className={cn("h-4 w-4", isActive && tabKey !== "overview" && `text-${meta.color}-500`)} />
                <span className="hidden sm:inline">{meta.label}</span>
                <span className="sm:hidden">{meta.label.split(" ")[0]}</span>
                {tabKey !== "overview" && count > 0 && (
                  <span className={cn(
                    "ml-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                    isActive
                      ? "bg-slate-950 text-white"
                      : "bg-slate-200 text-slate-600",
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {renderTabContent()}

      {/* Form dialog */}
      <Dialog description={formDescription()} onClose={closeFormDialog} open={isFormOpen} title={formTitle()}>
        {renderForm()}
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog description="Bạn có chắc chắn muốn xoá tài sản này?" onClose={() => setPendingDelete(null)} open={Boolean(pendingDelete)} title="Xóa tài sản?">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-fit" disabled={isSaving} onClick={() => setPendingDelete(null)} variant="secondary">Hủy</Button>
          <Button className="w-full sm:w-fit" disabled={isSaving} onClick={confirmDelete} variant="danger">
            {isSaving ? "Đang xóa..." : "Xóa"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
