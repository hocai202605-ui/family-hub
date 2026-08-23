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
  if (isZeroPnlType(item.type)) return item.currentPrice;
  return item.currentPrice > 0 ? item.currentPrice : item.purchasePrice;
}

function assetPresentValue(item: Investment) {
  if (item.type === "DEBT") {
    return -(item.currentPrice * item.quantity);
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

function createEmptyForm(): InvestmentForm {
  return {
    name: "",
    type: "GOLD",
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

function Progress({ value, className, colorClass = "bg-emerald-500" }: { value: number; className?: string; colorClass?: string }) {
  return (
    <div className={cn("h-2.5 overflow-hidden rounded-full bg-slate-100", className)}>
      <div className={cn("h-full rounded-full transition-all", colorClass)} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
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

export function InvestmentDashboard() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType | "all">("all");
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

  const filteredInvestments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return investments
      .filter((item) => typeFilter === "all" || item.type === typeFilter)
      .filter((item) => {
        if (!normalizedQuery) return true;
        return (
          item.name.toLowerCase().includes(normalizedQuery) ||
          item.note.toLowerCase().includes(normalizedQuery) ||
          assetMeta[item.type].label.toLowerCase().includes(normalizedQuery)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [typeFilter, investments, query]);

  const filteredInvestmentIds = useMemo(() => filteredInvestments.map((item) => item.id), [filteredInvestments]);

  const allVisibleSelected =
    filteredInvestmentIds.length > 0 && filteredInvestmentIds.every((id) => selectedIds.includes(id));

  const someVisibleSelected =
    filteredInvestmentIds.some((id) => selectedIds.includes(id)) && !allVisibleSelected;

  const selectedInvestments = useMemo(
    () => filteredInvestments.filter((item) => selectedIds.includes(item.id)),
    [filteredInvestments, selectedIds],
  );

  const selectedPresentValue = useMemo(
    () => selectedInvestments.reduce((sum, item) => sum + assetPresentValue(item), 0),
    [selectedInvestments],
  );

  const selectedCostValue = useMemo(
    () => selectedInvestments.reduce((sum, item) => sum + assetCostValue(item), 0),
    [selectedInvestments],
  );

  useEffect(() => {
    setSelectedIds((current) => {
      const next = current.filter((id) => filteredInvestmentIds.includes(id));
      return next.length === current.length ? current : next;
    });
  }, [filteredInvestmentIds]);

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !filteredInvestmentIds.includes(id)));
      return;
    }
    setSelectedIds((current) => Array.from(new Set([...current, ...filteredInvestmentIds])));
  }

  function toggleSelectInvestment(id: number) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id],
    );
  }

  const stats = useMemo(() => {
    return {
      gold: investments.filter((i) => i.type === "GOLD").reduce((sum, i) => sum + i.quantity, 0),
      saving: investments.filter((i) => i.type === "SAVING").length,
      stock: investments.filter((i) => i.type === "STOCK").reduce((sum, i) => sum + i.quantity, 0),
      dcds: investments.filter((i) => i.type === "FUND_DCDS").reduce((sum, i) => sum + i.quantity, 0),
      etfVn30: investments.filter((i) => i.type === "FUND_ETF_VN30").reduce((sum, i) => sum + i.quantity, 0),
      crypto: investments.filter((i) => i.type === "CRYPTO").reduce((sum, i) => sum + i.quantity, 0),
      realEstate: investments.filter((i) => i.type === "REAL_ESTATE").length,
      debt: investments.filter((i) => i.type === "DEBT").length,
      debtInterest: investments.filter((i) => i.type === "DEBT_INTEREST").length,
      loan: investments.filter((i) => i.type === "LOAN").length,
    };
  }, [investments]);

  function openCreateDialog() {
    setEditingId(null);
    setForm(createEmptyForm());
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
    setForm(createEmptyForm());
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

  return (
    <div className="flex w-full flex-col gap-6 px-2.5 py-4 sm:py-5">
      <header className="flex flex-col gap-5 rounded-lg border border-purple-100 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-purple-700">Investment Management</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 md:text-4xl">Quản lý Đầu tư</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Theo dõi tổng tài sản, tính toán lãi/lỗ của các danh mục đầu tư Vàng, Chứng khoán, và Tiết kiệm.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
           {goldPriceStr && <p className="text-xs font-bold text-yellow-600">{goldPriceStr}</p>}
           {ccqPriceStr && <p className="text-xs font-bold text-indigo-600">{ccqPriceStr}</p>}
           {priceError && <p className="text-xs font-semibold text-rose-600">{priceError}</p>}
           <div className="flex flex-wrap justify-end gap-2">
             <Button variant="outline" onClick={fetchGoldPrice} disabled={isFetchingGold}>
               <Icon name="sparkles" className="w-4 h-4 text-yellow-500" />
               {isFetchingGold ? "Đang lấy giá..." : "Cập nhật Giá Vàng SJC (Realtime)"}
             </Button>
             <Button variant="outline" onClick={fetchCcqPrices} disabled={isFetchingCcq}>
               <Icon name="briefcase" className="w-4 h-4 text-indigo-500" />
               {isFetchingCcq ? "Đang lấy giá..." : "Cập nhật giá CCQ"}
             </Button>
           </div>
        </div>
      </header>

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

      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold text-slate-950">Danh mục tài sản</h2>
              <Button className="w-full sm:w-fit" disabled={isSaving} onClick={openCreateDialog}>
                <Icon className="h-4 w-4" name="plus" />
                Thêm tài sản
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icon className="h-4 w-4" name="search" />
                </span>
                <input className={cn(inputClass(), "w-full pl-9")} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên tài sản..." type="search" value={query} />
              </div>
              <select className={cn(inputClass(), "w-full")} onChange={(event) => setTypeFilter(event.target.value as AssetType | "all")} value={typeFilter}>
                <option value="all">Tất cả loại hình</option>
                {ASSET_TYPES.map((type) => (
                  <option key={type} value={type}>{assetMeta[type].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/50 p-4 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">Thống kê nhanh:</span>
            {stats.gold > 0 && <Badge className="bg-yellow-50 text-yellow-700 ring-yellow-200">{formatQuantity(stats.gold)} chỉ Vàng</Badge>}
            {stats.saving > 0 && <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">{stats.saving.toLocaleString("vi-VN")} Sổ tiết kiệm</Badge>}
            {stats.stock > 0 && <Badge className="bg-blue-50 text-blue-700 ring-blue-200">{formatQuantity(stats.stock)} Cổ phiếu</Badge>}
            {stats.dcds > 0 && <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200">{formatQuantity(stats.dcds)} CCQ DCDS</Badge>}
            {stats.etfVn30 > 0 && <Badge className="bg-teal-50 text-teal-700 ring-teal-200">{formatQuantity(stats.etfVn30)} CCQ ETF VN30</Badge>}
            {stats.crypto > 0 && <Badge className="bg-purple-50 text-purple-700 ring-purple-200">{formatQuantity(stats.crypto)} Coin / Crypto</Badge>}
            {stats.realEstate > 0 && <Badge className="bg-orange-50 text-orange-700 ring-orange-200">{stats.realEstate.toLocaleString("vi-VN")} Bất động sản</Badge>}
            {stats.debt > 0 && <Badge className="bg-rose-50 text-rose-700 ring-rose-200">{stats.debt.toLocaleString("vi-VN")} Khoản Nợ</Badge>}
            {stats.debtInterest > 0 && <Badge className="bg-rose-50 text-rose-800 ring-rose-200">{stats.debtInterest.toLocaleString("vi-VN")} Trả nợ lãi vay</Badge>}
            {stats.loan > 0 && <Badge className="bg-sky-50 text-sky-700 ring-sky-200">{stats.loan.toLocaleString("vi-VN")} Khoản Cho Vay</Badge>}
            {(stats.gold === 0 && stats.saving === 0 && stats.stock === 0 && stats.dcds === 0 && stats.etfVn30 === 0 && stats.crypto === 0 && stats.realEstate === 0 && stats.debt === 0 && stats.debtInterest === 0 && stats.loan === 0) && (
              <span className="text-slate-400 italic">Chưa có dữ liệu</span>
            )}
          </div>

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
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] border-collapse text-left text-xs">
              <thead className="bg-slate-50 uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input
                      aria-label="Chọn tất cả"
                      checked={allVisibleSelected}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      disabled={isLoading || filteredInvestmentIds.length === 0}
                      onChange={toggleSelectAllVisible}
                      ref={(input) => {
                        if (input) input.indeterminate = someVisibleSelected;
                      }}
                      type="checkbox"
                    />
                  </th>
                  <th className="px-3 py-3 font-semibold">Tên tài sản</th>
                  <th className="px-3 py-3 font-semibold">Ngày mua</th>
                  <th className="px-3 py-3 text-right font-semibold">SL</th>
                  <th className="px-3 py-3 text-right font-semibold">Giá mua</th>
                  <th className="px-3 py-3 text-right font-semibold">Giá HT</th>
                  <th className="px-3 py-3 text-right font-semibold">Lãi suất/Kỳ hạn</th>
                  <th className="px-3 py-3 text-right font-semibold">Tổng vốn</th>
                  <th className="px-3 py-3 text-right font-semibold">Lãi/Lỗ</th>
                  <th className="px-3 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={10}>Đang tải...</td></tr>
                ) : null}
                {!isLoading && error ? (
                  <tr><td className="px-3 py-8 text-center text-rose-600" colSpan={10}>{error}</td></tr>
                ) : null}
                {!isLoading && !error ? filteredInvestments.map((inv) => {
                  const meta = assetMeta[inv.type];
                  const hidePnl = isZeroPnlType(inv.type);
                  const isSelected = selectedIds.includes(inv.id);
                  let pnl = 0;
                  if (hidePnl) {
                    pnl = 0;
                  } else if (inv.type === "SAVING" && inv.interestRate && inv.term) {
                    pnl = (inv.purchasePrice * inv.quantity) * (inv.interestRate / 100) / 12 * Number(inv.term);
                  } else {
                    pnl = (effectiveUnitPrice(inv) - inv.purchasePrice) * inv.quantity;
                  }
                  const pnlPercentItem = inv.purchasePrice > 0 ? (pnl / (inv.purchasePrice * inv.quantity)) * 100 : 0;
                  
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
                           <div>
                              <p className="font-bold text-slate-900">{inv.name}</p>
                              <Badge className={cn("mt-1 text-[10px] px-1.5 py-0.5", meta.badge)}>{meta.label}</Badge>
                           </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-700">{dateLabel(inv.date)}</td>
                      <td className="px-3 py-3 text-right font-medium">{formatQuantity(inv.quantity)}</td>
                      <td className="px-3 py-3 text-right text-slate-500">{currency(inv.purchasePrice)}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900">{inv.currentPrice > 0 ? currency(inv.currentPrice) : "—"}</td>
                      <td className="px-3 py-3 text-right">
                         {inv.type === "SAVING" ? (
                           <>
                             <div className="font-semibold text-slate-900">{inv.interestRate ? `${inv.interestRate}%/năm` : "-"}</div>
                             <div className="text-[10px] text-slate-500">{inv.term ? `${inv.term} Tháng` : "-"}</div>
                           </>
                         ) : (
                           <span className="text-slate-300">-</span>
                         )}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-500">{currency(inv.purchasePrice * inv.quantity)}</td>
                      <td className="px-3 py-3 text-right">
                         {hidePnl ? (
                           <span className="text-slate-300">—</span>
                         ) : (
                           <>
                             <div className={cn("font-bold", pnl >= 0 ? "text-emerald-600" : "text-rose-600")}>
                               {pnl >= 0 ? "+" : ""}{currency(pnl)}
                             </div>
                             <div className={cn("text-[10px] font-semibold", pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
                               {pnl >= 0 ? "+" : ""}{pnlPercentItem.toFixed(2)}%
                             </div>
                           </>
                         )}
                      </td>
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
                }) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Phân bổ tài sản</h2>
              <p className="mt-1 text-sm text-slate-500">Tỷ trọng theo loại hình đầu tư.</p>
            </div>
          </div>
          <InvestmentDonut data={assetsByType} total={totalAssets} />
        </Card>
      </div>

      <Dialog description="Nhập thông tin tài sản, số lượng và giá vốn ban đầu." onClose={closeFormDialog} open={isFormOpen} title={editingId ? "Sửa tài sản" : "Thêm tài sản"}>
        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <Field id="name" label="Tên tài sản (VD: Vàng SJC, Cổ phiếu FPT, STK Vietcombank)">
            <input className={inputClass()} id="name" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required type="text" value={form.name} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="type" label="Loại hình">
              <select
                className={inputClass()}
                id="type"
                onChange={(event) => {
                  const nextType = event.target.value as AssetType;
                  setForm((current) => {
                    const autoNames = Object.values(FUND_DEFAULT_NAMES);
                    const shouldFillName = !current.name.trim() || autoNames.includes(current.name);
                    return {
                      ...current,
                      type: nextType,
                      name: shouldFillName && FUND_DEFAULT_NAMES[nextType] ? FUND_DEFAULT_NAMES[nextType]! : current.name,
                    };
                  });
                }}
                value={form.type}
              >
                {ASSET_TYPES.map((type) => (
                  <option key={type} value={type}>{assetMeta[type].label}</option>
                ))}
              </select>
            </Field>
            <Field id="quantity" label={form.type === "GOLD" ? "Số chỉ" : isFundType(form.type) ? "Số CCQ" : "Số lượng (Lượng, Cổ phiếu...)"}>
              {usesQuantityPresets(form.type) ? (
                <div className="grid gap-2">
                  <QuantityCombobox
                    id="quantity"
                    onChange={(quantity) => setForm((current) => ({ ...current, quantity }))}
                    placeholder={form.type === "GOLD" ? "Chọn 0.5–5 hoặc nhập tay" : "Chọn 0.5–5 hoặc nhập tay (vd: 10.56)"}
                    value={form.quantity}
                  />
                  {form.type === "GOLD" && form.quantity.trim() && !isAllowedUnitQuantity(parseStoredNumber(form.quantity)) ? (
                    <p className="text-xs font-medium text-rose-600">Số lượng không hợp lệ. Dùng 0.5 hoặc 1, 2, 3…</p>
                  ) : null}
                </div>
              ) : (
                <input
                  className={inputClass()}
                  id="quantity"
                  inputMode="decimal"
                  onChange={(event) => setForm((current) => ({ ...current, quantity: canonicalizeQuantityInput(event.target.value) }))}
                  required
                  value={form.quantity}
                />
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="purchasePrice" label={isFundType(form.type) ? "Giá mua / CCQ" : "Giá vốn (trên 1 đơn vị)"}>
              <input
                className={inputClass()}
                id="purchasePrice"
                inputMode="decimal"
                onChange={(event) => setForm((current) => ({ ...current, purchasePrice: canonicalizeNumberInput(event.target.value) }))}
                required
                value={formatNumberInput(form.purchasePrice)}
              />
              {form.purchasePrice && <p className="text-xs italic text-rose-600">{readMoney(form.purchasePrice)}</p>}
            </Field>
            <Field id="currentPrice" label={isFundType(form.type) ? "Giá hiện tại / CCQ (không bắt buộc)" : "Giá hiện tại (không bắt buộc)"}>
              <input
                className={inputClass()}
                id="currentPrice"
                inputMode="decimal"
                onChange={(event) => setForm((current) => ({ ...current, currentPrice: canonicalizeNumberInput(event.target.value) }))}
                value={formatNumberInput(form.currentPrice)}
              />
              {form.currentPrice && <p className="text-xs italic text-rose-600">{readMoney(form.currentPrice)}</p>}
            </Field>
          </div>

          {form.type === "SAVING" && (
            <div className="grid gap-4 sm:grid-cols-2 rounded-md bg-emerald-50 p-4 border border-emerald-100">
              <Field id="interestRate" label="Lãi suất (%/năm)">
                <input className={inputClass()} id="interestRate" min="0" step="any" onChange={(event) => setForm((current) => ({ ...current, interestRate: event.target.value }))} placeholder="VD: 5.5" type="number" value={form.interestRate} />
              </Field>
              <Field id="term" label="Kỳ hạn (Tháng)">
                <input className={inputClass()} id="term" min="1" step="1" onChange={(event) => setForm((current) => ({ ...current, term: event.target.value }))} placeholder="VD: 6" type="number" value={form.term} />
              </Field>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="member" label="Người quản lý">
              <select className={inputClass()} id="member" onChange={(event) => setForm((current) => ({ ...current, member: event.target.value as FamilyMember }))} value={form.member}>
                {familyMembers.map((member) => (
                  <option key={member} value={member}>
                    {memberMeta[member].role}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="date" label="Ngày mua/bắt đầu">
              <input className={inputClass()} id="date" onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} required type="date" value={form.date} />
            </Field>
          </div>

          <Field id="note" label="Ghi chú">
            <input className={inputClass()} id="note" onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} type="text" value={form.note} />
          </Field>

          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-fit" disabled={isSaving} onClick={closeFormDialog} variant="secondary">Hủy</Button>
            <Button className="w-full sm:w-fit" disabled={isSaving} type="submit">
              {isSaving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Thêm tài sản"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog description="Bạn có chắc chắn muốn xoá tài sản này?" onClose={() => setPendingDelete(null)} open={Boolean(pendingDelete)} title="Xóa tài sản?">
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-fit" disabled={isSaving} onClick={() => setPendingDelete(null)} variant="secondary">Hủy</Button>
          <Button className="w-full sm:w-fit" disabled={isSaving} onClick={confirmDelete} variant="danger">
            {isSaving ? "Đang xóa..." : "Xóa"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
