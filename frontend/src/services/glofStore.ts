import { create } from 'zustand';
import type { GlofLakeData, GlofLakeSummary } from '@/types';
import { getResolvedApiUrl } from '@/services/api';
import { getStorage } from '@/services/offlineCache';

const KEY = (id: string) => `raha.glof.${id}.v1`;

// Fallback list so the lake chips render before (or without) the network.
export const DEFAULT_GLOF_LAKES: GlofLakeSummary[] = [
  { id: 'south_lhonak', name: 'South Lhonak Lake', country: 'India (Sikkim)', center: [88.196, 27.911], elevationM: 5200 },
  { id: 'imja_tsho', name: 'Imja Tsho', country: 'Nepal (Khumbu)', center: [86.9278, 27.8997], elevationM: 5010 },
];

interface GlofState {
  lakes: GlofLakeSummary[];
  byId: Record<string, GlofLakeData>;
  status: Record<string, 'idle' | 'loading' | 'ok' | 'offline' | 'error'>;
  loadLakes: () => Promise<void>;
  loadLake: (id: string, force?: boolean) => Promise<void>;
}

async function getJson<T>(path: string, ms = 60000): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(`${getResolvedApiUrl().replace(/\/+$/, '')}${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export const useGlofStore = create<GlofState>((set, get) => ({
  lakes: DEFAULT_GLOF_LAKES,
  byId: {},
  status: {},

  loadLakes: async () => {
    try {
      const lakes = await getJson<GlofLakeSummary[]>('/api/glof/lakes', 20000);
      if (lakes.length) set({ lakes });
    } catch {
      // keep defaults
    }
  },

  loadLake: async (id, force = false) => {
    const setStatus = (s: GlofState['status'][string]) => set((st) => ({ status: { ...st.status, [id]: s } }));
    if (!force && get().byId[id] && get().status[id] === 'ok') return;
    setStatus('loading');

    // Show a saved copy immediately while the network call runs.
    if (!get().byId[id]) {
      try {
        const raw = await getStorage()?.getItem(KEY(id));
        if (raw) set((st) => ({ byId: { ...st.byId, [id]: JSON.parse(raw) as GlofLakeData } }));
      } catch {
        // no saved copy
      }
    }

    try {
      const data = await getJson<GlofLakeData>(`/api/glof/${id}${force ? '?refresh=1' : ''}`);
      set((st) => ({ byId: { ...st.byId, [id]: data } }));
      setStatus('ok');
      getStorage()?.setItem(KEY(id), JSON.stringify(data)).catch(() => {});
    } catch (e) {
      console.log('[Glof] load failed:', (e as Error).message);
      setStatus(get().byId[id] ? 'offline' : 'error');
    }
  },
}));
