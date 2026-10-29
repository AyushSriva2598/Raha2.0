// Small, fast geometry for the phone: positions are projected to flat metres around a reference
// latitude. Over a valley-sized area (tens of km) the error is well under 1%, which is far below the
// uncertainty of the hazard bands themselves, and it is much cheaper than geodesic maths per point.

export type LonLat = [number, number];
const R = 6371000;
const RAD = Math.PI / 180;

export function project(p: LonLat, lat0: number): [number, number] {
  return [p[0] * RAD * R * Math.cos(lat0 * RAD), p[1] * RAD * R];
}

export function metersBetween(a: LonLat, b: LonLat): number {
  const lat0 = (a[1] + b[1]) / 2;
  const [ax, ay] = project(a, lat0);
  const [bx, by] = project(b, lat0);
  return Math.hypot(ax - bx, ay - by);
}

function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** A polyline prepared once for many distance queries. */
export interface PreparedPath {
  lat0: number;
  xy: [number, number][];
  /** Bounding box in metres, for skipping far-away points quickly. */
  box: [number, number, number, number];
}

export function preparePath(path: LonLat[]): PreparedPath {
  const lat0 = path.reduce((s, p) => s + p[1], 0) / path.length;
  const xy = path.map((p) => project(p, lat0));
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  return { lat0, xy, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
}

/** Distance in metres from a point to a prepared polyline; returns `cap` early when clearly beyond it. */
export function distanceToPath(p: LonLat, path: PreparedPath, cap = Infinity): number {
  const [px, py] = project(p, path.lat0);
  const [x0, y0, x1, y1] = path.box;
  const outside = Math.max(x0 - px, 0, px - x1) ** 2 + Math.max(y0 - py, 0, py - y1) ** 2;
  if (outside > cap * cap) return cap;
  let best = Infinity;
  for (let i = 1; i < path.xy.length; i++) {
    const d = segmentDistance(px, py, path.xy[i - 1][0], path.xy[i - 1][1], path.xy[i][0], path.xy[i][1]);
    if (d < best) best = d;
  }
  return best;
}

/** A band of `width` metres either side of a polyline, as a polygon ring for drawing on the map. */
export function bufferRing(path: LonLat[], width: number): LonLat[] {
  const prep = preparePath(path);
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  const n = prep.xy.length;
  for (let i = 0; i < n; i++) {
    const a = prep.xy[Math.max(0, i - 1)];
    const b = prep.xy[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const [x, y] = prep.xy[i];
    left.push([x + nx * width, y + ny * width]);
    right.push([x - nx * width, y - ny * width]);
  }
  const back = (q: [number, number]): LonLat => [q[0] / (RAD * R * Math.cos(prep.lat0 * RAD)), q[1] / (RAD * R)];
  return [...left, ...right.reverse()].map(back);
}
