// Glacial Lake Registry for Raha EWS
// Supports Imja Tsho (Khumbu, Nepal) & South Lhonak Lake (Sikkim, India)

export type LakeId = 'imja_tsho' | 'south_lhonak';

export interface SensorStation {
  id: string;
  name: string;
  location: string;
  status: 'BREACH_SURGE' | 'ONLINE' | 'CRITICAL_SURGE' | 'WATCH';
  statusLabel: string;
}

export interface SafeHavenInfo {
  name: string;
  elevationGainM: number;
  walkTimeMinutes: number;
  availableBeds: number;
  totalCapacity: number;
  geologyType: string;
  distanceKm: number;
}

export interface LakeConfig {
  id: LakeId;
  name: string;
  region: string;
  country: string;
  elevationM: number;
  coordinates: [number, number]; // [longitude, latitude]
  primarySettlement: {
    name: string;
    elevationM: number;
    coordinates: [number, number];
  };
  riverBasin: string;
  downstreamRiver: string;
  volumeMillionM3: number;
  volumeCapacityPct: number;
  nominalFlowM3s: number;
  criticalSurgeFlowM3s: number;
  surgeMinutesToSettlement: number;
  breachDetected: boolean;
  sensors: SensorStation[];
  primarySafeHaven: SafeHavenInfo;
}

export const LAKES_REGISTRY: Record<LakeId, LakeConfig> = {
  imja_tsho: {
    id: 'imja_tsho',
    name: 'Imja Tsho',
    region: 'Khumbu, Sagarmatha National Park',
    country: 'Nepal',
    elevationM: 5010,
    coordinates: [86.9247, 27.9008],
    primarySettlement: {
      name: 'Dingboche',
      elevationM: 4410,
      coordinates: [86.8315, 27.8938],
    },
    riverBasin: 'Dudh Koshi River Basin',
    downstreamRiver: 'Imja Khola',
    volumeMillionM3: 73.2,
    volumeCapacityPct: 94,
    nominalFlowM3s: 110,
    criticalSurgeFlowM3s: 340,
    surgeMinutesToSettlement: 42,
    breachDetected: true,
    sensors: [
      {
        id: 'sen-imja-radar',
        name: 'Imja Dam Radar',
        location: 'Basin Crest Station (5,012m)',
        status: 'BREACH_SURGE',
        statusLabel: 'BREACH SURGE',
      },
      {
        id: 'sen-dingboche-acoustic',
        name: 'Dingboche Acoustic River Gauge',
        location: 'Valley Riverbed Channel A',
        status: 'BREACH_SURGE',
        statusLabel: 'BREACH SURGE',
      },
      {
        id: 'sen-chukhung-velocity',
        name: 'Chukhung Velocity Node',
        location: 'Upper Moraine Transect (4,730m)',
        status: 'ONLINE',
        statusLabel: 'ONLINE',
      },
    ],
    primarySafeHaven: {
      name: 'North Ridge Gompa',
      elevationGainM: 210,
      walkTimeMinutes: 28,
      availableBeds: 84,
      totalCapacity: 120,
      geologyType: 'Bedrock Safe • Solid Granite Spur',
      distanceKm: 1.4,
    },
  },

  south_lhonak: {
    id: 'south_lhonak',
    name: 'South Lhonak Lake',
    region: 'North Sikkim',
    country: 'India',
    elevationM: 5200,
    coordinates: [88.196, 27.911],
    primarySettlement: {
      name: 'Chungthang',
      elevationM: 1790,
      coordinates: [88.647, 27.603],
    },
    riverBasin: 'Teesta River Basin',
    downstreamRiver: 'Lhonak Chu & Teesta River',
    volumeMillionM3: 65.2,
    volumeCapacityPct: 96,
    nominalFlowM3s: 95,
    criticalSurgeFlowM3s: 380,
    surgeMinutesToSettlement: 45,
    breachDetected: true,
    sensors: [
      {
        id: 'sen-lhonak-dam-radar',
        name: 'Lhonak Moraine Radar',
        location: 'Terminal Ridge Station (5,180m)',
        status: 'BREACH_SURGE',
        statusLabel: 'BREACH SURGE',
      },
      {
        id: 'sen-zemu-acoustic',
        name: 'Zemu Chu Inflow Sensor',
        location: 'Zemu Confluence Channel (3,200m)',
        status: 'BREACH_SURGE',
        statusLabel: 'BREACH SURGE',
      },
      {
        id: 'sen-chungthang-dam-gate',
        name: 'Chungthang Dam Sensor Post',
        location: 'Teesta III Hydro Basin',
        status: 'CRITICAL_SURGE',
        statusLabel: 'CRITICAL SURGE',
      },
    ],
    primarySafeHaven: {
      name: 'Chungthang High Monastery Ridge',
      elevationGainM: 260,
      walkTimeMinutes: 32,
      availableBeds: 140,
      totalCapacity: 200,
      geologyType: 'Bedrock Safe • Gneiss Ridge Lookout',
      distanceKm: 1.8,
    },
  },
};
