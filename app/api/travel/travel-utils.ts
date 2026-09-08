import { z } from "zod";
import { isProvinceCode, TRAVEL_PROVINCE_TOTAL } from "@/lib/travel/provinces";
import { MAP_HEIGHT, MAP_WIDTH } from "@/lib/travel/map-view";

export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const provinceCodeSchema = z.string().refine((code) => isProvinceCode(code), {
  message: "Unknown province code.",
});

export const visitSchema = z.object({
  visitedOn: dateKeySchema,
  note: z.string().trim().min(1),
});

export const destinationSchema = z.object({
  provinceCode: provinceCodeSchema,
  name: z.string().trim().min(1).max(120),
  svgX: z.number().finite().min(0).max(MAP_WIDTH),
  svgY: z.number().finite().min(0).max(MAP_HEIGHT),
  visitedOn: dateKeySchema,
  note: z.string().trim().min(1),
});

export const destinationPatchSchema = destinationSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Empty update." },
);

export function dateFromInput(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export function formatDateKey(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toVisitResponse(visit: {
  id: string;
  provinceCode: string;
  visitedOn: Date;
  note: string;
}) {
  return {
    id: visit.id,
    provinceCode: visit.provinceCode,
    visitedOn: formatDateKey(visit.visitedOn),
    note: visit.note,
  };
}

export function toDestinationResponse(destination: {
  id: string;
  provinceCode: string;
  name: string;
  svgX: number;
  svgY: number;
  visitedOn: Date;
  note: string;
}) {
  return {
    id: destination.id,
    provinceCode: destination.provinceCode,
    name: destination.name,
    svgX: destination.svgX,
    svgY: destination.svgY,
    visitedOn: formatDateKey(destination.visitedOn),
    note: destination.note,
  };
}

export function travelStats(visitedCodes: Iterable<string>) {
  const visited = new Set(visitedCodes).size;
  const percent = TRAVEL_PROVINCE_TOTAL === 0 ? 0 : Math.round((visited / TRAVEL_PROVINCE_TOTAL) * 100);
  return { visited, total: TRAVEL_PROVINCE_TOTAL, percent };
}
