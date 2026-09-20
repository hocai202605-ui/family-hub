import { lunarLabelFromDateKey } from "@/lib/lunar-date";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Local calendar date key `YYYY-MM-DD` (not UTC). */
export function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function mondayOf(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export type MonthCell = {
  dateKey: string;
  inMonth: boolean;
  solarDay: number;
  lunarLabel: string;
};

/** Mon-start 5 or 6 week grid for `YYYY-MM`. */
export function buildMonthCells(monthKey: string): MonthCell[] {
  const [y, m] = monthKey.split("-").map(Number);
  const first = new Date(y, m - 1, 1, 12, 0, 0);
  const start = mondayOf(first);
  const cells: MonthCell[] = [];
  let cursor = new Date(start);
  for (let i = 0; i < 42; i += 1) {
    const dateKey = toDateKey(cursor);
    cells.push({
      dateKey,
      inMonth: cursor.getMonth() === m - 1 && cursor.getFullYear() === y,
      solarDay: cursor.getDate(),
      lunarLabel: lunarLabelFromDateKey(dateKey),
    });
    cursor = addDays(cursor, 1);
  }
  const lastWeek = cells.slice(35);
  if (lastWeek.every((cell) => !cell.inMonth)) {
    return cells.slice(0, 35);
  }
  return cells;
}

export const WEEKDAY_HEADERS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;
