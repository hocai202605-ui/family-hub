"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchGrowthEventsYear, type GrowthEvent, type GrowthEventCategory } from "@/lib/growth-api";
import { vietnamToday } from "@/lib/vietnam-date";
import { YearlyEventsPanel } from "./yearly-events-panel";

export function FamilyEventsDashboard() {
  const currentYear = vietnamToday().slice(0, 4);
  const [year, setYear] = useState(currentYear);
  const [events, setEvents] = useState<GrowthEvent[]>([]);
  const [categories, setCategories] = useState<GrowthEventCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const availableYears = useMemo(() => {
    const y = Number(currentYear);
    return [y - 2, y - 1, y, y + 1].map(String);
  }, [currentYear]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const next = await fetchGrowthEventsYear(year);
      setEvents(next.events ?? []);
      setCategories(next.categories ?? []);
    } catch (error) {
      setEvents([]);
      setCategories([]);
      setLoadError(error instanceof Error ? error.message : "Không tải được sự kiện.");
    } finally {
      setIsLoading(false);
    }
  }, [year]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex w-full flex-col gap-6 px-2.5 py-4 sm:py-5">
      <header className="rounded-lg border border-amber-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-700">Lịch & Sự kiện</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950">Sự kiện gia đình</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Theo dõi cưới hỏi, giỗ chạp, sinh nhật và các sự kiện khác trên lịch 12 tháng.
            </p>
            {loadError ? <p className="mt-2 text-sm font-semibold text-rose-600">{loadError}</p> : null}
            {isLoading ? <p className="mt-2 text-sm font-medium text-slate-500">Đang tải sự kiện…</p> : null}
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <span>Chọn năm</span>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
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

      <YearlyEventsPanel categories={categories} events={events} onChanged={() => void load()} year={year} />
    </div>
  );
}
