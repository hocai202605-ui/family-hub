"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchGrowthYear, type GrowthYearResponse } from "@/lib/growth-api";
import { vietnamToday } from "@/lib/vietnam-date";
import { Icon } from "./icons";

type FamilyMember = "CK" | "VK" | "CON";
type HabitColor = "amber" | "emerald" | "sky" | "violet" | "rose" | "slate";

const memberMeta: Record<FamilyMember, { role: string; badge: string }> = {
  CK: { role: "Chồng", badge: "bg-blue-50 text-blue-700 ring-blue-100" },
  VK: { role: "Vợ", badge: "bg-pink-50 text-pink-700 ring-pink-100" },
  CON: { role: "Con", badge: "bg-lime-50 text-lime-700 ring-lime-100" },
};

const habitBar: Record<HabitColor, string> = {
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  slate: "bg-slate-500",
};

const emptyYear: GrowthYearResponse = {
  member: "CK",
  year: "",
  months: [],
  habits: [],
  events: [],
  summary: { habitDone: 0, habitTotal: 0, eventCount: 0, logDays: 0, planDone: 0, planTotal: 0 },
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function percent(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

function formatDay(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function YearlyCalendarDashboard({ defaultMember }: { defaultMember: FamilyMember }) {
  const currentYear = vietnamToday().slice(0, 4);
  const [year, setYear] = useState(currentYear);
  const [member] = useState<FamilyMember>(defaultMember);
  const [data, setData] = useState<GrowthYearResponse>(emptyYear);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
        const next = await fetchGrowthYear(year, member);
        if (!cancelled) setData(next);
      } catch (error) {
        if (!cancelled) {
          setData({ ...emptyYear, year, member });
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
  }, [year, member]);

  const months = data.months.length === 12 ? data.months : Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    monthKey: `${year}-${String(index + 1).padStart(2, "0")}`,
    habitDone: 0,
    habitTotal: 0,
    eventCount: 0,
    logDays: 0,
    planDone: 0,
    planTotal: 0,
  }));

  const habitPercent = percent(data.summary.habitDone, data.summary.habitTotal);
  const planPercent = percent(data.summary.planDone, data.summary.planTotal);

  const eventsByMonth = useMemo(() => {
    const groups: Array<{ month: number; items: GrowthYearResponse["events"] }> = [];
    for (let month = 1; month <= 12; month += 1) {
      const prefix = `${year}-${String(month).padStart(2, "0")}`;
      const items = data.events.filter((event) => event.date.startsWith(prefix));
      if (items.length > 0) groups.push({ month, items });
    }
    return groups;
  }, [data.events, year]);

  return (
    <div className="flex w-full flex-col gap-6 px-2.5 py-4 sm:py-5">
      <header className="rounded-lg border border-amber-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-700">Lịch & Sự kiện</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950">Báo cáo năm {year}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Tổng hợp thói quen, nhật ký ngày, kế hoạch và sự kiện trong cả năm.
            </p>
            {loadError ? <p className="mt-2 text-sm font-semibold text-rose-600">{loadError}</p> : null}
            {isLoading ? <p className="mt-2 text-sm font-medium text-slate-500">Đang tải báo cáo năm…</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex w-fit items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ring-1 ring-inset",
                memberMeta[member].badge,
              )}
            >
              <span className="h-2 w-2 rounded-full bg-current opacity-70" />
              {member} · {memberMeta[member].role}
            </span>
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
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon="check"
          label="Thói quen hoàn thành"
          tone="emerald"
          value={`${habitPercent}%`}
          hint={`${data.summary.habitDone}/${data.summary.habitTotal} ô`}
        />
        <StatCard
          icon="calendar"
          label="Sự kiện trong năm"
          tone="sky"
          value={String(data.summary.eventCount)}
          hint="Ghi chú trên lịch tháng"
        />
        <StatCard
          icon="edit"
          label="Ngày có nhật ký"
          tone="violet"
          value={String(data.summary.logDays)}
          hint="Ngày đã ghi Top 5, tick hoặc suy ngẫm"
        />
        <StatCard
          icon="target"
          label="Kế hoạch hoàn thành"
          tone="amber"
          value={`${planPercent}%`}
          hint={`${data.summary.planDone}/${data.summary.planTotal} mục`}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Thói quen theo tháng</h2>
          <p className="mt-1 text-xs text-slate-500">Tỷ lệ ô đã tích so với số ngày đã qua trong từng tháng.</p>
          <div className="mt-6 flex h-64 w-full gap-2">
            <div className="flex h-full w-8 shrink-0 flex-col justify-between pb-6 text-right text-[10px] font-medium text-slate-400">
              <span>100%</span>
              <span>50%</span>
              <span>0%</span>
            </div>
            <div className="relative flex flex-1 items-end justify-between gap-1 pb-6">
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-6">
                <div className="w-full border-t border-slate-200" />
                <div className="w-full border-t border-dashed border-slate-200" />
                <div className="mb-px w-full border-t border-slate-200" />
              </div>
              {months.map((row) => {
                const value = percent(row.habitDone, row.habitTotal);
                return (
                  <div className="group relative z-10 flex h-full w-full flex-col items-center justify-end" key={row.month}>
                    <span className="mb-1 text-[9px] font-semibold text-slate-500">{value > 0 ? `${value}%` : ""}</span>
                    <div
                      className="w-full max-w-[24px] rounded-t bg-emerald-500 transition group-hover:bg-emerald-600"
                      style={{ height: `${Math.max(value, value > 0 ? 4 : 0.5)}%` }}
                    />
                    <span className="mt-1 text-[10px] font-medium text-slate-500">T{row.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Từng thói quen trong năm</h2>
          <p className="mt-1 text-xs text-slate-500">Gộp theo tên thói quen trên tất cả các tháng.</p>
          <div className="mt-4 space-y-3">
            {data.habits.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Chưa có thói quen nào trong năm này.</p>
            ) : (
              data.habits.map((habit) => {
                const value = percent(habit.done, habit.total);
                const bar = habitBar[habit.color as HabitColor] ?? habitBar.slate;
                return (
                  <div key={habit.name}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <p className="font-medium text-slate-800">{habit.name}</p>
                      <p className="shrink-0 text-xs font-semibold text-slate-600">
                        {habit.done}/{habit.total} · {value}%
                      </p>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={cn("h-full rounded-full", bar)} style={{ width: `${value}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Nhật ký & kế hoạch theo tháng</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[22rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="pb-2 font-semibold">Tháng</th>
                  <th className="pb-2 text-right font-semibold">Nhật ký</th>
                  <th className="pb-2 text-right font-semibold">Sự kiện</th>
                  <th className="pb-2 text-right font-semibold">Kế hoạch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {months.map((row) => (
                  <tr className="text-slate-700" key={row.month}>
                    <td className="py-2 font-medium">Tháng {row.month}</td>
                    <td className="py-2 text-right">{row.logDays}</td>
                    <td className="py-2 text-right">{row.eventCount}</td>
                    <td className="py-2 text-right">
                      {row.planTotal > 0 ? `${row.planDone}/${row.planTotal}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Sự kiện trong năm</h2>
          {eventsByMonth.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Chưa có sự kiện nào trong năm này.</p>
          ) : (
            <div className="mt-4 max-h-[28rem] space-y-4 overflow-y-auto pr-1">
              {eventsByMonth.map((group) => (
                <div key={group.month}>
                  <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Tháng {group.month}</p>
                  <ul className="mt-2 space-y-1.5">
                    {group.items.map((event) => (
                      <li className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2" key={event.id}>
                        <p className="text-sm font-semibold text-slate-900">{event.text}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{formatDay(event.date)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: "check" | "calendar" | "edit" | "target";
  label: string;
  value: string;
  hint: string;
  tone: "emerald" | "sky" | "violet" | "amber";
}) {
  const toneClass = {
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={cn("grid h-10 w-10 place-items-center rounded-lg", toneClass)}>
          <Icon className="h-5 w-5" name={icon} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
      </div>
    </div>
  );
}
