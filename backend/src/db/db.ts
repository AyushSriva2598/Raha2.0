import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { config } from '../config/index.js';
import {
  SEED_LAKES,
  SEED_ASSESSMENTS,
  SEED_SAFE_POINTS,
  SEED_EVENT_LOGS,
  SEED_NAVIGATION_ROUTES,
} from './seedData.js';
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
} from '../types/index.js';

const { Pool } = pg;

export class DatabaseStore {
  private pool: pg.Pool | null = null;
  private isPostgresConnected = false;

  // In-memory state for development / offline resilience
  private lakes: Lake[] = [...SEED_LAKES];
  private currentLevel: AlertLevel = 'CLEAR';
  private activeAssessment: LakeAssessment = { ...SEED_ASSESSMENTS.CLEAR };
  private safePoints: SafePoint[] = [...SEED_SAFE_POINTS];
  // Users by id, plus a phone-number index. Profiles start blank: nothing is pre-filled.
  private users = new Map<string, UserProfile>();
  private phoneIndex = new Map<string, string>();
  private eventLogs: Record<AlertLevel, EventLog[]> = { ...SEED_EVENT_LOGS };
  private navigationRoutes: NavigationRouteOption[] = [...SEED_NAVIGATION_ROUTES];

  constructor() {
    this.initPool();
  }

  private async initPool() {
    try {
      this.pool = new Pool({
        connectionString: config.databaseUrl,
        connectionTimeoutMillis: 2000,
      });

      const client = await this.pool.connect();
      client.release();
      this.isPostgresConnected = true;
      console.log('✅ PostgreSQL / PostGIS connected successfully');
    } catch {
      this.isPostgresConnected = false;
      console.log('ℹ️ Running in resilient in-memory mode (PostgreSQL not connected)');
    }
  }

  public get isConnected(): boolean {
    return this.isPostgresConnected;
  }

  // --- LAKES ---
  async getLakes(): Promise<Lake[]> {
    return [...this.lakes];
  }

  async getLakeById(lakeId: string): Promise<Lake | undefined> {
    return this.lakes.find((l) => l.lakeId === lakeId);
  }

  // --- ASSESSMENTS ---
  async getActiveAssessment(_zoneId?: string): Promise<LakeAssessment> {
    return { ...this.activeAssessment };
  }

  async setAssessmentLevel(level: AlertLevel): Promise<LakeAssessment> {
    this.currentLevel = level;
    this.activeAssessment = {
      ...SEED_ASSESSMENTS[level],
      timestamp: new Date().toISOString(),
    };
    return { ...this.activeAssessment };
  }

  async syncAssessmentFromAws(payload: Partial<LakeAssessment>): Promise<LakeAssessment> {
    const level = payload.level || this.currentLevel;
    this.currentLevel = level;
    // Optional fields the sender left out must not overwrite the current values with undefined.
    const provided = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
    this.activeAssessment = {
      ...this.activeAssessment,
      ...provided,
      timestamp: new Date().toISOString(),
    };
    return { ...this.activeAssessment };
  }

  // --- SAFE POINTS & SPATIAL QUERIES ---
  async getSafePoints(zoneId?: string): Promise<SafePoint[]> {
    if (zoneId) {
      return this.safePoints.filter((sp) => sp.zoneId === zoneId);
    }
    return [...this.safePoints];
  }

