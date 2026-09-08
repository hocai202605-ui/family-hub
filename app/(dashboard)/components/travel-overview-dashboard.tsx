"use client";

import { FormEvent, MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import { MAP_VIEWBOX } from "@/lib/travel/map-view";
import { provinceName, TRAVEL_PROVINCES } from "@/lib/travel/provinces";
import { provincePaths } from "@/lib/travel/vietnam-34-paths";
import { vietnamToday } from "@/lib/vietnam-date";
import { Icon } from "./icons";

type Visit = {
  id: string;
  provinceCode: string;
  visitedOn: string;
  note: string;
};

type Destination = {
  id: string;
  provinceCode: string;
  name: string;
  svgX: number;
  svgY: number;
  visitedOn: string;
  note: string;
};

type ProvinceRow = {
  code: string;
  name: string;
  region: "north" | "central" | "south";
  visited: boolean;
  destinationCount: number;
  visit: Visit | null;
};

type OverviewPayload = {
  provinces: ProvinceRow[];
  destinations: Destination[];
  stats: { visited: number; total: number; percent: number };
};

type Notice = { type: "success" | "error"; message: string };
type PendingFlag = { provinceCode: string; svgX: number; svgY: number };

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function dateLabel(value: string) {
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export function TravelOverviewDashboard() {
  const [provinces, setProvinces] = useState<ProvinceRow[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [stats, setStats] = useState({ visited: 0, total: 34, percent: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);

  const [plantMode, setPlantMode] = useState(false);
  const [hoverCode, setHoverCode] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [pendingFlag, setPendingFlag] = useState<PendingFlag | null>(null);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);

  const [visitDate, setVisitDate] = useState(vietnamToday());
  const [visitNote, setVisitNote] = useState("");
  const [flagName, setFlagName] = useState("");
  const [flagDate, setFlagDate] = useState(vietnamToday());
  const [flagNote, setFlagNote] = useState("");

  const provinceByCode = useMemo(() => new Map(provinces.map((row) => [row.code, row])), [provinces]);
  const selected = selectedCode ? provinceByCode.get(selectedCode) ?? null : null;
  const hoverName = hoverCode ? provinceName(hoverCode) : null;

  const selectedFlags = useMemo(
    () => destinations.filter((item) => item.provinceCode === selectedCode),
    [destinations, selectedCode],
  );

  const visitedList = useMemo(
    () => provinces.filter((row) => row.visited).sort((a, b) => a.name.localeCompare(b.name, "vi")),
    [provinces],
  );

  const load = useCallback(async () => {
    setError(null);
    const response = await fetch("/api/travel/overview");
    if (!response.ok) {
      throw new Error("Không tải được bản đồ du lịch.");
    }
    const payload = (await response.json()) as OverviewPayload;
    setProvinces(payload.provinces);
    setDestinations(payload.destinations);
    setStats(payload.stats);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Không tải được dữ liệu.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setVisitDate(vietnamToday());
      setVisitNote("");
      return;
    }
    setVisitDate(selected.visit?.visitedOn ?? vietnamToday());
    setVisitNote(selected.visit?.note ?? "");
  }, [selected]);

  function showNotice(type: Notice["type"], message: string) {
    setNotice({ type, message });
  }

  function svgPoint(event: MouseEvent<SVGSVGElement>) {
    const svg = event.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const loc = point.matrixTransform(ctm.inverse());
    return { svgX: Math.round(loc.x * 10) / 10, svgY: Math.round(loc.y * 10) / 10 };
  }

  function handleMapClick(event: MouseEvent<SVGSVGElement>) {
    const target = event.target as SVGElement | null;
    const code = target?.dataset.code;
    if (!code) return;

    if (plantMode) {
      const point = svgPoint(event);
      if (!point) return;
      setSelectedCode(code);
      setEditingDestination(null);
      setPendingFlag({ provinceCode: code, ...point });
      setFlagName("");
      setFlagDate(vietnamToday());
      setFlagNote("");
      return;
    }

    setPendingFlag(null);
    setEditingDestination(null);
    setSelectedCode(code);
  }

  async function saveVisit(event: FormEvent) {
    event.preventDefault();
    if (!selectedCode) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/travel/provinces/${selectedCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitedOn: visitDate, note: visitNote }),
      });
      if (!response.ok) {
        throw new Error("Không lưu được đánh dấu tỉnh.");
      }
      await load();
      showNotice("success", `Đã đánh dấu ${provinceName(selectedCode)}.`);
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Lỗi khi lưu.");
    } finally {
      setSaving(false);
    }
  }

  async function clearVisit() {
    if (!selectedCode) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/travel/provinces/${selectedCode}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        throw new Error("Không bỏ đánh dấu được.");
      }
      await load();
      showNotice("success", `Đã bỏ đánh dấu tỉnh ${provinceName(selectedCode)}.`);
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Lỗi khi xóa.");
    } finally {
      setSaving(false);
    }
  }

  async function saveFlag(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      if (editingDestination) {
        const response = await fetch(`/api/travel/destinations/${editingDestination.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: flagName, visitedOn: flagDate, note: flagNote }),
        });
        if (!response.ok) throw new Error("Không cập nhật được cờ.");
        await load();
        showNotice("success", `Đã cập nhật cờ ${flagName}.`);
        setEditingDestination(null);
      } else if (pendingFlag) {
        const response = await fetch("/api/travel/destinations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provinceCode: pendingFlag.provinceCode,
            name: flagName,
            svgX: pendingFlag.svgX,
            svgY: pendingFlag.svgY,
            visitedOn: flagDate,
            note: flagNote,
          }),
        });
        if (!response.ok) throw new Error("Không cắm cờ được.");
        await load();
        showNotice("success", `Đã cắm cờ ${flagName}.`);
        setPendingFlag(null);
        setPlantMode(false);
      }
      setFlagName("");
      setFlagNote("");
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Lỗi khi lưu cờ.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteFlag(id: string, name: string) {
    if (!window.confirm(`Xóa cờ “${name}”?`)) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/travel/destinations/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Không xóa được cờ.");
      await load();
      if (editingDestination?.id === id) setEditingDestination(null);
      showNotice("success", `Đã xóa cờ ${name}.`);
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Lỗi khi xóa cờ.");
    } finally {
      setSaving(false);
    }
  }

  function startEditFlag(destination: Destination) {
    setPlantMode(false);
    setPendingFlag(null);
    setSelectedCode(destination.provinceCode);
    setEditingDestination(destination);
    setFlagName(destination.name);
    setFlagDate(destination.visitedOn);
    setFlagNote(destination.note);
  }

  const flagFormOpen = Boolean(pendingFlag || editingDestination);

  return (
    <div className="flex w-full flex-col gap-6 px-2.5 py-4 sm:py-5">
      <header className="rounded-lg border border-amber-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-700">Du lịch</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950">Bản đồ đã đi</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Tô màu 34 tỉnh/thành gia đình đã đặt chân tới, và cắm cờ từng điểm đến cụ thể.
            </p>
          </div>
          <div className="min-w-[220px]">
            <p className="text-sm font-semibold text-slate-700">
              Đã đi{" "}
              <span className="text-amber-700">
                {stats.visited} / {stats.total}
              </span>{" "}
              tỉnh thành
            </p>
            <p className="mt-1 text-xs text-slate-500">{stats.percent}% Việt Nam</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-amber-400" style={{ width: `${stats.percent}%` }} />
            </div>
          </div>
        </div>
      </header>

      {notice ? (
        <p
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            notice.type === "success"
              ? "border-emerald-100 bg-emerald-50 text-emerald-800"
              : "border-rose-100 bg-rose-50 text-rose-700",
          )}
        >
          {notice.message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Bản đồ Việt Nam</h2>
              <p className="text-xs text-slate-500">
                {plantMode ? "Đang cắm cờ — click lên tỉnh để đặt cờ." : "Click một tỉnh để đánh dấu đã đi."}
              </p>
            </div>
            <button
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ring-1 ring-inset transition",
                plantMode
                  ? "bg-amber-500 text-white ring-amber-500"
                  : "bg-amber-50 text-amber-800 ring-amber-100 hover:bg-amber-100",
              )}
              onClick={() => {
                setPlantMode((value) => !value);
                setPendingFlag(null);
                setEditingDestination(null);
              }}
              type="button"
            >
              <Icon className="h-4 w-4" name="flag" />
              {plantMode ? "Đang cắm cờ" : "Cắm cờ"}
            </button>
          </div>

          <div className="relative overflow-hidden rounded-lg bg-sky-50/60 ring-1 ring-inset ring-slate-100">
            {isLoading ? (
              <p className="px-4 py-24 text-center text-sm text-slate-500">Đang tải bản đồ...</p>
            ) : (
              <svg
                className={cn("mx-auto block h-auto w-full max-w-[520px]", plantMode ? "cursor-crosshair" : "cursor-pointer")}
                onClick={handleMapClick}
                onMouseLeave={() => setHoverCode(null)}
                role="img"
                viewBox={MAP_VIEWBOX}
              >
                <title>Bản đồ 34 tỉnh thành Việt Nam</title>
                {provincePaths.map((province) => {
                  const visited = provinceByCode.get(province.code)?.visited ?? false;
                  const active = selectedCode === province.code || hoverCode === province.code;
                  return (
                    <g key={province.code}>
                      {province.d.map((d, index) => (
                        <path
                          d={d}
                          data-code={province.code}
                          fill={visited ? (active ? "#d97706" : "#fbbf24") : active ? "#cbd5e1" : "#e2e8f0"}
                          key={`${province.code}-${index}`}
                          onMouseEnter={() => setHoverCode(province.code)}
                          stroke="#fff"
                          strokeLinejoin="round"
                          strokeWidth="0.8"
                        />
                      ))}
                    </g>
                  );
                })}
                {destinations.map((destination) => (
                  <g
                    className="cursor-pointer"
                    key={destination.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      startEditFlag(destination);
                    }}
                    transform={`translate(${destination.svgX} ${destination.svgY})`}
                  >
                    <title>{destination.name}</title>
                    <path d="M0 0v16" stroke="#92400e" strokeLinecap="round" strokeWidth="1.4" />
                    <path d="M0.6 0.4h10l-2.4 3.2 2.4 3.2H0.6z" fill="#ea580c" stroke="#9a3412" strokeWidth="0.4" />
                  </g>
                ))}
              </svg>
            )}
            {hoverName ? (
              <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-100">
                {hoverName}
              </p>
            ) : null}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">
              {selected ? selected.name : "Chọn một tỉnh"}
            </h2>
            {!selected ? (
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Click trên bản đồ, hoặc bật <span className="font-semibold">Cắm cờ</span> rồi click điểm đến.
              </p>
            ) : (
              <>
                {selected.visited && !selected.visit ? (
                  <p className="mt-2 text-xs leading-5 text-amber-700">
                    Tỉnh đang tô màu vì còn {selected.destinationCount} cờ điểm đến.
                  </p>
                ) : null}

                <form className="mt-4 space-y-3" onSubmit={saveVisit}>
                  <label className="block text-xs font-semibold text-slate-600">
                    Ngày đã đến
                    <input
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      onChange={(event) => setVisitDate(event.target.value)}
                      required
                      type="date"
                      value={visitDate}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-600">
                    Ghi chú
                    <textarea
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      onChange={(event) => setVisitNote(event.target.value)}
                      placeholder="Chuyến đi gia đình, dịp lễ..."
                      required
                      rows={3}
                      value={visitNote}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                      disabled={saving}
                      type="submit"
                    >
                      {selected.visit ? "Cập nhật tỉnh" : "Đánh dấu đã đi"}
                    </button>
                    {selected.visit ? (
                      <button
                        className="rounded-md px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-50 disabled:opacity-60"
                        disabled={saving}
                        onClick={clearVisit}
                        type="button"
                      >
                        Bỏ đánh dấu
                      </button>
                    ) : null}
                  </div>
                </form>
              </>
            )}
          </section>

          {flagFormOpen ? (
            <section className="rounded-lg border border-amber-100 bg-amber-50/40 p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                {editingDestination ? "Sửa cờ" : "Cắm cờ mới"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {provinceName((editingDestination ?? pendingFlag)!.provinceCode)}
              </p>
              <form className="mt-4 space-y-3" onSubmit={saveFlag}>
                <label className="block text-xs font-semibold text-slate-600">
                  Tên điểm đến
                  <input
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                    onChange={(event) => setFlagName(event.target.value)}
                    placeholder="Sapa, Phú Quốc, phố cổ Hội An..."
                    required
                    value={flagName}
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  Ngày đã đến
                  <input
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                    onChange={(event) => setFlagDate(event.target.value)}
                    required
                    type="date"
                    value={flagDate}
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  Ghi chú
                  <textarea
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                    onChange={(event) => setFlagNote(event.target.value)}
                    required
                    rows={3}
                    value={flagNote}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                    disabled={saving}
                    type="submit"
                  >
                    {editingDestination ? "Lưu cờ" : "Cắm cờ"}
                  </button>
                  <button
                    className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-white"
                    onClick={() => {
                      setPendingFlag(null);
                      setEditingDestination(null);
                    }}
                    type="button"
                  >
                    Hủy
                  </button>
                  {editingDestination ? (
                    <button
                      className="rounded-md px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-50"
                      onClick={() => deleteFlag(editingDestination.id, editingDestination.name)}
                      type="button"
                    >
                      Xóa cờ
                    </button>
                  ) : null}
                </div>
              </form>
            </section>
          ) : null}

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Tỉnh đã đi</h2>
            {visitedList.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Chưa đánh dấu tỉnh nào. Chọn tỉnh trên bản đồ hoặc cắm cờ.</p>
            ) : (
              <ul className="mt-3 max-h-48 space-y-1 overflow-auto text-sm">
                {visitedList.map((row) => (
                  <li key={row.code}>
                    <button
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-slate-50",
                        selectedCode === row.code && "bg-amber-50 text-amber-900",
                      )}
                      onClick={() => {
                        setSelectedCode(row.code);
                        setPendingFlag(null);
                        setEditingDestination(null);
                      }}
                      type="button"
                    >
                      <span className="font-medium">{row.name}</span>
                      <span className="text-xs text-slate-400">
                        {row.destinationCount > 0 ? `${row.destinationCount} cờ` : "tỉnh"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Cờ điểm đến</h2>
            {destinations.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Chưa có cờ. Bật “Cắm cờ” rồi click lên bản đồ.</p>
            ) : (
              <ul className="mt-3 max-h-56 space-y-2 overflow-auto text-sm">
                {(selectedCode ? selectedFlags : destinations).map((destination) => (
                  <li className="rounded-md border border-slate-100 px-3 py-2" key={destination.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{destination.name}</p>
                        <p className="text-xs text-slate-500">
                          {provinceName(destination.provinceCode)} · {dateLabel(destination.visitedOn)}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">{destination.note}</p>
                      </div>
                      <button
                        className="shrink-0 text-xs font-semibold text-amber-700 hover:underline"
                        onClick={() => startEditFlag(destination)}
                        type="button"
                      >
                        Sửa
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {selectedCode && destinations.length > 0 ? (
              <button
                className="mt-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                onClick={() => setSelectedCode(null)}
                type="button"
              >
                Xem tất cả cờ
              </button>
            ) : null}
          </section>
        </aside>
      </div>

      <p className="text-center text-[11px] text-slate-400">
        {TRAVEL_PROVINCES.length} tỉnh/thành theo đơn vị hành chính từ 1/7/2025.
      </p>
    </div>
  );
}
