"use client";

import { FormEvent, useMemo, useState } from "react";
import { Icon, type IconName } from "./icons";

export type TargetAssetType =
  | "GOLD"
  | "STOCK"
  | "SAVING"
  | "REAL_ESTATE"
  | "CRYPTO"
  | "OTHER"
  | "FUND_DCDS"
  | "FUND_ETF_VN30";

export type TargetUnit = "VND" | "CHI" | "CCQ";

export type TargetRow = {
  type: TargetAssetType;
  targetValue: number;
  unit: TargetUnit;
};

type InvestmentRow = {
  type: string;
  quantity: number;
  purchasePrice: number;
};

const TARGET_ORDER: TargetAssetType[] = [
  "SAVING",
  "GOLD",
  "FUND_DCDS",
  "FUND_ETF_VN30",
  "STOCK",
  "REAL_ESTATE",
  "CRYPTO",
  "OTHER",
];

const TYPE_META: Record<
  TargetAssetType,
  { label: string; short: string; icon: IconName; card: string; iconWrap: string; bar: string; track: string }
> = {
  SAVING: {
    label: "Sổ tiết kiệm",
    short: "TK",
    icon: "wallet",
    card: "border-emerald-200/80 bg-emerald-50/70 hover:border-emerald-300",
    iconWrap: "bg-emerald-50 text-emerald-600",
    bar: "bg-emerald-500",
    track: "bg-emerald-100/80",
  },
  GOLD: {
    label: "Vàng",
    short: "Vàng",
    icon: "sparkles",
    card: "border-amber-200/80 bg-amber-50/70 hover:border-amber-300",
    iconWrap: "bg-amber-50 text-amber-600",
    bar: "bg-amber-500",
    track: "bg-amber-100/80",
  },
  FUND_DCDS: {
    label: "CCQ CP DCDS",
    short: "DCDS",
    icon: "briefcase",
    card: "border-indigo-200/80 bg-indigo-50/70 hover:border-indigo-300",
    iconWrap: "bg-indigo-50 text-indigo-600",
    bar: "bg-indigo-500",
    track: "bg-indigo-100/80",
  },
  FUND_ETF_VN30: {
    label: "CCQ ETF VN30",
    short: "ETF",
    icon: "barChart",
    card: "border-teal-200/80 bg-teal-50/70 hover:border-teal-300",
    iconWrap: "bg-teal-50 text-teal-600",
    bar: "bg-teal-500",
    track: "bg-teal-100/80",
  },
  STOCK: {
    label: "Chứng khoán",
    short: "CK",
    icon: "trendingUp",
    card: "border-blue-200/80 bg-blue-50/70 hover:border-blue-300",
    iconWrap: "bg-blue-50 text-blue-600",
    bar: "bg-blue-500",
    track: "bg-blue-100/80",
  },
  REAL_ESTATE: {
    label: "Bất động sản",
    short: "BĐS",
    icon: "home",
    card: "border-orange-200/80 bg-orange-50/70 hover:border-orange-300",
    iconWrap: "bg-orange-50 text-orange-600",
    bar: "bg-orange-500",
    track: "bg-orange-100/80",
  },
  CRYPTO: {
    label: "Crypto",
    short: "Crypto",
    icon: "bitcoin",
    card: "border-violet-200/80 bg-violet-50/70 hover:border-violet-300",
    iconWrap: "bg-violet-50 text-violet-600",
    bar: "bg-violet-500",
    track: "bg-violet-100/80",
  },
  OTHER: {
    label: "Khác",
    short: "Khác",
    icon: "target",
    card: "border-slate-200 bg-slate-50/80 hover:border-slate-300",
    iconWrap: "bg-slate-100 text-slate-600",
    bar: "bg-slate-500",
    track: "bg-slate-200",
  },
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function compactVnd(value: number) {
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
  return String(Math.round(value));
}

function formatVndInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("vi-VN").format(Number(digits));
}

function formatQty(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 4 }).format(value);
}

function unitLabel(unit: TargetUnit) {
  if (unit === "CHI") return "chỉ";
  if (unit === "CCQ") return "CCQ";
  return "";
}

