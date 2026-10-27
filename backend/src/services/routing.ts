import { config } from '../config/index.js';

// Road routes between two points. The provider sits behind one small interface so the public OSRM
// demo used in development can be swapped for a self-hosted engine or an AWS service without the
// app noticing. Distances and times are the engine's, never estimated here.

export interface LatLon {
  latitude: number;
  longitude: number;
}

export interface RoadRoute {
  distanceKm: number;
  durationMin: number;
  /** [longitude, latitude] pairs along the road. */
  coordinates: [number, number][];
}

export interface RoutingProvider {
  readonly name: string;
  route(from: LatLon, to: LatLon, signal?: AbortSignal): Promise<RoadRoute[]>;
}

type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

interface OsrmResponse {
  code: string;
  routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
}

export class OsrmProvider implements RoutingProvider {
  readonly name = 'osrm';
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: FetchLike = fetch as unknown as FetchLike
  ) {}

  async route(from: LatLon, to: LatLon, signal?: AbortSignal): Promise<RoadRoute[]> {
    const path = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
    const url = `${this.baseUrl}/route/v1/driving/${path}?alternatives=3&overview=full&geometries=geojson&steps=false`;
    const res = await this.fetchImpl(url, { signal });
    if (!res.ok) throw new Error(`routing engine answered ${res.status}`);
    return parseOsrm((await res.json()) as OsrmResponse);
  }
}

export function parseOsrm(body: OsrmResponse): RoadRoute[] {
  if (body.code === 'NoRoute') return [];
  if (body.code !== 'Ok' || !body.routes) throw new Error(`routing engine error: ${body.code}`);
  return body.routes.map((r) => ({
    distanceKm: Math.round((r.distance / 1000) * 10) / 10,
    durationMin: Math.max(1, Math.round(r.duration / 60)),
    coordinates: r.geometry.coordinates,
  }));
}

let provider: RoutingProvider | null = null;
export function routingProvider(): RoutingProvider | null {
  if (config.routing.provider === 'none') return null;
  provider ??= new OsrmProvider(config.routing.osrmUrl);
  return provider;
}
export function setRoutingProvider(p: RoutingProvider | null) {
  provider = p;
}

// Small cache so repeated requests for the same trip (retries, re-renders) do not hit the engine.
const cache = new Map<string, { at: number; routes: RoadRoute[] }>();
const TTL_MS = 5 * 60 * 1000;
const key = (a: LatLon, b: LatLon) => [a.latitude, a.longitude, b.latitude, b.longitude].map((n) => n.toFixed(4)).join(',');

export async function findRoutes(from: LatLon, to: LatLon): Promise<{ source: string; routes: RoadRoute[] }> {
  const p = routingProvider();
  if (!p) throw new Error('Road routing is not configured on this server');
  const k = key(from, to);
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < TTL_MS) return { source: p.name, routes: hit.routes };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.routing.timeoutMs);
  try {
    const routes = await p.route(from, to, controller.signal);
    cache.set(k, { at: Date.now(), routes });
    return { source: p.name, routes };
  } finally {
    clearTimeout(timer);
  }
}

export function clearRoutingCache() {
  cache.clear();
}

/** Parses "lat,lon"; null when it is not a real coordinate. */
export function parseLatLon(raw: unknown): LatLon | null {
  if (typeof raw !== 'string') return null;
  const [a, b, ...rest] = raw.split(',').map((s) => Number(s.trim()));
  if (rest.length || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  return { latitude: a, longitude: b };
}