  async getNearestSafePoints(lat: number, lon: number, limit = 5): Promise<SafePoint[]> {
    // PostGIS Haversine distance calculation fallback
    const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // Earth radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const ranked = [...this.safePoints].map((sp) => {
      const d = distanceKm(lat, lon, sp.coordinates.latitude, sp.coordinates.longitude);
      return {
        ...sp,
        distanceKm: Math.round(d * 100) / 100,
        walkingTimeMinutes: Math.round(d * 20), // Approx 20 min per km mountain terrain
      };
    });

    ranked.sort((a, b) => a.distanceKm - b.distanceKm);
    if (ranked.length > 0) {
      ranked[0].isRecommended = true;
    }
    return ranked.slice(0, limit);
  }

  // --- EVENT LOGS ---
  async getEventLogs(level?: AlertLevel): Promise<EventLog[]> {
    const targetLevel = level || this.currentLevel;
    return [...(this.eventLogs[targetLevel] || this.eventLogs.CLEAR)];
  }

  // --- USERS, PROFILES & SOS CONTACTS ---
  /** Signs a phone number in: finds its user, or creates a blank profile for a first-time user. */
  async findOrCreateUserByPhone(phone: string): Promise<{ profile: UserProfile; isNewUser: boolean }> {
    const existingId = this.phoneIndex.get(phone);
    const existing = existingId ? this.users.get(existingId) : undefined;
    if (existing) return { profile: JSON.parse(JSON.stringify(existing)), isNewUser: false };
    const profile: UserProfile = {
      userId: `usr-${randomUUID()}`,
      name: '',
      phone,
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
    this.users.set(profile.userId, profile);
    this.phoneIndex.set(phone, profile.userId);
    return { profile: JSON.parse(JSON.stringify(profile)), isNewUser: true };
  }

  private requireUser(userId: string): UserProfile {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    return user;
  }

  async getUserProfile(userId: string): Promise<UserProfile> {
    return JSON.parse(JSON.stringify(this.requireUser(userId)));
  }

  // Only these fields may be changed by the user; identity fields (id, phone, role) never are.
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const user = this.requireUser(userId);
    const allowed: (keyof UserProfile)[] = ['name', 'homeZoneId', 'homeLocationName', 'elevationM', 'language', 'smsFallbackEnabled', 'offlineMapsCached', 'cachedMapSizeMB'];
    for (const key of allowed) {
      if (updates[key] !== undefined) (user as unknown as Record<string, unknown>)[key] = updates[key];
    }
    return JSON.parse(JSON.stringify(user));
  }

  async addContact(userId: string, contactData: Omit<SosContact, 'contactId'>): Promise<SosContact> {
    const user = this.requireUser(userId);
    const newContact: SosContact = { ...contactData, contactId: `c-${randomUUID().slice(0, 8)}` };
    user.contacts.push(newContact);
    return { ...newContact };
  }

  async toggleContact(userId: string, contactId: string, isActive: boolean): Promise<SosContact> {
    const contact = this.requireUser(userId).contacts.find((c) => c.contactId === contactId);
    if (!contact) {
      throw new Error(`Contact with ID ${contactId} not found`);
    }
    contact.isActive = isActive;
    return { ...contact };
  }

  async deleteContact(userId: string, contactId: string): Promise<boolean> {
    const contacts = this.requireUser(userId).contacts;
    const idx = contacts.findIndex((c) => c.contactId === contactId);
    if (idx === -1) return false;
    contacts.splice(idx, 1);
    return true;
  }

  // --- SOS BROADCAST & FANOUT ---
  async recordSosBroadcast(userId: string, payload: SosBroadcastPayload): Promise<SosResponse> {
    const activeRecipients = this.requireUser(userId).contacts.filter(
      (c) => payload.recipientContactIds.includes(c.contactId) && c.isActive
    );

    return {
      broadcastId: `bcast-${Date.now().toString(36)}`,
      dispatchedAt: new Date().toISOString(),
      smsCount: activeRecipients.length,
      satelliteRelaySent: true,
      status: 'DELIVERED',
    };
  }

  // --- NAVIGATION ROUTES ---
  async calculateRoutes(
    _origin: string,
    _destination: string,
    avoidHazards = true
  ): Promise<NavigationRouteOption[]> {
    if (avoidHazards) {
      return this.navigationRoutes.filter((r) => r.riskStatus === 'SAFE');
    }
    return [...this.navigationRoutes];
  }
}

export const db = new DatabaseStore();
