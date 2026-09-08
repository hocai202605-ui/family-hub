/** 34 provincial units after Nghị quyết 202/2025/QH15 (effective mid-2025). Codes are GSO/NSO unit codes. */

export type TravelProvince = {
  code: string;
  name: string;
  region: "north" | "central" | "south";
};

export const TRAVEL_PROVINCES: TravelProvince[] = [
  { code: "01", name: "Hà Nội", region: "north" },
  { code: "04", name: "Cao Bằng", region: "north" },
  { code: "08", name: "Tuyên Quang", region: "north" },
  { code: "11", name: "Điện Biên", region: "north" },
  { code: "12", name: "Lai Châu", region: "north" },
  { code: "14", name: "Sơn La", region: "north" },
  { code: "15", name: "Lào Cai", region: "north" },
  { code: "19", name: "Thái Nguyên", region: "north" },
  { code: "20", name: "Lạng Sơn", region: "north" },
  { code: "22", name: "Quảng Ninh", region: "north" },
  { code: "24", name: "Bắc Ninh", region: "north" },
  { code: "25", name: "Phú Thọ", region: "north" },
  { code: "31", name: "Hải Phòng", region: "north" },
  { code: "33", name: "Hưng Yên", region: "north" },
  { code: "37", name: "Ninh Bình", region: "north" },
  { code: "38", name: "Thanh Hóa", region: "central" },
  { code: "40", name: "Nghệ An", region: "central" },
  { code: "42", name: "Hà Tĩnh", region: "central" },
  { code: "44", name: "Quảng Trị", region: "central" },
  { code: "46", name: "Huế", region: "central" },
  { code: "48", name: "Đà Nẵng", region: "central" },
  { code: "51", name: "Quảng Ngãi", region: "central" },
  { code: "52", name: "Gia Lai", region: "central" },
  { code: "56", name: "Khánh Hòa", region: "central" },
  { code: "66", name: "Đắk Lắk", region: "central" },
  { code: "68", name: "Lâm Đồng", region: "central" },
  { code: "75", name: "Đồng Nai", region: "south" },
  { code: "79", name: "TP. Hồ Chí Minh", region: "south" },
  { code: "80", name: "Tây Ninh", region: "south" },
  { code: "82", name: "Đồng Tháp", region: "south" },
  { code: "86", name: "Vĩnh Long", region: "south" },
  { code: "91", name: "An Giang", region: "south" },
  { code: "92", name: "Cần Thơ", region: "south" },
  { code: "96", name: "Cà Mau", region: "south" },
];

export const TRAVEL_PROVINCE_TOTAL = TRAVEL_PROVINCES.length;

const provinceMap = new Map(TRAVEL_PROVINCES.map((province) => [province.code, province]));

export function isProvinceCode(code: string): boolean {
  return provinceMap.has(code);
}

export function provinceByCode(code: string): TravelProvince | undefined {
  return provinceMap.get(code);
}

export function provinceName(code: string): string {
  return provinceMap.get(code)?.name ?? code;
}
