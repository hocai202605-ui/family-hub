"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  apiCreateEvent,
  apiCreateEventCategory,
  apiDeleteEvent,
  apiUpdateEvent,
  type GrowthEvent,
  type GrowthEventCategory,
} from "@/lib/growth-api";
import { buildMonthCells, WEEKDAY_HEADERS } from "@/lib/calendar-month";
import { lunarFullLabelFromDateKey, lunarLabelFromDateKey } from "@/lib/lunar-date";
import { vietnamToday } from "@/lib/vietnam-date";
import { Icon } from "./icons";

const COLOR_PRESETS = ["#EF4444", "#8B5CF6", "#F59E0B", "#3B82F6", "#6B7280", "#10B981", "#F43F5E", "#0EA5E9"];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function addDaysKey(dateKey: string, days: number) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function currency(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function eventStatus(date: string, today: string) {
  return date < today ? "done" : "planned";
}

type EventForm = {
  id?: string;
  date: string;
  text: string;
  note: string;
  budgetAmount: string;
  categoryId: string;
};

const emptyForm = (date: string, categoryId: string): EventForm => ({
  date,
  text: "",
  note: "",
  budgetAmount: "",
  categoryId,
});

export function YearlyEventsPanel({
  year,
  events,
  categories,
  onChanged,
}: {
  year: string;
  events: GrowthEvent[];
  categories: GrowthEventCategory[];
  onChanged: () => void;
}) {
  const today = vietnamToday();
  const [monthFilter, setMonthFilter] = useState<"all" | number>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [highlightDay, setHighlightDay] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm(`${year}-01-01`, categories.find((c) => c.id === "other")?.id ?? ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatColor, setNewCatColor] = useState(COLOR_PRESETS[0]);
  const [localCategories, setLocalCategories] = useState(categories);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const categoryList = localCategories.length > 0 ? localCategories : categories;

  const upcomingEnd = addDaysKey(today, 30);

  const kpis = useMemo(() => {
    const inYear = events.filter((event) => event.date.startsWith(year));
    const occurred = inYear.filter((event) => event.date < today).length;
    const upcoming = inYear.filter((event) => event.date >= today && event.date <= upcomingEnd).length;
    return { total: inYear.length, occurred, upcoming };
  }, [events, year, today, upcomingEnd]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((event) => event.date.startsWith(year))
      .filter((event) => (monthFilter === "all" ? true : Number(event.date.slice(5, 7)) === monthFilter))
      .filter((event) => (categoryFilter === "all" ? true : event.categoryId === categoryFilter))
      .filter((event) => {
        if (!q) return true;
        return (
          event.text.toLowerCase().includes(q) ||
          event.note.toLowerCase().includes(q) ||
          (event.category?.label ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.text.localeCompare(b.text, "vi"));
  }, [events, year, monthFilter, categoryFilter, query]);

  const grouped = useMemo(() => {
    const map = new Map<number, GrowthEvent[]>();
    for (const event of filtered) {
      const month = Number(event.date.slice(5, 7));
      const list = map.get(month) ?? [];
      list.push(event);
      map.set(month, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, GrowthEvent[]>();
    for (const event of events) {
      if (!event.date.startsWith(year)) continue;
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [events, year]);

  function openCreate(date?: string) {
    const fallback = date ?? (monthFilter === "all" ? `${year}-01-01` : `${year}-${String(monthFilter).padStart(2, "0")}-01`);
    setForm(emptyForm(fallback, categoryList.find((item) => item.id === "other")?.id ?? categoryList[0]?.id ?? ""));
    setNewCatOpen(false);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(event: GrowthEvent) {
    setForm({
      id: event.id,
      date: event.date,
      text: event.text,
      note: event.note ?? "",
      budgetAmount: event.budgetAmount != null ? String(event.budgetAmount) : "",
      categoryId: event.categoryId,
    });
    setNewCatOpen(false);
    setError(null);
    setFormOpen(true);
  }

  async function saveForm(event: FormEvent) {
    event.preventDefault();
    const text = form.text.trim();
    if (!text || !form.date || !form.categoryId) {
      setError("Nhập tiêu đề, ngày và danh mục.");
      return;
    }
    const budgetRaw = form.budgetAmount.trim();
    const budgetAmount = budgetRaw === "" ? null : Number(budgetRaw);
    if (budgetRaw !== "" && (!Number.isInteger(budgetAmount) || (budgetAmount ?? 0) < 0)) {
      setError("Dự trù chi phí phải là số nguyên VND.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (form.id) {
        await apiUpdateEvent(form.id, {
          date: form.date,
          text,
          note: form.note,
          budgetAmount,
          categoryId: form.categoryId,
        });
      } else {
        await apiCreateEvent({
          member: "GIA_DINH",
          date: form.date,
          text,
          note: form.note,
          budgetAmount,
          categoryId: form.categoryId,
        });
      }
      setFormOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được sự kiện.");
    } finally {
      setBusy(false);
    }
  }

  async function removeEvent(id: string) {
    if (!window.confirm("Xóa sự kiện này?")) return;
    setBusy(true);
    try {
      await apiDeleteEvent(id);
      setFormOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được sự kiện.");
    } finally {
      setBusy(false);
    }
  }

  async function createCategory() {
    const label = newCatLabel.trim();
    if (!label) return;
    setBusy(true);
    setError(null);
    try {
      const created = await apiCreateEventCategory({ label, color: newCatColor });
      setLocalCategories((current) => {
        const next = current.some((item) => item.id === created.category.id)
          ? current
          : [...current, created.category];
        return next.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "vi"));
      });
      setForm((current) => ({ ...current, categoryId: created.category.id }));
      setNewCatOpen(false);
      setNewCatLabel("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được danh mục.");
    } finally {
      setBusy(false);
    }
  }

  function clickMonth(month: number) {
    setMonthFilter(month);
    setHighlightDay(null);
  }

  function clickDay(dateKey: string, inMonth: boolean, month: number) {
    if (!inMonth) return;
    setMonthFilter(month);
    setHighlightDay(dateKey);
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-sky-700">Sự kiện gia đình</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">Sự kiện năm {year}</h2>
        <p className="mt-1 text-sm text-slate-500">Lọc, thêm và theo dõi sự kiện trên lịch 12 tháng. Sự kiện cũ mặc định là Khác — mở card để chọn lại danh mục.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Tổng sự kiện" value={String(kpis.total)} hint="Trong năm đang chọn" tone="sky" />
        <MiniStat label="Đã diễn ra" value={String(kpis.occurred)} hint="Ngày trước hôm nay" tone="slate" />
        <MiniStat label="Sắp tới 30 ngày" value={String(kpis.upcoming)} hint="Từ hôm nay đến 30 ngày" tone="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                onChange={(event) => {
                  const value = event.target.value;
                  setMonthFilter(value === "all" ? "all" : Number(value));
                  setHighlightDay(null);
                }}
                value={monthFilter === "all" ? "all" : String(monthFilter)}
              >
                <option value="all">Tất cả tháng</option>
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index + 1} value={String(index + 1)}>
                    Tháng {index + 1}
                  </option>
                ))}
              </select>
              <input
                className="h-9 min-w-[10rem] flex-1 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm tiêu đề hoặc ghi chú"
                type="search"
                value={query}
              />
              <button
                className="inline-flex h-9 items-center gap-1 rounded-md bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800"
                onClick={() => openCreate(highlightDay ?? undefined)}
                type="button"
              >
                <Icon className="h-4 w-4" name="plus" />
                Thêm sự kiện
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
                  categoryFilter === "all" ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200",
                )}
                onClick={() => setCategoryFilter("all")}
                type="button"
              >
                Tất cả
              </button>
              {categoryList.map((category) => (
                <button
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold text-white",
                    categoryFilter === category.id ? "ring-2 ring-offset-1 ring-slate-400" : "opacity-90 hover:opacity-100",
                  )}
                  key={category.id}
                  onClick={() => setCategoryFilter(category.id)}
                  style={{ backgroundColor: category.color }}
                  type="button"
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 max-h-[36rem] space-y-4 overflow-y-auto pr-1">
            {grouped.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">Không có sự kiện khớp bộ lọc.</p>
            ) : (
              grouped.map(([month, items]) => (
                <div key={month}>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tháng {month}</p>
                  <ul className="mt-2 space-y-2">
                    {items.map((item) => {
                      const status = eventStatus(item.date, today);
                      const highlighted = highlightDay === item.date;
                      return (
                        <li key={item.id}>
                          <button
                            className={cn(
                              "w-full rounded-lg border px-3 py-2.5 text-left transition",
                              highlighted ? "border-amber-400 bg-amber-50" : "border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white",
                            )}
                            id={`event-card-${item.id}`}
                            onClick={() => openEdit(item)}
                            type="button"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-slate-800 ring-1 ring-slate-200">
                                {item.date.slice(8, 10)}/{item.date.slice(5, 7)}
                                <span className="ml-1 font-medium text-slate-500">{lunarLabelFromDateKey(item.date)} ÂL</span>
                              </span>
                              {item.category ? (
                                <span
                                  className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                                  style={{ backgroundColor: item.category.color }}
                                >
                                  {item.category.label}
                                </span>
                              ) : null}
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                  status === "done" ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-800",
                                )}
                              >
                                {status === "done" ? "Đã diễn ra" : "Dự kiến"}
                              </span>
                            </div>
                            <p className="mt-1.5 text-sm font-bold text-slate-950">{item.text}</p>
                            {item.note ? <p className="mt-0.5 text-xs text-slate-500">{item.note}</p> : null}
                            {item.budgetAmount != null ? (
                              <p className="mt-0.5 text-xs font-semibold text-amber-800">Dự trù {currency(item.budgetAmount)}</p>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="max-h-[44rem] space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          {Array.from({ length: 12 }, (_, index) => {
            const month = index + 1;
            const monthKey = `${year}-${String(month).padStart(2, "0")}`;
            const cells = buildMonthCells(monthKey);
            const monthActive = monthFilter === month;
            return (
              <div
                className={cn("rounded-md border p-2", monthActive ? "border-amber-300 bg-amber-50/40" : "border-slate-100")}
                key={monthKey}
              >
                <button
                  className="mb-1 w-full text-left text-xs font-bold text-slate-800 hover:text-amber-800"
                  onClick={() => clickMonth(month)}
                  type="button"
                >
                  Tháng {month}
                </button>
                <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-semibold text-slate-400">
                  {WEEKDAY_HEADERS.map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>
                <div className="mt-0.5 grid grid-cols-7 gap-0.5">
                  {cells.map((cell) => {
                    const dayEvents = eventsByDate.get(cell.dateKey) ?? [];
                    const selected = highlightDay === cell.dateKey;
                    return (
                      <button
                        className={cn(
                          "relative min-h-[1.7rem] rounded px-0.5 py-0.5 text-[10px] leading-none",
                          !cell.inMonth && "opacity-30",
                          selected ? "bg-amber-200 font-bold" : cell.dateKey === today ? "bg-sky-50 font-semibold" : "hover:bg-slate-50",
                        )}
                        key={cell.dateKey}
                        onClick={() => clickDay(cell.dateKey, cell.inMonth, month)}
                        title={dayEvents.map((item) => item.text).join(" · ") || undefined}
                        type="button"
                      >
                        {cell.solarDay}
                        {dayEvents.length > 0 ? (
                          <span className="mt-0.5 flex justify-center gap-0.5">
                            {dayEvents.slice(0, 3).map((item) => (
                              <span
                                className="h-1 w-1 rounded-full"
                                key={item.id}
                                style={{ backgroundColor: item.category?.color || "#6B7280" }}
                              />
                            ))}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
          <button className="absolute inset-0 bg-slate-950/40" onClick={() => !busy && setFormOpen(false)} type="button" />
          <form
            className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
            onSubmit={saveForm}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{form.id ? "Sửa sự kiện" : "Thêm sự kiện"}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-950">{form.date ? lunarFullLabelFromDateKey(form.date) : "Chọn ngày"}</h3>
              </div>
              <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-500" onClick={() => setFormOpen(false)} type="button">
                <Icon className="h-4 w-4" name="x" />
              </button>
            </div>

            <label className="mt-4 block text-xs font-semibold text-slate-600">
              Ngày
              <input
                className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                type="date"
                value={form.date}
              />
            </label>
            <label className="mt-3 block text-xs font-semibold text-slate-600">
              Tiêu đề
              <input
                className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))}
                required
                value={form.text}
              />
            </label>
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-600">Danh mục</p>
              <div className="mt-1 flex gap-2">
                <select
                  className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm"
                  onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                  value={form.categoryId}
                >
                  {categoryList.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <button
                  className="h-10 shrink-0 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setNewCatOpen((open) => !open)}
                  type="button"
                >
                  + Danh mục
                </button>
              </div>
              {newCatOpen ? (
                <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <input
                    className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                    onChange={(event) => setNewCatLabel(event.target.value)}
                    placeholder="Tên danh mục mới"
                    value={newCatLabel}
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        className={cn("h-6 w-6 rounded-full", newCatColor === color ? "ring-2 ring-offset-1 ring-slate-500" : "")}
                        key={color}
                        onClick={() => setNewCatColor(color)}
                        style={{ backgroundColor: color }}
                        type="button"
                      />
                    ))}
                  </div>
                  <button
                    className="mt-2 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                    disabled={busy}
                    onClick={() => void createCategory()}
                    type="button"
                  >
                    Lưu danh mục
                  </button>
                </div>
              ) : null}
            </div>
            <label className="mt-3 block text-xs font-semibold text-slate-600">
              Ghi chú
              <textarea
                className="mt-1 min-h-[4.5rem] w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                value={form.note}
              />
            </label>
            <label className="mt-3 block text-xs font-semibold text-slate-600">
              Dự trù chi phí (VND, không bắt buộc)
              <input
                className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                inputMode="numeric"
                onChange={(event) => setForm((current) => ({ ...current, budgetAmount: event.target.value }))}
                placeholder="VD: 5000000"
                value={form.budgetAmount}
              />
            </label>

            {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}

            <div className="mt-5 flex items-center justify-between gap-3">
              {form.id ? (
                <button
                  className="text-sm font-semibold text-rose-600 hover:text-rose-800"
                  disabled={busy}
                  onClick={() => void removeEvent(form.id!)}
                  type="button"
                >
                  Xóa
                </button>
              ) : (
                <span />
              )}
              <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy} type="submit">
                {busy ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function MiniStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "sky" | "slate" | "amber";
}) {
  const toneClass = {
    sky: "bg-sky-50 text-sky-700",
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-50 text-amber-800",
  }[tone];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={cn("mt-1 inline-flex rounded-md px-2 py-0.5 text-2xl font-bold", toneClass)}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
