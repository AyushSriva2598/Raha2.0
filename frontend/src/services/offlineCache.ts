import { NativeModules, TurboModuleRegistry } from 'react-native';
import { create } from 'zustand';
import { apiClient, type OfflineSnapshotData } from '@/services/api';

// Offline "map" = the app's own valley data (lakes, safe points, routes, assessment, profile).
// It does not store Google map tiles.

const STORAGE_KEY = 'raha.offline.snapshot.v1';

interface StoredSnapshot extends Partial<OfflineSnapshotData> {
  savedAt: string;
}

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

// AsyncStorage is a native module: it only exists in a dev build made after it was installed.
// Fall back to memory so the app keeps working on an older build.
export function getStorage(): KeyValueStore | null {
  // Requiring the package without its native module logs a red error, so check first.
  if (!TurboModuleRegistry.get('RNCAsyncStorage') && !NativeModules.RNCAsyncStorage) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-async-storage/async-storage');
    return (mod.default ?? mod) as KeyValueStore;
  } catch {
    return null;
  }
}

export type OfflineStatus = 'idle' | 'downloading' | 'ready' | 'error';

interface OfflineState {
  status: OfflineStatus;
  lastUpdated: string | null;
  sizeKb: number;
  persistent: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  download: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  status: 'idle',
  lastUpdated: null,
  sizeKb: 0,
  persistent: true,
  error: null,

  hydrate: async () => {
    const storage = getStorage();
    if (!storage) {
      set({ persistent: false });
      return;
    }
    try {
      const raw = await storage.getItem(STORAGE_KEY);
      if (!raw) return;
      const snap = JSON.parse(raw) as StoredSnapshot;
      apiClient.importCache(snap);
      set({
        status: 'ready',
        lastUpdated: snap.savedAt,
        sizeKb: Math.max(1, Math.round(raw.length / 1024)),
      });
    } catch (e) {
      console.log('[OfflineCache] hydrate failed:', (e as Error).message);
    }
  },

  download: async () => {
    set({ status: 'downloading', error: null });
    const online = await apiClient.ping();
    if (!online) {
      set({ status: 'error', error: 'No connection to the server. Try again when you are online.' });
      return;
    }
    try {
      // Getters refresh the client's in-memory cache from the live backend.
      await Promise.all([
        apiClient.getActiveAssessment(),
        apiClient.getLakes(),
        apiClient.getSafePoints(),
        apiClient.getUserProfile(),
      ]);
      const savedAt = new Date().toISOString();
      const raw = JSON.stringify({ ...apiClient.exportCache(), savedAt } satisfies StoredSnapshot);
      const storage = getStorage();
      if (storage) await storage.setItem(STORAGE_KEY, raw);
      set({
        status: 'ready',
        lastUpdated: savedAt,
        sizeKb: Math.max(1, Math.round(raw.length / 1024)),
        persistent: !!storage,
      });
    } catch (e) {
      set({ status: 'error', error: (e as Error).message });
    }
  },
}));
