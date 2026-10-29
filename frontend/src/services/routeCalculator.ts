import { RouteOptionData } from '@/components/common/RouteRow';
import { FLOOD_HAZARDS, type FloodCircle, type FloodHazard } from '@/constants/floodHazards';
import { distanceToPath, metersBetween, preparePath, type LonLat, type PreparedPath } from '@/services/geo';
import type { RoadRoute } from '@/services/roadRouting';

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface ComputedRoute extends RouteOptionData {
  coordinates: RouteCoordinate[];
  hasWarningZoneCrossing: boolean;
  color: string;
  /** One plain sentence on what this road does to the flood zones. */
  summary: string;
  /** Zones the road passes through (not counting the one you start or end in). */
  crossedZones: string[];
  /** Kilometres of road inside zones you pass through. */
  insideKm: number;
  /** You start inside this zone; the road gets you out after exitKm. */
  leavesZone?: { name: string; exitKm: number; warning: boolean };
  /** The destination itself is inside this zone. */
  endsInZone?: { name: string; warning: boolean };
  /** Set when this road was found by routing around a zone. */
  detourAround?: string;
}

export interface RouteCalculationResult {
  routes: ComputedRoute[];
  isSameLocation: boolean;
  noHazardsOnAnyRoute: boolean;
}

export const DEFAULT_HAZARDS = FLOOD_HAZARDS;

export function isSamePlace(a: RouteCoordinate, b: RouteCoordinate): boolean {
  return metersBetween([a.longitude, a.latitude], [b.longitude, b.latitude]) < 50;
}

const NEAR_LAKE_M = 600;
const isWarning = (h: FloodHazard) => h.riskLevel === 'WARNING' || h.riskLevel === 'EVACUATE';

// Colour and tier come from what the road actually does to the hazards, never from a label.
const TIER = {
  clear: { type: 'safest' as const, color: '#1B7F4B', rank: 0 },
  caution: { type: 'balanced' as const, color: '#B45309', rank: 1 },
  danger: { type: 'shortest' as const, color: '#B3261E', rank: 2 },
};

const prepared = new WeakMap<FloodHazard, PreparedPath>();
/** Metres outside the hazard (negative inside). */
function signedDistance(h: FloodHazard, p: LonLat): number {
  if (h.kind === 'circle') return metersBetween(p, [h.longitude, h.latitude]) - h.radiusMeters;
  let path = prepared.get(h);
  if (!path) {
    path = preparePath(h.path);
    prepared.set(h, path);
  }
  return distanceToPath(p, path, h.widthMeters + 5000) - h.widthMeters;
}

const round1 = (m: number) => Math.round(m / 100) / 10;

/** The hazard a place sits in (a warning one first), or null when it is outside all of them. */
export function hazardAt(p: RouteCoordinate, hazards: FloodHazard[] = DEFAULT_HAZARDS): FloodHazard | null {
  const inside = hazards.filter((h) => signedDistance(h, [p.longitude, p.latitude]) <= 0);
  return inside.find(isWarning) ?? inside[0] ?? null;
}

/**
 * What one road does to the hazards. Overlapping hazards (two river bands meeting at a confluence)
 * act as one area for where you start and end: the road "gets you out" only once it is outside all
 * of them, and only the stretch between leaving and arriving is checked for crossings.
 */
function analyseRoad(road: RoadRoute, hazards: FloodHazard[]) {
  const c = road.coordinates;
  const n = c.length;
  const seg: number[] = [0];
  for (let i = 1; i < n; i++) seg.push(metersBetween(c[i - 1], c[i]));
  const d = hazards.map((h) => c.map((p) => signedDistance(h, p)));
  const inAny = (i: number) => d.some((row) => row[i] <= 0);
  // The hazard a point is in, preferring a warning one.
  const holder = (i: number) => {
    const inside = hazards.filter((_, k) => d[k][i] <= 0);
    return inside.find(isWarning) ?? inside[0];
  };

  let start = 0;
  let leaves: ComputedRoute['leavesZone'];
  if (inAny(0)) {
    const h = holder(0);
    let m = 0;
    while (start < n && inAny(start)) m += seg[start++] ?? 0;
    leaves = { name: h.name, exitKm: round1(m), warning: isWarning(h) };
  }
  let end = n - 1;
  let ends: ComputedRoute['endsInZone'];
  if (inAny(n - 1)) {
    const h = holder(n - 1);
    while (end > start && inAny(end)) end--;
    ends = { name: h.name, warning: isWarning(h) };
  }

  const crossed: { h: FloodHazard; m: number }[] = [];
  let near = 0;
  hazards.forEach((h, k) => {
    let inside = 0;
    let closest = Infinity;
    for (let i = start; i <= end && i < n; i++) {
      closest = Math.min(closest, d[k][i]);
      if (i > start && d[k][i] <= 0 && d[k][i - 1] <= 0) inside += seg[i];
    }
    if (closest <= 0) crossed.push({ h, m: Math.max(inside, 1) });
    else if (h.kind === 'circle' && closest <= NEAR_LAKE_M) near++;
  });

  const warning = crossed.some((x) => isWarning(x.h));
  const tier = warning || ends?.warning ? TIER.danger : crossed.length > 0 || near > 0 || ends ? TIER.caution : TIER.clear;
  return { crossed, near, leaves, ends, tier, warning };
}

