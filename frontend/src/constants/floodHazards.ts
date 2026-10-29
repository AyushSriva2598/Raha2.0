import type { RiskLevel } from '@/constants/theme';
import { LACHEN_CHU_COURSE, TEESTA_RIVER_COURSE, type LatLng } from '@/constants/geoData';
import { bufferRing, type LonLat } from '@/services/geo';

// Where a lake outburst would do harm. An outburst flood follows the river channel, so the hazard
// downstream is a band along the river (a corridor), not a circle round a town: high ground a few
// hundred metres away is safe. Each reach carries its own alert level. The source lake keeps a circle.
// River courses are real (OpenStreetMap); the band width and levels are ILLUSTRATIVE demo values that
// must be replaced by surveyed inundation maps from the disaster-management authority.

export const CORRIDOR_WIDTH_M = 250;

export interface FloodCorridor {
  kind: 'corridor';
  id: string;
  name: string;
  riskLevel: RiskLevel;
  /** [longitude, latitude] along the river, upstream first. */
  path: LonLat[];
  widthMeters: number;
}

export interface FloodCircle {
  kind: 'circle';
  id: string;
  name: string;
  riskLevel: RiskLevel;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export type FloodHazard = FloodCorridor | FloodCircle;

const toLonLat = (p: LatLng): LonLat => [p.longitude, p.latitude];

function splitAt(course: LatLng[], near: LatLng): number {
  let best = 0;
  let bestD = Infinity;
  course.forEach((p, i) => {
    const d = (p.latitude - near.latitude) ** 2 + (p.longitude - near.longitude) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

const MANGAN = { latitude: 27.5167, longitude: 88.5333 };
const DIKCHU = { latitude: 27.4128, longitude: 88.5036 };
const atMangan = splitAt(TEESTA_RIVER_COURSE, MANGAN);
const atDikchu = splitAt(TEESTA_RIVER_COURSE, DIKCHU);

export const FLOOD_HAZARDS: FloodHazard[] = [
  {
    kind: 'circle',
    id: 'lake-south-lhonak',
    name: 'South Lhonak Lake',
    riskLevel: 'WARNING',
    latitude: 27.9125,
    longitude: 88.2014,
    radiusMeters: 2400,
  },
  {
    kind: 'corridor',
    id: 'corridor-lachen-chu',
    name: 'Lachen Chu',
    riskLevel: 'WARNING',
    path: LACHEN_CHU_COURSE.map(toLonLat),
    widthMeters: CORRIDOR_WIDTH_M,
  },
  {
    kind: 'corridor',
    id: 'corridor-teesta-chungthang',
    name: 'Teesta at Chungthang',
    riskLevel: 'WARNING',
    path: TEESTA_RIVER_COURSE.slice(0, atMangan + 1).map(toLonLat),
    widthMeters: CORRIDOR_WIDTH_M,
  },
  {
    kind: 'corridor',
    id: 'corridor-teesta-mangan',
    name: 'Teesta near Mangan',
    riskLevel: 'WATCH',
    path: TEESTA_RIVER_COURSE.slice(atMangan, atDikchu + 1).map(toLonLat),
    widthMeters: CORRIDOR_WIDTH_M,
  },
  {
    kind: 'corridor',
    id: 'corridor-teesta-dikchu',
    name: 'Teesta below Dikchu',
    riskLevel: 'WATCH',
    path: TEESTA_RIVER_COURSE.slice(atDikchu).map(toLonLat),
    widthMeters: CORRIDOR_WIDTH_M,
  },
];

/** A point for a hazard's label on the map: the circle centre, or the middle of the river reach. */
export function hazardLabelPoint(h: FloodHazard): LatLng {
  if (h.kind === 'circle') return { latitude: h.latitude, longitude: h.longitude };
  const mid = h.path[Math.floor(h.path.length / 2)];
  return { latitude: mid[1], longitude: mid[0] };
}

const rings = new WeakMap<FloodCorridor, LatLng[]>();
/** The band of a river corridor as a polygon for the map (true width, so it scales with zoom). */
export function corridorRing(h: FloodCorridor): LatLng[] {
  let ring = rings.get(h);
  if (!ring) {
    ring = bufferRing(h.path, h.widthMeters).map(([longitude, latitude]) => ({ latitude, longitude }));
    rings.set(h, ring);
  }
  return ring;
}
