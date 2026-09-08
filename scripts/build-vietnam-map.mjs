/**
 * One-shot generator: 34-province GeoJSON → simplified SVG paths.
 * Source: thanglequoc/vietnamese-provinces-database (post-2025 GeoJSON, GSO codes).
 * Not used at runtime / not part of `npm run build`.
 *
 *   node scripts/build-vietnam-map.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "lib", "travel", "vietnam-34-paths.ts");

const MAP_WIDTH = 560;
const MAP_HEIGHT = 840;
const PAD = 10;
const EPSILON = 0.012;
const MIN_RING_AREA = 0.00004;
const MAX_RINGS = 10;

/** Mainland bbox so Hoàng Sa / Trường Sa do not squash the S-shape. */
const MIN_LNG = 102.14;
const MAX_LNG = 109.55;
const MIN_LAT = 8.35;
const MAX_LAT = 23.42;

const FILES = [
  "01_ha_noi",
  "04_cao_bang",
  "08_tuyen_quang",
  "11_dien_bien",
  "12_lai_chau",
  "14_son_la",
  "15_lao_cai",
  "19_thai_nguyen",
  "20_lang_son",
  "22_quang_ninh",
  "24_bac_ninh",
  "25_phu_tho",
  "31_hai_phong",
  "33_hung_yen",
  "37_ninh_binh",
  "38_thanh_hoa",
  "40_nghe_an",
  "42_ha_tinh",
  "44_quang_tri",
  "46_hue",
  "48_da_nang",
  "51_quang_ngai",
  "52_gia_lai",
  "56_khanh_hoa",
  "66_dak_lak",
  "68_lam_dong",
  "75_dong_nai",
  "79_ho_chi_minh",
  "80_tay_ninh",
  "82_dong_thap",
  "86_vinh_long",
  "91_an_giang",
  "92_can_tho",
  "96_ca_mau",
];

const BASE =
  "https://raw.githubusercontent.com/thanglequoc/vietnamese-provinces-database/master/json/geojson";

function perpendicularDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function simplify(points, epsilon) {
  if (points.length <= 4) return points;
  let maxD = 0;
  let idx = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > epsilon) {
    const left = simplify(points.slice(0, idx + 1), epsilon);
    const right = simplify(points.slice(idx), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

function ringArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(area / 2);
}

function ringCentroid(ring) {
  let x = 0;
  let y = 0;
  const n = ring.length > 1 ? ring.length - 1 : ring.length;
  for (let i = 0; i < n; i += 1) {
    x += ring[i][0];
    y += ring[i][1];
  }
  return [x / n, y / n];
}

function isMainland(ring) {
  const [lng, lat] = ringCentroid(ring);
  return lng >= MIN_LNG && lng <= MAX_LNG && lat >= MIN_LAT && lat <= MAX_LAT;
}

function project(lng, lat) {
  const x = PAD + ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * (MAP_WIDTH - 2 * PAD);
  const y = PAD + ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * (MAP_HEIGHT - 2 * PAD);
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

function ringsFromGeometry(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates[0]];
  if (geometry.type === "MultiPolygon") return geometry.coordinates.map((poly) => poly[0]);
  return [];
}

function pathFromRing(ring) {
  const simplified = simplify(ring, EPSILON);
  if (simplified.length < 4) return null;
  const pts = simplified.map(([lng, lat]) => project(lng, lat));
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i += 1) {
    d += `L${pts[i][0]} ${pts[i][1]}`;
  }
  return `${d}Z`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${url}`);
  }
  return response.json();
}

async function main() {
  const provinces = [];

  for (const file of FILES) {
    const code = file.slice(0, 2);
    const url = `${BASE}/${file}/${file}.geojson`;
    process.stdout.write(`fetch ${file}… `);
    const geojson = await fetchJson(url);
    const feature = geojson.features?.[0] ?? geojson;
    const rings = ringsFromGeometry(feature.geometry)
      .filter((ring) => Array.isArray(ring) && ring.length >= 4)
      .filter(isMainland)
      .map((ring) => ({ ring, area: ringArea(ring) }))
      .filter((item) => item.area >= MIN_RING_AREA)
      .sort((a, b) => b.area - a.area)
      .slice(0, MAX_RINGS);

    const paths = [];
    for (const item of rings) {
      const d = pathFromRing(item.ring);
      if (d) paths.push(d);
    }

    if (paths.length === 0) {
      throw new Error(`No mainland paths for ${file}`);
    }

    const mainRing = rings[0].ring;
    const [clng, clat] = ringCentroid(mainRing);
    const centroid = project(clng, clat);

    provinces.push({ code, d: paths, centroid });
    console.log(`${paths.length} path(s)`);
  }

  const body = `/* Generated by scripts/build-vietnam-map.mjs — do not edit by hand.
 * Geometry: thanglequoc/vietnamese-provinces-database GeoJSON (post-2025, GSO codes).
 */
import { MAP_VIEWBOX } from "./map-view";

export { MAP_VIEWBOX };

export type ProvincePath = {
  code: string;
  d: string[];
  centroid: [number, number];
};

export const provincePaths: ProvincePath[] = ${JSON.stringify(provinces)};
`;

  writeFileSync(OUT, body, "utf8");
  console.log(`wrote ${OUT} (${provinces.length} provinces)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
