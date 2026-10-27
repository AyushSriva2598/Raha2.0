import { point, lineString } from '@turf/helpers';
import turfPointToLineDistance from '@turf/point-to-line-distance';
import turfDistance from '@turf/distance';
import type { RoadRoute } from '@/services/roadRouting';
import { RouteOptionData } from '@/components/common/RouteRow';
import { LakeHazardZone } from '@/components/common/LakeCircle';

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface ComputedRoute extends RouteOptionData {
  coordinates: RouteCoordinate[];
  hasWarningZoneCrossing: boolean;
  color: string;
}

// Hazard buffers for the North Sikkim case study: the source lake plus demo flood-reach buffers.
export const DEFAULT_HAZARD_ZONES: LakeHazardZone[] = [
  {
    id: 'lake-south-lhonak',
    name: 'South Lhonak Lake',
    latitude: 27.9125,
    longitude: 88.2014,
    radiusMeters: 2400,
    riskLevel: 'WARNING',
  },
  {
    id: 'reach-chungthang',
    name: 'Chungthang reach',
    latitude: 27.6026,
    longitude: 88.6446,
    radiusMeters: 900,
    riskLevel: 'WARNING',
  },
  {
    id: 'reach-mangan',
    name: 'Mangan reach',
    latitude: 27.5167,
    longitude: 88.5333,
    radiusMeters: 800,
    riskLevel: 'WATCH',
  },
  {
    id: 'reach-dikchu',
    name: 'Dikchu reach',
    latitude: 27.4128,
    longitude: 88.5036,
    radiusMeters: 800,
    riskLevel: 'WATCH',
  },
];

export interface RouteCalculationResult {
  routes: ComputedRoute[];
  isSameLocation: boolean;
  noHazardsOnAnyRoute: boolean;
}

export function isSamePlace(origin: RouteCoordinate, destination: RouteCoordinate): boolean {
  const km = turfDistance(
    point([origin.longitude, origin.latitude]),
    point([destination.longitude, destination.latitude]),
    { units: 'kilometers' }
  );
  return km < 0.05;
}

const NEAR_EDGE_M = 600;

// Colour and tier come from what the road actually does to the hazard zones, never from a label.
const TIER = {
  clear: { type: 'safest' as const, color: '#1B7F4B' },
  caution: { type: 'balanced' as const, color: '#B45309' },
  danger: { type: 'shortest' as const, color: '#B3261E' },
};

/**
 * Scores real road routes against the hazard zones with Turf and ranks them. Distance and time are
 * the routing engine's. A route's tier is clear (touches no zone), caution (passes near a zone edge or
 * crosses a non-warning zone) or danger (crosses a WARNING/EVACUATE zone). The recommended route has
 * the lowest tier, then the fewest zones, then the shortest time.
 */
export function classifyRoadRoutes(
  roadRoutes: RoadRoute[],
  hazardZones: LakeHazardZone[] = DEFAULT_HAZARD_ZONES
): RouteCalculationResult {
  const scored = roadRoutes.map((r) => {
    const coordinates = r.coordinates.map(([longitude, latitude]) => ({ latitude, longitude }));
    const line = lineString(r.coordinates);
    let crossed = 0;
    let clipped = 0;
    let warning = false;
    for (const zone of hazardZones) {
      const m = turfPointToLineDistance(point([zone.longitude, zone.latitude]), line, { units: 'kilometers' }) * 1000;
      if (m <= zone.radiusMeters) {
        crossed++;
        if (zone.riskLevel === 'WARNING' || zone.riskLevel === 'EVACUATE') warning = true;
      } else if (m <= zone.radiusMeters + NEAR_EDGE_M) {
        clipped++;
      }
    }
    const tier = warning ? TIER.danger : crossed > 0 || clipped > 0 ? TIER.caution : TIER.clear;
    return { road: r, coordinates, crossed, clipped, warning, tier };
  });

  const rank = (x: (typeof scored)[number]) => [x.warning ? 2 : x.crossed > 0 || x.clipped > 0 ? 1 : 0, x.crossed, x.clipped, x.road.durationMin];
  scored.sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
    return 0;
  });
  const fastestMin = Math.min(...scored.map((x) => x.road.durationMin));

  const routes: ComputedRoute[] = scored.map((x, i) => ({
    id: `route-${i + 1}`,
    type: x.tier.type,
    name: x.road.durationMin === fastestMin ? 'Fastest road' : 'Alternative road',
    distanceKm: x.road.distanceKm,
    durationMin: x.road.durationMin,
    floodZonesCrossed: x.crossed,
    floodZonesClipped: x.clipped,
    isRecommended: i === 0,
    hasWarningZoneCrossing: x.warning,
    color: x.tier.color,
    coordinates: x.coordinates,
  }));

  return {
    routes,
    isSameLocation: false,
    noHazardsOnAnyRoute: routes.length > 0 && routes.every((r) => r.floodZonesCrossed === 0),
  };
}
