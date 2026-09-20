/** Display dates as `dd/mm/yyyy` regardless of OS/browser locale. Storage stays `YYYY-MM-DD`. */

function pad2(n: number | string) {
  return String(n).padStart(2, "0");
}

function isValidYmd(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** `20/09/2026` from `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`. */
export function formatDisplayDate(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/** `20/09/2026 14:30` from `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`. */
export function formatDisplayDateTime(value: string) {
  const date = formatDisplayDate(value);
  const time = value.match(/T(\d{2}):(\d{2})/);
  if (!time) return date;
  return `${date} ${time[1]}:${time[2]}`;
}

/** Parse `dd/mm/yyyy`, `d/m/yyyy`, or `YYYY-MM-DD` → `YYYY-MM-DD`. */
export function parseDisplayDate(text: string) {
  const value = text.trim();
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    return isValidYmd(year, month, day) ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
  }

  const dmy = value.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (!dmy) return null;
  const day = Number(dmy[1]);
  const month = Number(dmy[2]);
  const year = Number(dmy[3]);
  if (!isValidYmd(year, month, day)) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Parse `dd/mm/yyyy HH:mm` or ISO datetime → `YYYY-MM-DDTHH:mm`. */
export function parseDisplayDateTime(text: string) {
  const value = text.trim();
  const iso = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})$/);
  if (iso) {
    const date = parseDisplayDate(iso[1]);
    if (!date) return null;
    return `${date}T${pad2(iso[2])}:${iso[3]}`;
  }

  const dmy = value.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/);
  if (!dmy) {
    const dateOnly = parseDisplayDate(value);
    return dateOnly ? `${dateOnly}T00:00` : null;
  }

  const date = parseDisplayDate(`${dmy[1]}/${dmy[2]}/${dmy[3]}`);
  if (!date) return null;
  const hour = dmy[4] != null ? Number(dmy[4]) : 0;
  const minute = dmy[5] != null ? Number(dmy[5]) : 0;
  if (hour > 23 || minute > 59) return null;
  return `${date}T${pad2(hour)}:${pad2(minute)}`;
}
