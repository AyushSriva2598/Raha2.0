// Production API service client for Glacial Threat Early Warning System (Raha)
// Communicates end-to-end with Raha Product Backend with offline cache resilience

import { newIdempotencyKey } from '@/utils/idempotency';
import {
  AlertLevel,
  EventLog,
  Lake,
  LakeAssessment,
  NavigationRouteOption,
  SafePoint,
  SosBroadcastPayload,
  SosContact,
  SosResponse,
  UserProfile,
} from '@/types';
import Constants from 'expo-constants';
import { authHeaders, getCurrentUser, notifyUnauthorized } from '@/services/session';
import { Platform } from 'react-native';
import {
  ASSESSMENTS_BY_LEVEL,
  MOCK_EVENT_LOGS,
  MOCK_NAVIGATION_ROUTES,
  MOCK_SAFE_POINTS,
  POC_LAKES,
} from './mockData';

// A blank profile, used only until the signed-in user's own profile has loaded. Never fake data.
const EMPTY_PROFILE: UserProfile = {
  userId: '',
  name: '',
  phone: '',
  role: 'resident',
  homeZoneId: '',
  homeLocationName: '',
  elevationM: 0,
  language: 'en',
  smsFallbackEnabled: true,
  offlineMapsCached: false,
  cachedMapSizeMB: 0,
  contacts: [],
};

export interface OfflineSnapshotData {
  assessment: LakeAssessment;
  lakes: Lake[];
  safePoints: SafePoint[];
  profile: UserProfile;
  routes: NavigationRouteOption[];
}

export interface IGlacialThreatApiClient {
  /** True only if the backend answered /health, unlike getters that silently fall back to cache. */
  ping(): Promise<boolean>;
  exportCache(): OfflineSnapshotData;
  resetUserData(): void;
  importCache(data: Partial<OfflineSnapshotData>): void;
  getActiveAssessment(zoneId?: string): Promise<LakeAssessment>;
  getLakes(): Promise<Lake[]>;
  getSafePoints(zoneId?: string): Promise<SafePoint[]>;
  getEventLogs(level?: AlertLevel): Promise<EventLog[]>;
  getUserProfile(): Promise<UserProfile>;
  updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile>;
  toggleContactDispatch(contactId: string, isActive: boolean): Promise<SosContact>;
  addEmergencyContact(contact: Omit<SosContact, 'contactId'>, idempotencyKey?: string): Promise<SosContact>;
  deleteContact(contactId: string): Promise<void>;
  triggerEmergencySos(payload: SosBroadcastPayload, idempotencyKey?: string): Promise<SosResponse>;
  updateThreatLevel(level: AlertLevel): Promise<LakeAssessment>;
  calculateRoute(
    origin: string,
    destination: string,
    avoidHazards?: boolean
  ): Promise<NavigationRouteOption[]>;
}

class ProductionGlacialThreatApiClient implements IGlacialThreatApiClient {
  private baseUrl: string;

