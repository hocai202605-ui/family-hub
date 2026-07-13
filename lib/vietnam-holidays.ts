import { solarToLunar } from "@/lib/lunar-date";

export type VietnamHoliday = {
  date: string;
  name: string;
  kind: "solar" | "lunar";
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function dateKey(y: number, m: number, d: number) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Fixed solar (dương lịch) public / national days. */
const SOLAR_HOLIDAYS: Array<{ month: number; day: number; name: string }> = [
  { month: 1, day: 1, name: "Tết Dương lịch" },
  { month: 2, day: 14, name: "Valentine" },
  { month: 3, day: 8, name: "Quốc tế Phụ nữ" },
  { month: 4, day: 30, name: "Giải phóng miền Nam" },
  { month: 5, day: 1, name: "Quốc tế Lao động" },
  { month: 6, day: 1, name: "Quốc tế Thiếu nhi" },
  { month: 9, day: 2, name: "Quốc khánh" },
  { month: 10, day: 20, name: "Phụ nữ Việt Nam" },
  { month: 11, day: 20, name: "Nhà giáo Việt Nam" },
  { month: 12, day: 22, name: "Quân đội Nhân dân" },
  { month: 12, day: 24, name: "Giáng sinh (đêm)" },
  { month: 12, day: 25, name: "Giáng sinh" },
];

/** Major lunar (âm lịch) festivals — matched by lunar day/month (non-leap month preferred). */
const LUNAR_HOLIDAYS: Array<{ month: number; day: number; name: string; days?: number }> = [
  { month: 1, day: 1, name: "Tết Nguyên Đán", days: 3 }, // mùng 1–3
  { month: 1, day: 15, name: "Rằm tháng Giêng" },
  { month: 3, day: 10, name: "Giỗ Tổ Hùng Vương" },
  { month: 5, day: 5, name: "Tết Đoan Ngọ" },
  { month: 7, day: 15, name: "Vu Lan / Rằm tháng 7" },
  { month: 8, day: 15, name: "Tết Trung Thu" },
  { month: 12, day: 23, name: "Ông Táo" },
];

/**
 * All Vietnamese holidays falling in a solar month `YYYY-MM`.
 * Lunar festivals are derived via solar→lunar conversion.
 */
export function holidaysInMonth(monthKey: string): VietnamHoliday[] {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return [];

  const result: VietnamHoliday[] = [];
  const daysInMonth = new Date(y, m, 0).getDate();

  for (const h of SOLAR_HOLIDAYS) {
    if (h.month === m) {
      result.push({
        date: dateKey(y, m, h.day),
        name: h.name,
        kind: "solar",
      });
    }
  }

  for (let d = 1; d <= daysInMonth; d += 1) {
    const lunar = solarToLunar(d, m, y);
    if (lunar.leap) continue; // skip leap-month festival duplicates for simplicity

    for (const h of LUNAR_HOLIDAYS) {
      if (lunar.month !== h.month) continue;
      const span = h.days ?? 1;
      if (lunar.day >= h.day && lunar.day < h.day + span) {
        const label =
          span > 1 && lunar.day > h.day ? `${h.name} (mùng ${lunar.day})` : h.name;
        result.push({
          date: dateKey(y, m, d),
          name: label,
          kind: "lunar",
        });
      }
    }
  }

  // Sort + de-dupe by date+name
  const seen = new Set<string>();
  return result
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
    .filter((item) => {
      const key = `${item.date}|${item.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function holidaysByDateInMonth(monthKey: string): Map<string, VietnamHoliday[]> {
  const map = new Map<string, VietnamHoliday[]>();
  for (const holiday of holidaysInMonth(monthKey)) {
    const list = map.get(holiday.date) ?? [];
    list.push(holiday);
    map.set(holiday.date, list);
  }
  return map;
}

/** Holidays on a single solar date (scans that month). */
export function holidaysOnDate(dateKey: string): VietnamHoliday[] {
  const monthKey = dateKey.slice(0, 7);
  return holidaysByDateInMonth(monthKey).get(dateKey) ?? [];
}