function summarise(a: ReturnType<typeof analyseRoad>): string {
  const parts: string[] = [];
  if (a.leaves) parts.push(`Gets you out of ${a.leaves.name} in ${a.leaves.exitKm} km`);
  if (a.crossed.length) {
    const km = round1(a.crossed.reduce((s, x) => s + x.m, 0));
    const names = a.crossed.map((x) => x.h.name);
    parts.push(`${km} km along ${names[0]}${names.length > 1 ? ` and ${names.length - 1} more` : ''}`);
  }
  if (a.ends) parts.push(`ends inside ${a.ends.name}`);
  if (!parts.length) return a.near ? 'Passes near a flood zone' : 'Avoids all flood zones';
  const text = parts.join(' · ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Scores real road routes against the hazards and ranks them: lowest tier first, then the least road
 * inside hazards, then shortest time. Distance and time are the routing engine's.
 */
export function classifyRoadRoutes(
  roadRoutes: (RoadRoute & { detourAround?: string })[],
  hazards: FloodHazard[] = DEFAULT_HAZARDS
): RouteCalculationResult {
  const scored = roadRoutes
    .filter((r) => r.coordinates.length >= 2)
    .map((road) => {
      const a = analyseRoad(road, hazards);
      return { road, a, insideM: a.crossed.reduce((s, x) => s + x.m, 0) };
    });

  // The same road can come back from two requests; keep one.
  const unique = scored.filter(
    (x, i) =>
      scored.findIndex(
        (y) => Math.abs(y.road.distanceKm - x.road.distanceKm) < 0.15 && Math.abs(y.road.durationMin - x.road.durationMin) <= 1
      ) === i
  );

  unique.sort(
    (x, y) => x.a.tier.rank - y.a.tier.rank || x.insideM - y.insideM || x.a.near - y.a.near || x.road.durationMin - y.road.durationMin
  );
  const fastestMin = Math.min(...unique.map((x) => x.road.durationMin));

  const routes: ComputedRoute[] = unique.map(({ road, a, insideM }, i) => ({
    id: `route-${i + 1}`,
    type: a.tier.type,
    name: road.detourAround
      ? `Detour around ${road.detourAround}`
      : road.durationMin === fastestMin
        ? 'Fastest road'
        : 'Alternative road',
    distanceKm: road.distanceKm,
    durationMin: road.durationMin,
    floodZonesCrossed: a.crossed.length,
    floodZonesClipped: a.near,
    isRecommended: i === 0,
    hasWarningZoneCrossing: a.warning || !!a.ends?.warning,
    color: a.tier.color,
    summary: summarise(a),
    coordinates: road.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
    crossedZones: a.crossed.map((x) => x.h.name),
    insideKm: round1(insideM),
    leavesZone: a.leaves,
    endsInZone: a.ends,
    detourAround: road.detourAround,
  }));

  return {
    routes,
    isSameLocation: false,
    noHazardsOnAnyRoute: routes.length > 0 && routes.every((r) => r.floodZonesCrossed === 0 && !r.endsInZone),
  };
}

/** Points either side of a circular zone, out past its edge, for asking the router to go round it. */
export function detourPoints(zone: FloodCircle, from: RouteCoordinate, to: RouteCoordinate): RouteCoordinate[] {
  const rad = Math.PI / 180;
  const bearing = Math.atan2(
    Math.sin((to.longitude - from.longitude) * rad) * Math.cos(to.latitude * rad),
    Math.cos(from.latitude * rad) * Math.sin(to.latitude * rad) -
      Math.sin(from.latitude * rad) * Math.cos(to.latitude * rad) * Math.cos((to.longitude - from.longitude) * rad)
  );
  const d = Math.max(zone.radiusMeters * 1.8, zone.radiusMeters + 800);
  return [bearing + Math.PI / 2, bearing - Math.PI / 2].map((b) => ({
    latitude: zone.latitude + (d * Math.cos(b)) / 111320,
    longitude: zone.longitude + (d * Math.sin(b)) / (111320 * Math.cos(zone.latitude * rad)),
  }));
}
