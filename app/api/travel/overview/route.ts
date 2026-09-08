import { NextRequest, NextResponse } from "next/server";
import { requireApiAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TRAVEL_PROVINCES } from "@/lib/travel/provinces";
import { toDestinationResponse, toVisitResponse, travelStats } from "../travel-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request, "travel.overview");
  if ("response" in auth) return auth.response;

  const [visits, destinations] = await Promise.all([
    prisma.travelProvinceVisit.findMany({ orderBy: { visitedOn: "desc" } }),
    prisma.travelDestination.findMany({ orderBy: [{ visitedOn: "desc" }, { name: "asc" }] }),
  ]);

  const visitByCode = new Map(visits.map((visit) => [visit.provinceCode, visit]));
  const destinationCount = new Map<string, number>();
  for (const destination of destinations) {
    destinationCount.set(destination.provinceCode, (destinationCount.get(destination.provinceCode) ?? 0) + 1);
  }

  const visitedCodes = new Set<string>();
  for (const visit of visits) visitedCodes.add(visit.provinceCode);
  for (const destination of destinations) visitedCodes.add(destination.provinceCode);

  const provinces = TRAVEL_PROVINCES.map((province) => {
    const visit = visitByCode.get(province.code);
    return {
      code: province.code,
      name: province.name,
      region: province.region,
      visited: visitedCodes.has(province.code),
      destinationCount: destinationCount.get(province.code) ?? 0,
      visit: visit ? toVisitResponse(visit) : null,
    };
  });

  return NextResponse.json({
    provinces,
    visits: visits.map(toVisitResponse),
    destinations: destinations.map(toDestinationResponse),
    stats: travelStats(visitedCodes),
  });
}
