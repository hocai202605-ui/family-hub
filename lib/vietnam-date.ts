/** Calendar helpers in Vietnam time (UTC+7 / Asia/Ho_Chi_Minh). */

const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

function vietnamParts(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const map = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));

  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour,
    minute: map.minute,
  };
}

/** Today's date as `YYYY-MM-DD` in Vietnam. */
export function vietnamToday(now: Date = new Date()): string {
  const { year, month, day } = vietnamParts(now);
  return `${year}-${month}-${day}`;
}

/** Current local datetime as `YYYY-MM-DDTHH:mm` in Vietnam (for datetime-local inputs). */
export function vietnamNowDateTime(now: Date = new Date()): string {
  const { year, month, day, hour, minute } = vietnamParts(now);
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/** Current month as `YYYY-MM` in Vietnam. */
export function vietnamCurrentMonth(now: Date = new Date()): string {
  return vietnamToday(now).slice(0, 7);
}
