/** Calendar helpers in Vietnam time (UTC+7 / Asia/Ho_Chi_Minh). */

const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

/** Today's date as `YYYY-MM-DD` in Vietnam. */
export function vietnamToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Current month as `YYYY-MM` in Vietnam. */
export function vietnamCurrentMonth(now: Date = new Date()): string {
  return vietnamToday(now).slice(0, 7);
}
