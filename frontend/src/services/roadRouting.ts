import { authHeaders } from '@/services/session';
import { getResolvedApiUrl } from '@/services/api';
import type { FloodCircle, FloodHazard } from '@/constants/floodHazards';
import { classifyRoadRoutes, detourPoints, type RouteCalculationResult } from '@/services/routeCalculator';

export interface RoadRoute {
  distanceKm: number;
  durationMin: number;
  /** [longitude, latitude] pairs along the road. */
  coordinates: [number, number][];
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

// Real road routes from the Raha backend (driving roads, which cars and bikes share). Throws when the
// server or the routing engine cannot be reached, so the screen can say so instead of drawing a guess.
export async function fetchRoadRoutes(
  from: RoutePoint,
  to: RoutePoint,
  signal?: AbortSignal,
  via?: RoutePoint
): Promise<RoadRoute[]> {
  const base = getResolvedApiUrl().replace(/\/+$/, '');
  const q =
    `from=${from.latitude},${from.longitude}&to=${to.latitude},${to.longitude}` +
    (via ? `&via=${via.latitude.toFixed(5)},${via.longitude.toFixed(5)}` : '');
  const res = await fetch(`${base}/api/route?${q}`, { headers: authHeaders(), signal });
  if (!res.ok) throw new Error(`Routing unavailable (${res.status})`);
  const body = (await res.json()) as { routes: RoadRoute[] };
  return body.routes;
}

/**
* Road routes for a trip, plus detours when every road crosses a warning zone: it asks for a road
 * past each side of the first round zones crossed and keeps whatever the scorer finds safer. Detour lookups
 * that fail are ignored; only the main lookup failing is an error.
 */
export async function planRoutes(
  from: RoutePoint,
  to: RoutePoint,
  zones: FloodHazard[],
  signal?: AbortSignal
): Promise<RouteCalculationResult> {
  const main = await fetchRoadRoutes(from, to, signal);
  const first = classifyRoadRoutes(main, zones);
  if (first.routes.some((r) => !r.hasWarningZoneCrossing)) return first;

  // Only a round zone can be gone around; a river corridor in a valley cannot.
  const toAvoid = zones
    .filter((z): z is FloodCircle => z.kind === 'circle' && first.routes.some((r) => r.crossedZones.includes(z.name)))
    .slice(0, 2);
  if (toAvoid.length === 0) return first;

  const detours = await Promise.all(
    toAvoid.flatMap((zone) =>
      detourPoints(zone, from, to).map((via) =>
        fetchRoadRoutes(from, to, signal, via)
          .then((roads) => roads.map((r) => ({ ...r, detourAround: zone.name })))
          .catch(() => [])
      )
    )
  );
  return classifyRoadRoutes([...main, ...detours.flat()], zones);
}
