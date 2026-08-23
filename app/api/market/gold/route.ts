import { NextRequest, NextResponse } from "next/server";
import { requireApiAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FETCH_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
};

type GoldQuote = {
  timestamp?: number | string;
  date?: string;
  ring: { name: string; buy: number; sell: number };
  piece: { name: string; buy: number; sell: number };
};

function jsonError(message: string, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function asPositiveNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Normalize to VND per lượng (10 chỉ). */
function toVndPerLuong(raw: number) {
  if (raw >= 10_000_000) return raw;
  if (raw >= 100_000) return raw * 1000;
  if (raw >= 80 && raw < 300) return raw * 1_000_000;
  return raw;
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function fetchVangToday(): Promise<GoldQuote | null> {
  const response = await fetch("https://www.vang.today/api/prices", {
    headers: FETCH_HEADERS,
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = (await readJson(response)) as {
    timestamp?: number;
    date?: string;
    prices?: Record<string, { buy?: number; sell?: number }>;
  } | null;
  const ring = data?.prices?.SJ9999;
  const piece = data?.prices?.SJL1L10;
  const ringBuy = asPositiveNumber(ring?.buy);
  const ringSell = asPositiveNumber(ring?.sell);
  if (!ringBuy || !ringSell) return null;

  return {
    timestamp: data?.timestamp,
    date: data?.date,
    ring: { name: "Vàng nhẫn SJC 99,99", buy: toVndPerLuong(ringBuy), sell: toVndPerLuong(ringSell) },
    piece: {
      name: "Vàng miếng SJC",
      buy: toVndPerLuong(asPositiveNumber(piece?.buy) ?? 0) || 0,
      sell: toVndPerLuong(asPositiveNumber(piece?.sell) ?? 0) || 0,
    },
  };
}

async function fetchGiavangNow(): Promise<GoldQuote | null> {
  const response = await fetch("https://giavang.now/api/prices", {
    headers: FETCH_HEADERS,
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = (await readJson(response)) as {
    current_time?: number;
    data?: Array<{ type_code?: string; buy?: number; sell?: number }>;
  } | null;
  const rows = Array.isArray(data?.data) ? data.data : [];
  const ring = rows.find((row) => row.type_code === "SJ9999");
  const piece = rows.find((row) => row.type_code === "SJL1L10");
  const ringBuy = asPositiveNumber(ring?.buy);
  const ringSell = asPositiveNumber(ring?.sell);
  if (!ringBuy || !ringSell) return null;

  return {
    timestamp: data?.current_time,
    ring: { name: "Vàng nhẫn SJC 99,99", buy: toVndPerLuong(ringBuy), sell: toVndPerLuong(ringSell) },
    piece: {
      name: "Vàng miếng SJC",
      buy: toVndPerLuong(asPositiveNumber(piece?.buy) ?? 0) || 0,
      sell: toVndPerLuong(asPositiveNumber(piece?.sell) ?? 0) || 0,
    },
  };
}

async function fetchSjcXml(): Promise<GoldQuote | null> {
  const response = await fetch("https://sjc.com.vn/xml/tygiavang.xml", {
    headers: {
      ...FETCH_HEADERS,
      Accept: "application/xml, text/xml, */*",
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const xml = await response.text();
  if (!xml.trim()) return null;

  const items = Array.from(xml.matchAll(/<item\b([^>]*)\/?>/gi));
  const parsed = items.map((match) => {
    const attrs = match[1] ?? "";
    const type = attrs.match(/\btype="([^"]+)"/i)?.[1] ?? "";
    const buy = asPositiveNumber(attrs.match(/\bbuy="([^"]+)"/i)?.[1]);
    const sell = asPositiveNumber(attrs.match(/\bsell="([^"]+)"/i)?.[1]);
    return { type, buy, sell };
  });

  const ring =
    parsed.find((item) => /nhẫn/i.test(item.type) && item.buy && item.sell) ??
    parsed.find((item) => /sjc/i.test(item.type) && item.buy && item.sell);
  if (!ring?.buy || !ring.sell) return null;

  const piece = parsed.find((item) => /miếng|1l|sjc/i.test(item.type) && item !== ring);

  return {
    ring: { name: "Vàng nhẫn SJC 99,99", buy: toVndPerLuong(ring.buy), sell: toVndPerLuong(ring.sell) },
    piece: {
      name: "Vàng miếng SJC",
      buy: toVndPerLuong(piece?.buy ?? ring.buy),
      sell: toVndPerLuong(piece?.sell ?? ring.sell),
    },
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request, "investments");
  if ("response" in auth) return auth.response;

  try {
    const quote =
      (await fetchVangToday().catch(() => null)) ??
      (await fetchGiavangNow().catch(() => null)) ??
      (await fetchSjcXml().catch(() => null));

    if (!quote) {
      return jsonError("Không lấy được giá vàng SJC.");
    }

    return NextResponse.json({
      success: true,
      data: quote,
    });
  } catch {
    return jsonError("Đã có lỗi xảy ra khi lấy giá vàng.");
  }
}