function formatActual(value: number, unit: TargetUnit) {
  if (unit === "VND") return compactVnd(value);
  return `${formatQty(value)} ${unitLabel(unit)}`;
}

function remainingText(actual: number, target: number, unit: TargetUnit) {
  const leftover = Math.max(target - actual, 0);
  const over = Math.max(actual - target, 0);
  return { leftover: formatActual(leftover, unit), over: formatActual(over, unit) };
}

function progressStatus(actual: number, target: number, unit: TargetUnit, pct: number | null) {
  if (target <= 0) {
    return { text: "Chưa đặt mục tiêu", className: "text-xs text-zinc-400", over: false };
  }
  if (actual <= 0) {
    return { text: "Chưa phát sinh", className: "text-xs text-zinc-400", over: false };
  }
  const { leftover, over } = remainingText(actual, target, unit);
  if (pct != null && pct > 100) {
    return { text: `Vượt mục tiêu (+${over})`, className: "text-xs font-medium text-rose-600", over: true };
  }
  if (pct != null && pct >= 80) {
    return { text: `Sắp đạt (${pct}%) · Còn ${leftover}`, className: "text-xs font-medium text-amber-600", over: false };
  }
  return { text: `Đã được ${pct}% · Còn lại ${leftover}`, className: "text-xs text-zinc-500", over: false };
}

export function actualForType(investments: InvestmentRow[], type: TargetAssetType) {
  const rows = investments.filter((item) => item.type === type);
  if (type === "GOLD" || type === "FUND_DCDS" || type === "FUND_ETF_VN30") {
    return rows.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }
  return rows.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0), 0);
}