  // Local device cache for offline resilience when mountain cellular towers drop
  private cachedAssessment: LakeAssessment = { ...ASSESSMENTS_BY_LEVEL.CLEAR };
  private cachedLakes: Lake[] = [...POC_LAKES];
  private cachedSafePoints: SafePoint[] = [...MOCK_SAFE_POINTS];
  private cachedProfile: UserProfile = { ...EMPTY_PROFILE, contacts: [] };
  private cachedRoutes: NavigationRouteOption[] = [...MOCK_NAVIGATION_ROUTES];

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
  }

  async ping(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${this.getBaseUrl()}/health`, { signal: controller.signal });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  exportCache(): OfflineSnapshotData {
    return {
      assessment: this.cachedAssessment,
      lakes: this.cachedLakes,
      safePoints: this.cachedSafePoints,
      profile: this.cachedProfile,
      routes: this.cachedRoutes,
    };
  }

  importCache(data: Partial<OfflineSnapshotData>): void {
    if (data.assessment) this.cachedAssessment = data.assessment;
    if (data.lakes) this.cachedLakes = data.lakes;
    if (data.safePoints) this.cachedSafePoints = data.safePoints;
    if (data.profile) this.cachedProfile = data.profile;
    if (data.routes) this.cachedRoutes = data.routes;
  }

  private getBaseUrl(): string {
    if (this.baseUrl && !this.baseUrl.includes('localhost') && !this.baseUrl.includes('127.0.0.1')) {
      return this.baseUrl;
    }
    return getResolvedApiUrl().replace(/\/+$/, '');
  }

  private async fetchWithTimeout<T>(
    endpoint: string,
    options: RequestInit = {},
    fallbackData: T,
    timeoutMs = 10000
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const activeBase = this.getBaseUrl();
      const res = await fetch(`${activeBase}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
          ...(options.headers || {}),
        },
      });

      if (res.status === 401) notifyUnauthorized();
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status} from ${endpoint}`);
      }

      return (await res.json()) as T;
    } catch (error) {
      console.log(`[API Client] Offline cache fallback on ${endpoint}:`, (error as Error).message);
      return fallbackData;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getActiveAssessment(zoneId = 'chungthang-zone'): Promise<LakeAssessment> {
    const assessment = await this.fetchWithTimeout<LakeAssessment>(
      `/api/assessments/active?zoneId=${zoneId}`,
      {},
      this.cachedAssessment
    );
    this.cachedAssessment = assessment;
    return assessment;
  }

  async getLakes(): Promise<Lake[]> {
    const lakes = await this.fetchWithTimeout<Lake[]>(
      '/api/lakes',
      {},
      this.cachedLakes
    );
    this.cachedLakes = lakes;
    return lakes;
  }

  async getSafePoints(zoneId = 'chungthang-zone'): Promise<SafePoint[]> {
    const safePoints = await this.fetchWithTimeout<SafePoint[]>(
      `/api/safe-points?zoneId=${zoneId}`,
      {},
      this.cachedSafePoints
    );
    this.cachedSafePoints = safePoints;
    return safePoints;
  }

  async getEventLogs(level?: AlertLevel): Promise<EventLog[]> {
    const query = level ? `?level=${level}` : '';
    const fallback = MOCK_EVENT_LOGS[level || 'CLEAR'] || MOCK_EVENT_LOGS.CLEAR;
    return this.fetchWithTimeout<EventLog[]>(
      `/api/events${query}`,
      {},
      fallback
    );
  }

  /** Forget the previous user's profile when someone signs in or out. */
  resetUserData(): void {
    this.cachedProfile = { ...EMPTY_PROFILE, contacts: [] };
  }

  async getUserProfile(): Promise<UserProfile> {
    const signedIn = getCurrentUser();
    if (signedIn && signedIn.userId !== this.cachedProfile.userId) this.cachedProfile = { ...signedIn, contacts: [...signedIn.contacts] };
    const profile = await this.fetchWithTimeout<UserProfile>(
      '/api/user/profile',
      {},
      this.cachedProfile
    );
    this.cachedProfile = profile;
    return profile;
  }

  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const activeBase = this.getBaseUrl();
      const res = await fetch(`${activeBase}/api/user/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        this.cachedProfile = updated;
        return updated;
      }
    } catch {
      // offline fallback update
    }
    this.cachedProfile = { ...this.cachedProfile, ...updates };
    return this.cachedProfile;
  }

  // Throws when the server did not accept the change, so the caller can roll back. Who gets an SOS
  // must never silently differ between the screen and the server.
  async toggleContactDispatch(contactId: string, isActive: boolean): Promise<SosContact> {
    const res = await fetch(`${this.getBaseUrl()}/api/user/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ isActive }),
    });
    if (!res.ok) throw new Error(`Server refused the change (${res.status})`);
    return await res.json();
  }

  async deleteContact(contactId: string): Promise<void> {
    const res = await fetch(`${this.getBaseUrl()}/api/user/contacts/${contactId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    // 404 means it is already gone, which is what the caller wanted.
    if (!res.ok && res.status !== 404) throw new Error(`Server refused the change (${res.status})`);
    this.cachedProfile = {
      ...this.cachedProfile,
      contacts: this.cachedProfile.contacts.filter((c) => c.contactId !== contactId),
    };
  }

  async addEmergencyContact(contactData: Omit<SosContact, 'contactId'>, idempotencyKey = newIdempotencyKey()): Promise<SosContact> {
    try {
      const activeBase = this.getBaseUrl();
      const res = await fetch(`${activeBase}/api/user/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey, ...authHeaders() },
        body: JSON.stringify(contactData),
      });
      if (res.ok) {
        const created = await res.json();
        this.cachedProfile.contacts.push(created);
        return created;
      }
    } catch {
      // offline addition
    }
    const newContact: SosContact = {
      ...contactData,
      contactId: `c-${Date.now().toString(36)}`,
    };
    this.cachedProfile.contacts.push(newContact);
    return newContact;
  }

  async triggerEmergencySos(payload: SosBroadcastPayload, idempotencyKey = newIdempotencyKey()): Promise<SosResponse> {
    // The same key on every attempt: if the first one reached the server but the reply was lost, the
    // retry gets that answer back instead of sending a second SOS.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${this.getBaseUrl()}/api/alerts/sos-broadcast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey, ...authHeaders() },
          body: JSON.stringify(payload),
        });
        if (res.ok) return await res.json();
        if (res.status < 500) break; // the server understood and said no; retrying will not help
      } catch {
        // network dropped: try again
      }
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
    // Nothing reached the server, so nothing was sent. Say so; the screen offers retry and calling.
    return {
      broadcastId: `local-${Date.now().toString(36)}`,
      dispatchedAt: new Date().toISOString(),
      smsCount: 0,
      recipients: payload.recipientContactIds.length,
      status: 'FAILED',
    };
  }

  async updateThreatLevel(level: AlertLevel): Promise<LakeAssessment> {
    try {
      const activeBase = this.getBaseUrl();
      const res = await fetch(`${activeBase}/api/scenario/set-level`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ level }),
      });
      if (res.ok) {
        const assessment = await res.json();
        this.cachedAssessment = assessment;
        return assessment;
      }
    } catch {
      // offline fallback
    }
    this.cachedAssessment = {
      ...this.cachedAssessment,
      level,
      timestamp: new Date().toISOString(),
    };
    return this.cachedAssessment;
  }

  async calculateRoute(
    origin: string,
    destination: string,
    avoidHazards = true
  ): Promise<NavigationRouteOption[]> {
    return this.fetchWithTimeout<NavigationRouteOption[]>(
      '/api/routes/calculate',
      {
        method: 'POST',
        body: JSON.stringify({ origin, destination, avoidHazards }),
      },
      this.cachedRoutes
    );
  }
}

// Dynamic API URL resolver: Supports USB adb reverse, physical device LAN, and remote tunnels
export function getResolvedApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // 1. Web environment
  if (Platform.OS === 'web') {
    if (
      typeof window !== 'undefined' &&
      window.location?.hostname &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      return `http://${window.location.hostname}:4000`;
    }
    return envUrl || 'http://localhost:4000';
  }

  // 2. Explicit custom/remote API URL configured (e.g. dedicated backend tunnel or LAN IP)
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/+$/, '');
  }

  // 3. Android with USB adb reverse (tcp:4000) or emulator:
  // When 'adb reverse tcp:4000 tcp:4000' is run, http://localhost:4000 routes directly to the dev machine.
  // If EXPO_PUBLIC_API_URL is explicitly set to http://localhost:4000, prefer it on Android.
  if (Platform.OS === 'android' && envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  // 4. Physical device over LAN WiFi (Expo hostUri LAN fallback)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    // Do NOT route API calls to Metro's tunnel (ngrok / exp.direct) as Metro only bundles JS and returns 502 for /api
    const isMetroTunnel = host.includes('ngrok') || host.includes('exp.direct');
    if (host && host !== 'localhost' && host !== '127.0.0.1' && !isMetroTunnel) {
      return `http://${host}:4000`;
    }
  }

  return envUrl || 'http://localhost:4000';
}

export const apiClient: IGlacialThreatApiClient = new ProductionGlacialThreatApiClient();
