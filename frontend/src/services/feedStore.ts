import { create } from 'zustand';
import type { FeedItem, FeedSourceStatus } from '@/types';
import { getResolvedApiUrl } from '@/services/api';
import { getStorage } from '@/services/offlineCache';

const STORAGE_KEY = 'raha.feed.v1';

interface FeedState {
  items: FeedItem[];
  sources: FeedSourceStatus[];
  generatedAt: string | null;
  status: 'idle' | 'loading' | 'ok' | 'offline';
  hydrate: () => Promise<void>;
  refresh: (force?: boolean) => Promise<void>;
}

// Live items come from the Raha backend, which reads public sources (Open-Meteo, USGS, news RSS).
// When the backend or network is unreachable the last saved copy is shown and marked offline.
export const useFeedStore = create<FeedState>((set, get) => ({
  items: [],
  sources: [],
  generatedAt: null,
  status: 'idle',

  hydrate: async () => {
    if (get().items.length > 0) return;
    try {
      const raw = await getStorage()?.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Pick<FeedState, 'items' | 'sources' | 'generatedAt'>;
      set({ ...saved, status: 'offline' });
    } catch {
      // no saved copy
    }
  },

  refresh: async (force = false) => {
    set({ status: 'loading' });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const base = getResolvedApiUrl().replace(/\/+$/, '');
      const res = await fetch(`${base}/api/feed${force ? '?refresh=1' : ''}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { generatedAt: string; items: FeedItem[]; sources: FeedSourceStatus[] };
      if (data.items.length === 0) throw new Error('Feed returned no items');
      set({ items: data.items, sources: data.sources, generatedAt: data.generatedAt, status: 'ok' });
      getStorage()
        ?.setItem(STORAGE_KEY, JSON.stringify({ items: data.items, sources: data.sources, generatedAt: data.generatedAt }))
        .catch(() => {});
    } catch (e) {
      console.log('[Feed] refresh failed:', (e as Error).message);
      await get().hydrate();
      set({ status: 'offline' });
    } finally {
      clearTimeout(timeout);
    }
  },
}));

export function formatAgo(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
