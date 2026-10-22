// Lake data for the 3D view: the pipeline's published JSON (public/<lake>.json, public/lakes.json).
// Source is a local directory in development (GLOF_DATA_DIR) and S3 in production (GLOF_DATA_BUCKET).
// A failing source never empties the screen: the last good copy is served, in memory or from disk.
import fs from 'node:fs/promises';
import path from 'node:path';

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
  /** Set when the source was unreachable and a saved copy is being served. */
  stale?: boolean;
}

export interface GlofLakeSummary {
  id: string;
  name: string;
  country: string;
  center: [number, number];
  elevationM: number;
}

export interface GlofSource {
  /** Returns the parsed JSON for a key such as "public/south_lhonak", or null when it does not exist. */
  read(key: string): Promise<unknown | null>;
  describe: string;
}

export class LocalDirSource implements GlofSource {
  describe: string;
  constructor(private dir: string) {
    this.describe = `dir:${dir}`;
  }
  async read(key: string): Promise<unknown | null> {
    try {
      return JSON.parse(await fs.readFile(path.join(this.dir, `${key}.json`), 'utf8'));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  }
}

const TTL_MS = 10 * 60 * 1000;
const SAFE_ID = /^[a-z0-9_]{1,40}$/;

export class GlofData {
  private mem = new Map<string, { at: number; value: unknown }>();

  /** cacheDir: where the last good copy is kept so a restart during an outage still has data. */
  constructor(private source: GlofSource, private cacheDir?: string) {}

  private async persist(key: string, value: unknown): Promise<void> {
    if (!this.cacheDir) return;
    try {
      const file = path.join(this.cacheDir, `${key.replace('/', '__')}.json`);
      await fs.mkdir(this.cacheDir, { recursive: true });
      await fs.writeFile(file, JSON.stringify(value));
    } catch {
      // the disk cache is best effort
    }
  }

  private async restore(key: string): Promise<unknown | null> {
    if (!this.cacheDir) return null;
    try {
      return JSON.parse(await fs.readFile(path.join(this.cacheDir, `${key.replace('/', '__')}.json`), 'utf8'));
    } catch {
      return null;
    }
  }

  private async get<T>(key: string, force: boolean): Promise<{ value: T; stale: boolean } | null> {
    const hit = this.mem.get(key);
    if (!force && hit && Date.now() - hit.at < TTL_MS) return { value: hit.value as T, stale: false };
    try {
      const fresh = await this.source.read(key);
      if (fresh !== null) {
        this.mem.set(key, { at: Date.now(), value: fresh });
        void this.persist(key, fresh);
        return { value: fresh as T, stale: false };
      }
      return null; // the source answered: there is no such document
    } catch (e) {
      console.warn(`[glof] source ${this.source.describe} failed for ${key}: ${(e as Error).message}`);
      const saved = hit?.value ?? (await this.restore(key));
      if (saved) return { value: saved as T, stale: true };
      throw e;
    }
  }

  async getLakes(): Promise<GlofLakeSummary[]> {
    return (await this.get<GlofLakeSummary[]>('public/lakes', false))?.value ?? [];
  }

  /** null when the lake has no published data. */
  async getLake(lakeId: string, force = false): Promise<GlofLakeData | null> {
    if (!SAFE_ID.test(lakeId)) return null;
    const r = await this.get<GlofLakeData>(`public/${lakeId}`, force);
    return r ? (r.stale ? { ...r.value, stale: true } : r.value) : null;
  }
}

let instance: GlofData | null = null;

/** Local development reads the pipeline's output folder; production sets GLOF_DATA_BUCKET (see M3). */
export function glofData(): GlofData {
  if (!instance) {
    const dir = process.env.GLOF_DATA_DIR ?? path.resolve(process.cwd(), '../pipeline/out');
    instance = new GlofData(new LocalDirSource(dir), path.resolve(process.cwd(), '.cache/glof'));
  }
  return instance;
}
