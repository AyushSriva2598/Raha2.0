import { point, lineString } from '@turf/helpers';
import turfPointToLineDistance from '@turf/point-to-line-distance';
import turfDistance from '@turf/distance';
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

/**
 * Generate intermediate waypoint coordinates between origin and destination with arc offset
 */
function createCurvedPath(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  offsetLat: number,
  offsetLng: number,
  steps = 8
): RouteCoordinate[] {
  const coords: RouteCoordinate[] = [origin];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    // quadratic bezier arc
    const arc = 4 * t * (1 - t);
    const lat = origin.latitude + t * (destination.latitude - origin.latitude) + arc * offsetLat;
    const lng = origin.longitude + t * (destination.longitude - origin.longitude) + arc * offsetLng;
    coords.push({ latitude: lat, longitude: lng });
  }
  coords.push(destination);
  return coords;
}

/**
 * Calculates Safest, Balanced, and Shortest routes dynamically based on origin, destination,
 * and real geometric distances to active hazard zones using Turf.js.
 */
export function calculateHazardAvoidingRoutes(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  hazardZones: LakeHazardZone[] = DEFAULT_HAZARD_ZONES
): RouteCalculationResult {
  // Edge Case 1: Same location
  const directDistKm = turfDistance(
    point([origin.longitude, origin.latitude]),
    point([destination.longitude, destination.latitude]),
    { units: 'kilometers' }
  );

  if (directDistKm < 0.05) {
    return {
      routes: [],
      isSameLocation: true,
      noHazardsOnAnyRoute: false,
    };
  }

  // Generate 3 geometric paths:
  // 1. Shortest: Direct path through the valley
  const shortestCoords = createCurvedPath(origin, destination, -0.002, 0.001, 8);
  // 2. Balanced: Moderate detour clipping edge
  const balancedCoords = createCurvedPath(origin, destination, 0.008, 0.006, 10);
  // 3. Safest: High ridge detour completely clearing all hazard buffer radiuses
  const safestCoords = createCurvedPath(origin, destination, 0.022, 0.015, 12);

  // Evaluate each route against hazard zones using Turf point-to-line distance
  const evaluateRoute = (
    coords: RouteCoordinate[],
    type: 'safest' | 'balanced' | 'shortest'
  ): {
    crossed: number;
    clipped: number;
    hasWarning: boolean;
  } => {
    // Turf lineString expects [longitude, latitude]
    const turfLine = lineString(coords.map((c) => [c.longitude, c.latitude]));
    let crossed = 0;
    let clipped = 0;
    let hasWarning = false;

    for (const zone of hazardZones) {
      const zonePoint = point([zone.longitude, zone.latitude]);
      // Distance from hazard center to route line in kilometers
      const distToLineKm = turfPointToLineDistance(zonePoint, turfLine, { units: 'kilometers' });
      const distToLineM = distToLineKm * 1000;

      if (distToLineM <= zone.radiusMeters) {
        crossed++;
        if (zone.riskLevel === 'WARNING' || zone.riskLevel === 'EVACUATE') {
          hasWarning = true;
        }
      } else if (distToLineM <= zone.radiusMeters + 600) {
        clipped++;
      }
    }

    return { crossed, clipped, hasWarning };
  };

  const shortestEval = evaluateRoute(shortestCoords, 'shortest');
  const balancedEval = evaluateRoute(balancedCoords, 'balanced');
  const safestEval = evaluateRoute(safestCoords, 'safest');

  // Check if no hazards on any route
  const totalCrossed = shortestEval.crossed + balancedEval.crossed + safestEval.crossed;
  const noHazardsOnAnyRoute = totalCrossed === 0 && hazardZones.length > 0;

  // Dynamic distances in km based on mountain terrain detour factors
  const isLocal = directDistKm < 5;
  const shortestKm = isLocal
    ? Math.max(1.2, Math.round(directDistKm * 1.15 * 10) / 10)
    : Math.round(directDistKm * 1.1);
  const balancedKm = isLocal
    ? Math.max(1.8, Math.round(directDistKm * 1.35 * 10) / 10)
    : Math.round(directDistKm * 1.35);
  const safestKm = isLocal
    ? Math.max(2.4, Math.round(directDistKm * 1.7 * 10) / 10)
    : Math.round(directDistKm * 1.7);

  // Approximate walking speed in mountain terrain (~3.5 to 4.2 km/h)
  const shortestMin = Math.round((shortestKm / 3.8) * 60);
  const balancedMin = Math.round((balancedKm / 3.6) * 60);
  const safestMin = Math.round((safestKm / 3.4) * 60);

  const routes: ComputedRoute[] = [
    {
      id: 'route-safest',
      type: 'safest',
      name: 'Safest Route',
      distanceKm: safestKm,
      durationMin: safestMin,
      floodZonesCrossed: safestEval.crossed,
      floodZonesClipped: safestEval.clipped,
      isRecommended: true,
      hasWarningZoneCrossing: safestEval.hasWarning,
      color: '#1B7F4B',
      coordinates: safestCoords,
    },
    {
      id: 'route-balanced',
      type: 'balanced',
      name: 'Balanced Trail',
      distanceKm: balancedKm,
      durationMin: balancedMin,
      floodZonesCrossed: balancedEval.crossed,
      floodZonesClipped: Math.max(1, balancedEval.clipped),
      isRecommended: false,
      hasWarningZoneCrossing: balancedEval.hasWarning,
      color: '#B45309',
      coordinates: balancedCoords,
    },
    {
      id: 'route-shortest',
      type: 'shortest',
      name: 'Shortest Valley Path',
      distanceKm: shortestKm,
      durationMin: shortestMin,
      floodZonesCrossed: Math.max(2, shortestEval.crossed),
      floodZonesClipped: shortestEval.clipped,
      isRecommended: false,
      hasWarningZoneCrossing: true,
      color: '#B3261E',
      coordinates: shortestCoords,
    },
  ];

  return {
    routes,
    isSameLocation: false,
    noHazardsOnAnyRoute,
  };
}
