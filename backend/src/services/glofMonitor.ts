// Proxy + slimmer for the Glacial Lake Monitor service (Sentinel-2 derived lake outlines).
// Only read-only GET endpoints are used. The upstream archive is ~2.4 MB per lake, so we keep just
// what the 3D view needs (primary lake outline per scene, level, indicators) and cache it.

const BASE = (process.env.GLOF_MONITOR_URL ?? 'https://tp2h8f7jp8.execute-api.ap-south-1.amazonaws.com').replace(/\/+$/, '');
const TTL_MS = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 45000;

export type GlofLevel = 'NORMAL' | 'WATCH' | 'ADVISORY' | 'WARNING' | 'EVACUATE';

export interface GlofFrame {
  i: number;
  date: string;
  scene: string;
  level: GlofLevel | null;
  rawLevel: GlofLevel | null;
  areaHa: number;
  advanceM: number | null;
  growthPct: number | null;
  iceAreaKm2: number | null;
  reasons: { level: GlofLevel; text: string }[];
  flags: string[];
  /** GeoJSON Polygon or MultiPolygon of the main water body, coordinates rounded to 5 dp */
  geometry: unknown;
}

export interface GlofLakeData {
  lake: {
    id: string;
    name: string;
    country: string;
    center: [number, number];
    bbox: [number, number, number, number];
    elevationM: number;
    events: { date: string; label: string; detail: string }[];
  };
  archiveAvailable: boolean;
  baseline: { areaHa: number; label: string } | null;
  thresholds: Record<string, number> | null;
  levelChanges: { date: string; from: GlofLevel; to: GlofLevel; reasons: string[] }[];
  frames: GlofFrame[];
  latest: { scene: string; acquired: string; waterAreaHa: number; iceAreaHa: number; cloudCover: number } | null;
  attribution: { imagery: string; terrain: string; method: string; caveat: string; service: string };
  retrievedAt: string;
}

export interface GlofLakeSummary {
  id: string;
  name: string;
  country: string;
  center: [number, number];
  elevationM: number;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RahaEWS/0.1)' },
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

const round5 = (n: number) => Math.round(n * 1e5) / 1e5;
function roundCoords(c: unknown): unknown {
  if (Array.isArray(c)) return typeof c[0] === 'number' ? (c as number[]).map(round5) : c.map(roundCoords);
  return c;
}

const ATTRIBUTION = {
  imagery: 'Contains modified Copernicus Sentinel-2 data (ESA), via AWS Earth Search / AWS Open Data',
  terrain: 'Terrain: Terrarium elevation tiles, AWS Open Data',
  method: 'Water mapped with NDWI > 0.1 on cloud-masked Sentinel-2 L2A scenes; debris-covered ice is not detected.',
  caveat: 'Alert thresholds are placeholders pending calibration with the local authority. This is not an official warning.',
  service: BASE,
};

/* eslint-disable @typescript-eslint/no-explicit-any */
let lakesCache: { at: number; value: GlofLakeSummary[] } | null = null;
const lakeCache = new Map<string, { at: number; value: GlofLakeData }>();

export async function getGlofLakes(): Promise<GlofLakeSummary[]> {
  if (lakesCache && Date.now() - lakesCache.at < TTL_MS) return lakesCache.value;
  const raw = await getJson<any[]>('/api/lakes');
  const value = raw.map((l) => ({
    id: l.id,
    name: l.name,
    country: l.country,
    center: l.center,
    elevationM: l.lake_elevation_m,
  }));
  lakesCache = { at: Date.now(), value };
  return value;
}

