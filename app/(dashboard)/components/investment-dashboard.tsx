"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Icon, IconName } from "./icons";
import { readMoney } from "@/app/utils/read-money";

type AssetType = "GOLD" | "STOCK" | "SAVING" | "REAL_ESTATE" | "CRYPTO" | "OTHER";
type FamilyMember = "CK" | "VK" | "CON";

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

const emptyForm: InvestmentForm = {
  name: "",
  type: "GOLD",
  quantity: "1",
  purchasePrice: "",
  currentPrice: "",
  interestRate: "",
  term: "",
  member: "CK",
  note: "",
  date: "2026-07-05",
};

const assetMeta: Record<AssetType, { label: string; icon: IconName; chart: string; badge: string }> = {
  GOLD: { label: "Vàng", icon: "sparkles", chart: "#eab308", badge: "bg-yellow-50 text-yellow-700 ring-yellow-100" },
  STOCK: { label: "Chứng khoán", icon: "trendingUp", chart: "#3b82f6", badge: "bg-blue-50 text-blue-700 ring-blue-100" },
  SAVING: { label: "Sổ tiết kiệm", icon: "wallet", chart: "#10b981", badge: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  REAL_ESTATE: { label: "Bất động sản", icon: "home", chart: "#f97316", badge: "bg-orange-50 text-orange-700 ring-orange-100" },
  CRYPTO: { label: "Crypto", icon: "banknote", chart: "#a855f7", badge: "bg-purple-50 text-purple-700 ring-purple-100" },
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
  let offset = 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-center">
      <div className="relative mx-auto h-56 w-56">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 180 180">
          <circle cx="90" cy="90" fill="none" r={radius} stroke="#f1f5f9" strokeWidth="22" />
          {data.map((item) => {
            const length = total > 0 ? (item.amount / total) * circumference : 0;
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
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tài sản</p>
            <p className="mt-1 text-sm font-bold text-slate-950">{currency(total)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {data.map((item) => {
          const percent = total ? Math.round((item.amount / total) * 100) : 0;
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
  const [form, setForm] = useState<InvestmentForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Investment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingGold, setIsFetchingGold] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goldPriceStr, setGoldPriceStr] = useState<string>("");

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
    if (item.type === "SAVING" && item.interestRate && item.term) {
      const pnl = (item.purchasePrice * item.quantity) * (item.interestRate / 100) / 12 * Number(item.term);
      return sum + (item.purchasePrice * item.quantity) + pnl;
    }
    return sum + (item.currentPrice * item.quantity);
  }, 0), [investments]);

  const totalCost = useMemo(() => investments.reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0), [investments]);
  
  const totalPnL = useMemo(() => investments.reduce((sum, item) => {
    if (item.type === "SAVING" && item.interestRate && item.term) {
      return sum + ((item.purchasePrice * item.quantity) * (item.interestRate / 100) / 12 * Number(item.term));
    }
    return sum + (item.currentPrice - item.purchasePrice) * item.quantity;
  }, 0), [investments]);

  const pnlPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  const assetsByType = useMemo(() => {
    const types: AssetType[] = ["GOLD", "STOCK", "SAVING", "REAL_ESTATE", "CRYPTO", "OTHER"];
    return types.map(type => {
      const amount = investments.filter(i => i.type === type).reduce((sum, item) => {
        if (item.type === "SAVING" && item.interestRate && item.term) {
          const pnl = (item.purchasePrice * item.quantity) * (item.interestRate / 100) / 12 * Number(item.term);
          return sum + (item.purchasePrice * item.quantity) + pnl;
        }
        return sum + (item.currentPrice * item.quantity);
      }, 0);
      return { type, amount };
    }).filter(i => i.amount > 0).sort((a, b) => b.amount - a.amount);
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

  const stats = useMemo(() => {
    return {
      gold: investments.filter(i => i.type === "GOLD").reduce((sum, i) => sum + i.quantity, 0),
      saving: investments.filter(i => i.type === "SAVING").length,
      stock: investments.filter(i => i.type === "STOCK").reduce((sum, i) => sum + i.quantity, 0),
      crypto: investments.filter(i => i.type === "CRYPTO").reduce((sum, i) => sum + i.quantity, 0),
      realEstate: investments.filter(i => i.type === "REAL_ESTATE").length,
    };
  }, [investments]);

  function openCreateDialog() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setIsFormOpen(true);
  }

  function openEditDialog(investment: Investment) {
    setEditingId(investment.id);
    setForm({
      name: investment.name,
      type: investment.type,
      quantity: String(investment.quantity),
      purchasePrice: String(investment.purchasePrice),
      currentPrice: String(investment.currentPrice),
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
    setForm({ ...emptyForm });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = Number(form.quantity);
    const purchasePrice = Number(form.purchasePrice);
    const currentPrice = Number(form.currentPrice);

    if (!quantity || quantity <= 0 || purchasePrice < 0 || currentPrice < 0 || !form.name) {
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
    try {
      const response = await fetch("/api/market/gold");
      if (!response.ok) throw new Error("Không thể tải giá vàng");
      const data = await response.json();
      
      if (data.success && data.data && data.data.ring) {
        // Chia 10 để ra giá 1 chỉ
        const ringBuyPerChi = data.data.ring.buy / 10;
        const ringSellPerChi = data.data.ring.sell / 10;
        
        setGoldPriceStr(`Vàng nhẫn SJC/chỉ - Mua: ${currency(ringBuyPerChi)} | Bán: ${currency(ringSellPerChi)}`);
        
        const goldAssets = investments.filter(i => i.type === "GOLD");
        if (goldAssets.length > 0) {
          const promises = goldAssets.map(async (asset) => {
            const res = await fetch(`/api/investments/${asset.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ currentPrice: ringBuyPerChi }) // Giá thị trường (Giá tiệm mua vào)
            });
            return res.json();
          });
          
          const results = await Promise.all(promises);
          
          setInvestments(current => current.map(item => {
            if (item.type === "GOLD") {
              return { ...item, currentPrice: ringBuyPerChi };
            }
            return item;
          }));
        }
      } else {
        throw new Error(data.error || "Không có dữ liệu giá vàng");
      }
    } catch (err) {
      alert("Lỗi khi tải giá vàng SJC: " + (err instanceof Error ? err.message : "Lỗi không xác định"));
    } finally {
      setIsFetchingGold(false);
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
           <Button variant="outline" onClick={fetchGoldPrice} disabled={isFetchingGold}>
             <Icon name="sparkles" className="w-4 h-4 text-yellow-500" />
             {isFetchingGold ? "Đang lấy giá..." : "Cập nhật Giá Vàng SJC (Realtime)"}
           </Button>
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
                <option value="GOLD">Vàng</option>
                <option value="STOCK">Chứng khoán</option>
                <option value="SAVING">Tiết kiệm</option>
                <option value="REAL_ESTATE">Bất động sản</option>
                <option value="CRYPTO">Tiền điện tử</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/50 p-4 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">Thống kê nhanh:</span>
            {stats.gold > 0 && <Badge className="bg-yellow-50 text-yellow-700 ring-yellow-200">{stats.gold.toLocaleString('vi-VN')} chỉ Vàng</Badge>}
            {stats.saving > 0 && <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">{stats.saving.toLocaleString('vi-VN')} Sổ tiết kiệm</Badge>}
            {stats.stock > 0 && <Badge className="bg-blue-50 text-blue-700 ring-blue-200">{stats.stock.toLocaleString('vi-VN')} Cổ phiếu</Badge>}
            {stats.crypto > 0 && <Badge className="bg-purple-50 text-purple-700 ring-purple-200">{stats.crypto.toLocaleString('vi-VN')} Coin / Crypto</Badge>}
            {stats.realEstate > 0 && <Badge className="bg-orange-50 text-orange-700 ring-orange-200">{stats.realEstate.toLocaleString('vi-VN')} Bất động sản</Badge>}
            {(stats.gold === 0 && stats.saving === 0 && stats.stock === 0 && stats.crypto === 0 && stats.realEstate === 0) && (
              <span className="text-slate-400 italic">Chưa có dữ liệu</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] border-collapse text-left text-xs">
              <thead className="bg-slate-50 uppercase tracking-wide text-slate-500">
                <tr>
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
                  <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={9}>Đang tải...</td></tr>
                ) : null}
                {!isLoading && error ? (
                  <tr><td className="px-3 py-8 text-center text-rose-600" colSpan={9}>{error}</td></tr>
                ) : null}
                {!isLoading && !error ? filteredInvestments.map((inv) => {
                  const meta = assetMeta[inv.type];
                  let pnl = 0;
                  if (inv.type === "SAVING" && inv.interestRate && inv.term) {
                    pnl = (inv.purchasePrice * inv.quantity) * (inv.interestRate / 100) / 12 * Number(inv.term);
                  } else {
                    pnl = (inv.currentPrice - inv.purchasePrice) * inv.quantity;
                  }
                  const pnlPercentItem = inv.purchasePrice > 0 ? (pnl / (inv.purchasePrice * inv.quantity)) * 100 : 0;
                  
                  return (
                    <tr className="bg-white transition hover:bg-purple-50/40" key={inv.id}>
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
                      <td className="px-3 py-3 text-right font-medium">{inv.quantity.toLocaleString('vi-VN')}</td>
                      <td className="px-3 py-3 text-right text-slate-500">{currency(inv.purchasePrice)}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900">{currency(inv.currentPrice)}</td>
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
                         <div className={cn("font-bold", pnl >= 0 ? "text-emerald-600" : "text-rose-600")}>
                           {pnl >= 0 ? "+" : ""}{currency(pnl)}
                         </div>
                         <div className={cn("text-[10px] font-semibold", pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
                           {pnl >= 0 ? "+" : ""}{pnlPercentItem.toFixed(2)}%
                         </div>
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
              <select className={inputClass()} id="type" onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as AssetType }))} value={form.type}>
                <option value="GOLD">Vàng</option>
                <option value="STOCK">Chứng khoán</option>
                <option value="SAVING">Tiết kiệm</option>
                <option value="REAL_ESTATE">Bất động sản</option>
                <option value="CRYPTO">Tiền điện tử</option>
                <option value="OTHER">Khác</option>
              </select>
            </Field>
            <Field id="quantity" label="Số lượng (Lượng, Cổ phiếu...)">
              <input className={inputClass()} id="quantity" min="0.000001" step="any" onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} required type="number" value={form.quantity} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="purchasePrice" label="Giá vốn (trên 1 đơn vị)">
              <input className={inputClass()} id="purchasePrice" min="0" step="any" onChange={(event) => setForm((current) => ({ ...current, purchasePrice: event.target.value }))} required type="number" value={form.purchasePrice} />
              {form.purchasePrice && <p className="text-xs italic text-rose-600">{readMoney(form.purchasePrice)}</p>}
            </Field>
            <Field id="currentPrice" label="Giá hiện tại (trên 1 đơn vị)">
              <input className={inputClass()} id="currentPrice" min="0" step="any" onChange={(event) => setForm((current) => ({ ...current, currentPrice: event.target.value }))} required type="number" value={form.currentPrice} />
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
