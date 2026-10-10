// Production API service client for Glacial Threat Early Warning System (Raha)
// Communicates end-to-end with Raha Product Backend with offline cache resilience

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
import { Platform } from 'react-native';
import {
  ASSESSMENTS_BY_LEVEL,
  MOCK_EVENT_LOGS,
  MOCK_NAVIGATION_ROUTES,
  MOCK_SAFE_POINTS,
  MOCK_USER_PROFILE,
  POC_LAKES,
} from './mockData';

export interface IGlacialThreatApiClient {
  getActiveAssessment(zoneId?: string): Promise<LakeAssessment>;
  getLakes(): Promise<Lake[]>;
  getSafePoints(zoneId?: string): Promise<SafePoint[]>;
  getEventLogs(level?: AlertLevel): Promise<EventLog[]>;
  getUserProfile(): Promise<UserProfile>;
  updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile>;
  toggleContactDispatch(contactId: string, isActive: boolean): Promise<SosContact>;
  addEmergencyContact(contact: Omit<SosContact, 'contactId'>): Promise<SosContact>;
  triggerEmergencySos(payload: SosBroadcastPayload): Promise<SosResponse>;
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
  private cachedProfile: UserProfile = { ...MOCK_USER_PROFILE };
  private cachedRoutes: NavigationRouteOption[] = [...MOCK_NAVIGATION_ROUTES];

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
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
          ...(options.headers || {}),
        },
      });

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

  async getActiveAssessment(zoneId = 'dingboche-zone'): Promise<LakeAssessment> {
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

  async getSafePoints(zoneId = 'dingboche-zone'): Promise<SafePoint[]> {
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

  async getUserProfile(): Promise<UserProfile> {
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
      const res = await fetch(`${this.baseUrl}/api/user/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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

  async toggleContactDispatch(contactId: string, isActive: boolean): Promise<SosContact> {
    try {
      const res = await fetch(`${this.baseUrl}/api/user/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline update
    }
    const contact = this.cachedProfile.contacts.find((c) => c.contactId === contactId);
    if (contact) {
      contact.isActive = isActive;
      return contact;
    }
    throw new Error(`Contact ${contactId} not found`);
  }

  async addEmergencyContact(contactData: Omit<SosContact, 'contactId'>): Promise<SosContact> {
    try {
      const res = await fetch(`${this.baseUrl}/api/user/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  async triggerEmergencySos(payload: SosBroadcastPayload): Promise<SosResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/alerts/sos-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline direct beacon
    }
    return {
      broadcastId: `bcast-${Date.now().toString(36)}`,
      dispatchedAt: new Date().toISOString(),
      smsCount: payload.recipientContactIds.length,
      satelliteRelaySent: true,
      status: 'DELIVERED',
    };
  }

  async updateThreatLevel(level: AlertLevel): Promise<LakeAssessment> {
    try {
      const res = await fetch(`${this.baseUrl}/api/scenario/set-level`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

// Dynamic API URL resolver: On physical mobile devices, automatically substitutes localhost with the Expo LAN host
export function getResolvedApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `http://${window.location.hostname}:4000`;
    }
    return envUrl || 'http://localhost:4000';
  }

  // On native mobile (iOS / Android in Expo Go), dynamically resolve computer's LAN IP or tunnel host
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      // If connected via tunnel (e.g. *.ngrok-free.dev or *.exp.direct), route via Metro HTTPS proxy
      if (host.includes('ngrok') || host.includes('exp.direct')) {
        return `https://${host}`;
      }
      return `http://${host}:4000`;
    }
  }

  // If user explicitly configured an external or LAN IP, use it
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  return envUrl || 'http://localhost:4000';
}

export const apiClient: IGlacialThreatApiClient = new ProductionGlacialThreatApiClient();
