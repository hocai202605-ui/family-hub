import { NextRequest, NextResponse } from "next/server";
import { requireApiAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FETCH_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
};

type CcqQuote = {
  symbol: string;
  name: string;
  price: number;
  asOf: string | null;
  kind: "nav" | "last";
};

function jsonError(message: string, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function asFinitePrice(value: unknown) {
  const price = typeof value === "number" ? value : Number(value);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function parseVndAmount(raw: string) {
  const trimmed = raw.trim();
  const lastComma = trimmed.lastIndexOf(",");
  const lastDot = trimmed.lastIndexOf(".");
  if (lastComma > lastDot) {
    return asFinitePrice(trimmed.replace(/\./g, "").replace(",", "."));
  }
  return asFinitePrice(trimmed.replace(/,/g, ""));
}

function hosePriceToVnd(raw: number) {
  return raw < 1000 ? raw * 1000 : raw;
}

function toIsoDate(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const parsed = new Date(ms);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  }
  if (typeof value !== "string" || !value.trim()) return null;
  if (/^\d+$/.test(value.trim())) return toIsoDate(Number(value.trim()));
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

async function fetchDcdsFromFmarket(): Promise<CcqQuote | null> {
  const response = await fetch("https://api.fmarket.vn/res/products/filter", {
    method: "POST",
    headers: {
      ...FETCH_HEADERS,
      "Content-Type": "application/json",
      Origin: "https://fmarket.vn",
      Referer: "https://fmarket.vn/",
    },
    body: JSON.stringify({
      types: ["NEW_FUND", "TRADING_FUND"],
      issuerIds: [],
      sortOrder: "DESC",
      sortField: "navTo6Months",
      page: 1,
      pageSize: 100,
      isIpo: false,
      fundAssetTypes: [],
      bondRemainPeriods: [],
      searchField: "DCDS",
      isBuyByReward: false,
      thirdAppIds: [],
    }),
    cache: "no-store",
  });

  if (!response.ok) return null;

  const payload = await response.json();
  const rows = Array.isArray(payload?.data?.rows) ? payload.data.rows : [];
  const row = rows.find((item: { shortName?: string; code?: string }) => {
    const shortName = String(item?.shortName ?? "").toUpperCase();
    const code = String(item?.code ?? "").toUpperCase();
    return shortName === "DCDS" || code === "DCDS";
  });

  const price = asFinitePrice(row?.nav);
  if (!price) return null;

  return {
    symbol: "DCDS",
    name: "CCQ CP DCDS",
    price,
    asOf: toIsoDate(row?.productNavChange?.updateAt) ?? toIsoDate(row?.navUpdateAt),
    kind: "nav",
  };
}

async function fetchDcdsFromCafef(): Promise<CcqQuote | null> {
  const response = await fetch("https://cafef.vn/du-lieu/chung-chi-quy/DCDS.chn", {
    headers: {
      ...FETCH_HEADERS,
      Accept: "text/html,application/xhtml+xml",
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) return null;

  const html = await response.text();
  const match =
    html.match(/Giá gần nhất[\s\S]{0,240}?([\d.]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*đ/i) ??
    html.match(/([\d]{2,3}[.,]\d{3}(?:[.,]\d{2})?)\s*đ/);

  if (!match) return null;

  const price = parseVndAmount(match[1]);
  if (!price || price < 1000) return null;

  const dateMatch = html.match(/Cập nhật ngày\s*(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/i);
  const asOf = dateMatch
    ? `${dateMatch[3]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`
    : null;

  return {
    symbol: "DCDS",
    name: "CCQ CP DCDS",
    price,
    asOf,
    kind: "nav",
  };
}

async function fetchEtfFromVps(): Promise<CcqQuote | null> {
  const response = await fetch("https://bgapidatafeed.vps.com.vn/getliststockdata/E1VFVN30", {
    headers: FETCH_HEADERS,
    next: { revalidate: 300 },
  });

  if (!response.ok) return null;

  const payload = await response.json();
  const row = Array.isArray(payload) ? payload[0] : null;
  const raw = asFinitePrice(row?.lastPrice);
  if (!raw) return null;

  return {
    symbol: "E1VFVN30",
    name: "CCQ ETF VN30",
    price: hosePriceToVnd(raw),
    asOf: null,
    kind: "last",
  };
}

async function fetchEtfFromCafef(): Promise<CcqQuote | null> {
  const response = await fetch(
    "https://cafef.vn/du-lieu/ajax/pagenew/datahistory/pricehistory.ashx?Symbol=E1VFVN30&PageIndex=1&PageSize=1",
    {
      headers: {
        ...FETCH_HEADERS,
        Referer: "https://cafef.vn/",
      },
      next: { revalidate: 300 },
    },
  );

  if (!response.ok) return null;

  const payload = await response.json();
  const row = payload?.Data?.Data?.[0];
  const raw = asFinitePrice(row?.GiaDongCua);
  if (!raw) return null;

  const [day, month, year] = String(row?.Ngay ?? "").split("/");
  const asOf = year && month && day ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}` : null;

  return {
    symbol: "E1VFVN30",
    name: "CCQ ETF VN30",
    price: hosePriceToVnd(raw),
    asOf,
    kind: "last",
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request, "investments");
  if ("response" in auth) return auth.response;

  try {
    const [dcdsPrimary, etfPrimary] = await Promise.all([
      fetchDcdsFromFmarket().catch(() => null),
      fetchEtfFromVps().catch(() => null),
    ]);

    const dcds = dcdsPrimary ?? (await fetchDcdsFromCafef().catch(() => null));
    const etfVn30 = etfPrimary ?? (await fetchEtfFromCafef().catch(() => null));

    if (!dcds && !etfVn30) {
      return jsonError("Không lấy được giá chứng chỉ quỹ.");
    }

    return NextResponse.json({
      success: true,
      data: { dcds, etfVn30 },
    });
  } catch {
    return jsonError("Đã có lỗi xảy ra khi lấy giá chứng chỉ quỹ.");
  }
}