function parseTargetInput(text: string, unit: TargetUnit) {
  const trimmed = text.trim().replace(/\s/g, "");
  if (!trimmed) return 0;
  if (unit === "VND") {
    const digits = trimmed.replace(/\D/g, "");
    if (!digits) return null;
    return Number(digits);
  }
  const value = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

export function InvestmentYearTargets({
  year,
  investments,
  targets,
  onSaved,
}: {
  year: string;
  investments: InvestmentRow[];
  targets: TargetRow[];
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState<TargetAssetType | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byType = useMemo(() => {
    const map = new Map(targets.map((row) => [row.type, row]));
    return TARGET_ORDER.map((type) => {
      const meta = TYPE_META[type];
      const stored = map.get(type);
      const unit = stored?.unit ?? (type === "GOLD" ? "CHI" : type.startsWith("FUND") ? "CCQ" : "VND");
      const targetValue = stored?.targetValue ?? 0;
      const actual = actualForType(investments, type);
      const pct = targetValue > 0 ? Math.round((actual / targetValue) * 1000) / 10 : null;
      return { type, unit, targetValue, actual, pct, meta };
    });
  }, [targets, investments]);

  const editingRow = byType.find((row) => row.type === editing) ?? null;

  function openEdit(type: TargetAssetType) {
    const row = byType.find((item) => item.type === type);
    setEditing(type);
    setError(null);
    if (!row || row.targetValue <= 0) {
      setDraft("");
    } else if (row.unit === "VND") {
      setDraft(formatVndInput(String(Math.round(row.targetValue))));
    } else {
      setDraft(String(row.targetValue));
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editingRow) return;
    const parsed = parseTargetInput(draft, editingRow.unit);
    if (parsed == null) {
      setError("Số mục tiêu không hợp lệ.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/investments/targets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          items: [{ type: editingRow.type, targetValue: parsed }],
        }),
      });
      if (!response.ok) {
        throw new Error("Không lưu được mục tiêu.");
      }
      setEditing(null);
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không lưu được mục tiêu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="font-semibold text-slate-950">Mục tiêu đầu tư năm {year}</h2>
        <p className="mt-1 text-xs text-slate-500">
          Thực tế so với hạn mức năm. Bấm Sửa để đổi mục tiêu. Số thực tế đồng bộ từ danh mục đầu tư.
        </p>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        {byType.map((row) => {
          const ratio = row.targetValue > 0 ? row.actual / row.targetValue : row.actual > 0 ? 2 : 0;
          const status = progressStatus(row.actual, row.targetValue, row.unit, row.pct);
          return (
            <div
              className={cn("rounded-xl border p-3 transition-all duration-200 hover:shadow-md", row.meta.card)}
              key={row.type}
            >
              <div className="relative pr-8">
                <button
                  aria-label={`Sửa mục tiêu ${row.meta.label}`}
                  className="absolute right-0 top-0 rounded-lg p-1.5 text-zinc-400 outline-none transition hover:bg-zinc-100 hover:text-zinc-600"
                  onClick={() => openEdit(row.type)}
                  type="button"
                >
                  <Icon className="h-3.5 w-3.5" name="edit" />
                </button>
                <div className="flex items-center gap-2">
                  <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", row.meta.iconWrap)}>
                    <Icon className="h-4 w-4" name={row.meta.icon} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-snug text-zinc-900">{row.meta.label}</p>
                    <p className="text-[11px] font-medium text-zinc-500">
                      {row.pct != null ? `${row.pct}% mục tiêu` : "Chưa đặt hạn mức"}
                      {row.unit === "CHI" ? " · chỉ" : row.unit === "CCQ" ? " · CCQ" : ""}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-3 tabular-nums">
                <span className="text-lg font-bold text-zinc-900">{formatActual(row.actual, row.unit)}</span>
                <span className="text-sm font-medium text-zinc-400">
                  {" "}
                  / {row.targetValue > 0 ? formatActual(row.targetValue, row.unit) : "—"}
                </span>
              </p>

              <div className={cn("mt-2 h-2 overflow-hidden rounded-full", row.meta.track)}>
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    status.over ? "bg-rose-500" : row.meta.bar,
                  )}
                  style={{ width: `${Math.min(Math.max(ratio * 100, 0), 100)}%` }}
                />
              </div>
              <p className={cn("mt-1.5", status.className)}>{status.text}</p>
            </div>
          );
        })}
      </div>

      {editingRow ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 py-6" role="presentation">
          <div
            aria-modal="true"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            role="dialog"
          >
            <form onSubmit={save}>
              <div className="flex items-start justify-between gap-4 border-b border-amber-100 bg-gradient-to-r from-amber-50/90 via-white to-rose-50/50 p-5">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Sửa hạn mức {editingRow.meta.label}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Đổi mục tiêu năm {year}. Số thực tế đồng bộ từ danh mục đầu tư theo năm đang xem.
                  </p>
                </div>
                <button
                  className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600"
                  onClick={() => setEditing(null)}
                  type="button"
                >
                  <Icon className="h-4 w-4" name="x" />
                </button>
              </div>
              <div className="space-y-4 p-5">
                <label className="block text-sm font-medium text-slate-700" htmlFor="target-value">
                  Hạn mức năm {editingRow.unit === "VND" ? "(VND)" : editingRow.unit === "CHI" ? "(chỉ)" : "(CCQ)"}
                </label>
                <input
                  className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm tabular-nums outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  id="target-value"
                  inputMode={editingRow.unit === "VND" ? "numeric" : "decimal"}
                  onChange={(event) =>
                    setDraft(editingRow.unit === "VND" ? formatVndInput(event.target.value) : event.target.value)
                  }
                  placeholder={editingRow.unit === "VND" ? "350.000.000" : editingRow.unit === "CHI" ? "10" : "80"}
                  value={draft}
                />
                <p className="rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-xs leading-5 text-emerald-800">
                  Hiện tại {formatActual(editingRow.actual, editingRow.unit)}
                  {editingRow.targetValue > 0 ? ` / hạn mức ${formatActual(editingRow.targetValue, editingRow.unit)}` : ""}.
                </p>
                {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                    onClick={() => setEditing(null)}
                    type="button"
                  >
                    Hủy
                  </button>
                  <button
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    disabled={saving}
                    type="submit"
                  >
                    {saving ? "Đang lưu…" : "Lưu"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