async function buildFromArchive(lakeId: string): Promise<GlofLakeData> {
  const a = await getJson<any>(`/api/archive?lake=${encodeURIComponent(lakeId)}`);
  const tlFrames: any[] = a.timeline?.frames ?? [];
  const frames: GlofFrame[] = a.frames.map((f: any, i: number) => {
    const t = tlFrames[i] ?? {};
    const ind = t.indicators ?? {};
    return {
      i,
      date: f.date,
      scene: f.scene,
      level: t.level ?? null,
      rawLevel: t.raw_level ?? null,
      areaHa: Math.round((f.stats?.lake_area_m2 ?? 0) / 100) / 100,
      advanceM: ind.advance_m ?? null,
      growthPct: ind.growth_pct ?? null,
      iceAreaKm2: f.stats?.ice_area_m2 != null ? Math.round(f.stats.ice_area_m2 / 1e4) / 100 : null,
      reasons: (t.reasons ?? []).map((r: any) => ({ level: r.level, text: r.text })),
      flags: t.flags ?? [],
      geometry: { ...f.lake.geometry, coordinates: roundCoords(f.lake.geometry.coordinates) },
    };
  });
  const last = frames[frames.length - 1];
  return {
    lake: {
      id: a.lake.id,
      name: a.lake.name,
      country: a.lake.country,
      center: a.lake.center,
      bbox: a.lake.bbox,
      elevationM: a.lake.lake_elevation_m,
      events: a.lake.events ?? [],
    },
    archiveAvailable: true,
    baseline: a.timeline?.baseline ? { areaHa: Math.round(a.timeline.baseline.area_m2 / 100) / 100, label: a.timeline.baseline.label } : null,
    thresholds: a.timeline?.thresholds ?? null,
    levelChanges: (a.timeline?.events ?? []).map((e: any) => ({
      date: e.date,
      from: e.from,
      to: e.to,
      reasons: (e.reasons ?? []).map((r: any) => r.text),
    })),
    frames,
    latest: last ? { scene: last.scene, acquired: last.date, waterAreaHa: last.areaHa, iceAreaHa: (last.iceAreaKm2 ?? 0) * 100, cloudCover: 0 } : null,
    attribution: ATTRIBUTION,
    retrievedAt: new Date().toISOString(),
  };
}

// Lakes without a boundary archive still get their latest scene (one frame, no alert level).
async function buildFromLatest(lakeId: string): Promise<GlofLakeData> {
  const [lakes, t] = await Promise.all([getJson<any[]>('/api/lakes'), getJson<any>(`/api/telemetry?lake=${encodeURIComponent(lakeId)}`)]);
  const meta = lakes.find((l) => l.id === lakeId) ?? t.lake;
  const primary = (t.water?.features ?? []).filter((f: any) => f.properties?.primary);
  const polys = primary.flatMap((f: any) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates));
  const date = String(t.scene?.acquired ?? t.generated_at).slice(0, 10);
  const frame: GlofFrame = {
    i: 0,
    date,
    scene: t.scene?.id ?? '',
    level: null,
    rawLevel: null,
    areaHa: Math.round((t.stats?.primary_area_m2 ?? t.stats?.water_area_m2 ?? 0) / 100) / 100,
    advanceM: null,
    growthPct: null,
    iceAreaKm2: t.stats?.ice_area_ha != null ? Math.round(t.stats.ice_area_ha) / 100 : null,
    reasons: [],
    flags: [],
    geometry: { type: 'MultiPolygon', coordinates: roundCoords(polys) },
  };
  return {
    lake: {
      id: meta.id,
      name: meta.name,
      country: meta.country,
      center: meta.center,
      bbox: meta.bbox,
      elevationM: meta.lake_elevation_m,
      events: [],
    },
    archiveAvailable: false,
    baseline: null,
    thresholds: null,
    levelChanges: [],
    frames: [frame],
    latest: {
      scene: frame.scene,
      acquired: t.scene?.acquired ?? date,
      waterAreaHa: t.stats?.water_area_ha ?? frame.areaHa,
      iceAreaHa: t.stats?.ice_area_ha ?? 0,
      cloudCover: t.scene?.tile_cloud_cover ?? 0,
    },
    attribution: ATTRIBUTION,
    retrievedAt: new Date().toISOString(),
  };
}

export async function getGlofLake(lakeId: string, force = false): Promise<GlofLakeData> {
  const hit = lakeCache.get(lakeId);
  if (!force && hit && Date.now() - hit.at < TTL_MS) return hit.value;
  let value: GlofLakeData;
  try {
    value = await buildFromArchive(lakeId);
  } catch (e) {
    // 404 means this lake has no archive; any other failure is a real error.
    if ((e as { status?: number }).status !== 404) throw e;
    value = await buildFromLatest(lakeId);
  }
  lakeCache.set(lakeId, { at: Date.now(), value });
  return value;
}
