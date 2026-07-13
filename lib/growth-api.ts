export type GrowthMember = "CK" | "VK" | "CON";

export type GrowthHabitDef = {
  id: string;
  name: string;
  color: string;
};

export type GrowthPlanItem = {
  id: string;
  text: string;
  isCompleted: boolean;
};

export type GrowthTop5Task = {
  id: string;
  text: string;
  isCompleted: boolean;
};

export type GrowthTickNote = {
  id: string;
  text: string;
  isCompleted: boolean;
};

export type GrowthDailyLog = {
  date: string;
  dayLabel: string;
  top5Tasks: GrowthTop5Task[];
  tickNotes: GrowthTickNote[];
  reflection: string;
};

export type GrowthWeekData = {
  weekStart: string;
  habitChecks: Record<string, boolean[]>;
  weeklyPlan: GrowthPlanItem[];
  weeklyLog: GrowthDailyLog[];
};

export type GrowthMonthData = {
  monthlyPlan: GrowthPlanItem[];
  habits: GrowthHabitDef[];
  weeks: Record<string, GrowthWeekData>;
};

export type GrowthMonthResponse = {
  member: GrowthMember;
  month: string;
  habits: GrowthHabitDef[];
  months: Record<string, GrowthMonthData>;
  events: Array<{ id: string; date: string; text: string }>;
};

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${response.status})`);
  }
  return data;
}

export async function fetchGrowthMonth(month: string, member: GrowthMember) {
  const response = await fetch(
    `/api/growth?month=${encodeURIComponent(month)}&member=${encodeURIComponent(member)}`,
  );
  return parseJson<GrowthMonthResponse>(response);
}

export async function apiCreateHabit(body: {
  member: GrowthMember;
  month: string;
  name: string;
  color?: string;
}) {
  const response = await fetch("/api/growth/habits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson<{ habit: GrowthHabitDef }>(response);
}

export async function apiUpdateHabit(
  id: string,
  body: { name?: string; color?: string },
) {
  const response = await fetch(`/api/growth/habits/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson<{ habit: GrowthHabitDef }>(response);
}

export async function apiDeleteHabit(id: string) {
  const response = await fetch(`/api/growth/habits/${id}`, { method: "DELETE" });
  return parseJson<{ ok: boolean }>(response);
}

export async function apiPutHabitCheck(body: {
  habitId: string;
  weekStart: string;
  dayIndex: number;
  completed: boolean;
}) {
  const response = await fetch("/api/growth/habit-checks", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson<{ check: { id: string; completed: boolean } }>(response);
}

export async function apiCreatePlanItem(body: {
  member: GrowthMember;
  scope: "week" | "month";
  month: string;
  weekStart?: string | null;
  text: string;
}) {
  const response = await fetch("/api/growth/plan-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson<{ item: GrowthPlanItem }>(response);
}

export async function apiUpdatePlanItem(
  id: string,
  body: { text?: string; isCompleted?: boolean },
) {
  const response = await fetch(`/api/growth/plan-items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson<{ item: GrowthPlanItem }>(response);
}

export async function apiDeletePlanItem(id: string) {
  const response = await fetch(`/api/growth/plan-items/${id}`, { method: "DELETE" });
  return parseJson<{ ok: boolean }>(response);
}

export async function apiUpsertDailyLog(body: {
  member: GrowthMember;
  date: string;
  reflection?: string;
  top5Tasks?: GrowthTop5Task[];
}) {
  const response = await fetch("/api/growth/daily-logs", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson<{ dailyLog: GrowthDailyLog & { id: string } }>(response);
}

export async function apiCreateTickNote(body: {
  member: GrowthMember;
  date: string;
  text: string;
}) {
  const response = await fetch("/api/growth/tick-notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson<{ note: GrowthTickNote }>(response);
}

export async function apiUpdateTickNote(
  id: string,
  body: { text?: string; isCompleted?: boolean },
) {
  const response = await fetch(`/api/growth/tick-notes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson<{ note: GrowthTickNote }>(response);
}

export async function apiDeleteTickNote(id: string) {
  const response = await fetch(`/api/growth/tick-notes/${id}`, { method: "DELETE" });
  return parseJson<{ ok: boolean }>(response);
}

export async function apiCreateEvent(body: {
  member: GrowthMember;
  date: string;
  text: string;
}) {
  const response = await fetch("/api/growth/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson<{ event: { id: string; date: string; text: string } }>(response);
}

export async function apiDeleteEvent(id: string) {
  const response = await fetch(`/api/growth/events/${id}`, { method: "DELETE" });
  return parseJson<{ ok: boolean }>(response);
}
