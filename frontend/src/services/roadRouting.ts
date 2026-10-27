import { authHeaders } from '@/services/session';
import { getResolvedApiUrl } from '@/services/api';

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
export async function fetchRoadRoutes(from: RoutePoint, to: RoutePoint, signal?: AbortSignal): Promise<RoadRoute[]> {
  const base = getResolvedApiUrl().replace(/\/+$/, '');
  const q = `from=${from.latitude},${from.longitude}&to=${to.latitude},${to.longitude}`;
  const res = await fetch(`${base}/api/route?${q}`, { headers: authHeaders(), signal });
  if (!res.ok) throw new Error(`Routing unavailable (${res.status})`);
  const body = (await res.json()) as { routes: RoadRoute[] };
  return body.routes;
}
