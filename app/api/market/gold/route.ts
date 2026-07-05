import { NextRequest, NextResponse } from "next/server";
import { requireApiAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request, "investments");
  if ("response" in auth) return auth.response;

  try {
    const response = await fetch("https://www.vang.today/api/prices", {
      next: { revalidate: 300 }, // Cache trong 5 phút
    });

    if (!response.ok) {
      throw new Error("Không thể tải dữ liệu giá vàng từ API ngoài.");
    }

    const data = await response.json();
    const ringGold = data?.prices?.SJ9999;
    const pieceGold = data?.prices?.SJL1L10;

    if (!ringGold) {
      throw new Error("Không tìm thấy dữ liệu Vàng nhẫn SJC.");
    }

    return NextResponse.json({
      success: true,
      data: {
        timestamp: data.timestamp,
        date: data.date,
        ring: {
          name: "Vàng nhẫn SJC 99,99",
          buy: ringGold.buy,
          sell: ringGold.sell,
        },
        piece: {
          name: "Vàng miếng SJC",
          buy: pieceGold?.buy || 0,
          sell: pieceGold?.sell || 0,
        }
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Đã có lỗi xảy ra khi lấy giá vàng.",
      },
      { status: 500 }
    );
  }
}
