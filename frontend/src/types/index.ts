// TypeScript Domain Models matching PRD Section 16 & Section 5

export type AlertLevel = 'CLEAR' | 'WATCH' | 'WARNING' | 'EVACUATE';

export interface Lake {
  lakeId: string;
  name: string;
  region: string;
  country: string;
  elevationM: number;
  latitude: number;
  longitude: number;
  downstreamBasin: string;
  volumeMillionM3: number;
  lastSatellitePass: string;
  satelliteSources: string[];
}

export interface LakeAssessment {
  lakeId: string;
  timestamp: string;
  level: AlertLevel;
  headline: string;
  instruction: string;
  arrivalWindow: string; // e.g. "about 2 to 4 hours"
  dataAge: string; // e.g. "Updated 14 min ago"
  outflowRateM3s: number;
  lakeAreaChangePct: number;
  sarBackscatterChangeDb: number;
  tempAnomalyCelsius: number;
  contributingFactors: string[];
  modelVersion: string;
  authorityBroadcastCode?: string;
}

export interface DownstreamZone {
  zoneId: string;
  lakeId: string;
  name: string;
  basin: string;
  elevationM: number;
  distanceFromLakeKm: number;
  populationEstimate: number;
  currentLevel: AlertLevel;
  arrivalWindowRange: string;
  isUserZone?: boolean;
}

export type SafePointType = 'high_ground' | 'medical_shelter' | 'community_hall' | 'ridge_camp';

export interface SafePoint {
  pointId: string;
  zoneId: string;
  name: string;
  type: SafePointType;
  elevationGainM: number;
  walkingTimeMinutes: number;
  distanceKm: number;
  capacityPct: number;
  capacityLabel: string;
  gradientLabel: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  contactPhone: string;
  isRecommended: boolean;
  notes: string;
}

export interface EventLog {
  eventId: string;
  lakeId: string;
  title: string;
  source: string;
  timestamp: string;
  type: 'gauge' | 'sar' | 'satellite' | 'authority' | 'weather';
  level: AlertLevel;
  details?: string;
}

export interface SosContact {
  contactId: string;
  name: string;
  relation: string; // e.g. "Sister", "Mother", "Village Elder"
  phone: string;
  isActive: boolean;
  notifyOnRisk: boolean;
}

export interface UserProfile {
  userId: string;
  name: string;
  phone: string;
  role: 'resident' | 'authority' | 'operator';
  homeZoneId: string;
  homeLocationName: string;
  elevationM: number;
  language: 'en' | 'hi' | 'ne';
  smsFallbackEnabled: boolean;
  offlineMapsCached: boolean;
  cachedMapSizeMB: number;
  contacts: SosContact[];
}

export interface TelemetryStation {
  stationId: string;
  lakeId: string;
  name: string;
  status: 'online' | 'degraded' | 'syncing';
  frequencyMhz: string;
  lastPing: string;
}

export interface SosBroadcastPayload {
  userId: string;
  /** null when the phone has no real location; nothing is ever invented. */
  latitude: number | null;
  longitude: number | null;
  elevationM?: number | null;
  batteryPct?: number | null;
  networkStatus?: string;
  alertLevel: AlertLevel;
  timestamp: string;
  recipientContactIds: string[];
}

export interface SosResponse {
  broadcastId: string;
  dispatchedAt: string;
  /** Messages the SMS provider actually accepted. */
  smsCount: number;
  /** Contacts the SOS was meant for. */
  recipients: number;
  /** SENT / PARTIAL: texts went out. RECORDED: saved, messaging off. FAILED: nothing sent. */
  status: 'SENT' | 'PARTIAL' | 'RECORDED' | 'FAILED';
  note?: string;
}

export interface NavigationRouteOption {
  routeId: string;
  title: string;
  distanceKm: number;
  durationMinutes: number;
  elevationGainM: number;
  hazardAvoided: boolean;
  riskStatus: 'SAFE' | 'AT_RISK';
  summary: string;
}

// Live public-data feed (served by the backend at /api/feed)
export type FeedCategory = 'weather' | 'quake' | 'news';

export interface FeedItem {
  id: string;
  category: FeedCategory;
  title: string;
  summary: string;
  body: string[];
  facts?: { label: string; value: string }[];
  source: { name: string; url: string };
  publishedAt: string;
  retrievedAt: string;
}

export interface FeedSourceStatus {
  name: string;
  ok: boolean;
  count: number;
  error?: string;
}

// 3D lake monitor data (served by the backend at /api/glof/:lakeId)
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
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
}

export interface GlofLakeSummary {
  id: string;
  name: string;
  country: string;
  center: [number, number];
  elevationM: number;
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
}
