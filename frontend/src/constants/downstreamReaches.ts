// Downstream River Thalwegs, Inundation Corridors & Settlement Checkpoints
// Calibrated for Imja Tsho -> Dudh Koshi and South Lhonak -> Teesta River

import { LakeId } from './lakes';

export interface SettlementCheckpoint {
  id: string;
  name: string;
  distanceKm: number;
  surgeEtaMinutes: number;
  peakDischargeM3s: number;
  maxStageDepthM: number;
  safeShelterName: string;
  safeElevationGainM: number;
  evacuationWalkTimeMin: number;
  isPrimaryUserSettlement?: boolean;
}

export interface DownstreamReachConfig {
  lakeId: LakeId;
  riverName: string;
  totalLengthKm: number;
  // River centerline line string coordinates: Array of [longitude, latitude]
  riverCenterline: [number, number][];
  // Hazard inundation corridor polygon coordinates
  inundationCorridor: [number, number][];
  // Safe uphill escape route line string
  safeRidgePath: [number, number][];
  // Downstream settlement stations
  settlements: SettlementCheckpoint[];
}

export const DOWNSTREAM_REACHES: Record<LakeId, DownstreamReachConfig> = {
  imja_tsho: {
    lakeId: 'imja_tsho',
    riverName: 'Imja Khola / Dudh Koshi Gorge',
    totalLengthKm: 35.0,
    riverCenterline: [
      [86.9247, 27.9008], // Imja Tsho outlet
      [86.9150, 27.8990],
      [86.8950, 27.8975],
      [86.8720, 27.8960],
      [86.8480, 27.8945],
      [86.8315, 27.8938], // Dingboche confluence
      [86.8120, 27.8820],
      [86.7930, 27.8570], // Pangboche
      [86.7750, 27.8420],
      [86.7640, 27.8350], // Tengboche river crossing
      [86.7320, 27.8150],
      [86.7140, 27.8040], // Namche confluence / Larja Bridge
      [86.7120, 27.7400], // Phakding low floodplain
    ],
    inundationCorridor: [
      [86.8200, 27.8880],
      [86.8260, 27.8915],
      [86.8325, 27.8935],
      [86.8420, 27.8965],
      [86.8580, 27.9000],
      [86.8780, 27.9025],
      [86.9050, 27.9015],
      [86.9250, 27.9010],
      [86.9270, 27.8980],
      [86.9080, 27.8985],
      [86.8800, 27.8995],
      [86.8590, 27.8975],
      [86.8410, 27.8940],
      [86.8310, 27.8905],
      [86.8240, 27.8860],
      [86.8200, 27.8880],
    ],
    safeRidgePath: [
      [86.8315, 27.8938], // Dingboche settlement floor
      [86.8318, 27.8944],
      [86.8321, 27.8950],
      [86.8326, 27.8958],
      [86.8332, 27.8966],
      [86.8340, 27.8975],
      [86.8348, 27.8984],
      [86.8355, 27.8992],
      [86.8362, 27.9000],
      [86.8370, 27.9010], // North Ridge Gompa bedrock spur (+210m)
    ],
    settlements: [
      {
        id: 'set-chukhung',
        name: 'Chhukhung Outpost',
        distanceKm: 3.2,
        surgeEtaMinutes: 8,
        peakDischargeM3s: 580,
        maxStageDepthM: 12.4,
        safeShelterName: 'Upper Chukhung Moraine Ridge',
        safeElevationGainM: 95,
        evacuationWalkTimeMin: 12,
      },
      {
        id: 'set-dingboche',
        name: 'Dingboche Settlement',
        distanceKm: 7.4,
        surgeEtaMinutes: 42,
        peakDischargeM3s: 340,
        maxStageDepthM: 7.8,
        safeShelterName: 'North Ridge Gompa',
        safeElevationGainM: 210,
        evacuationWalkTimeMin: 28,
        isPrimaryUserSettlement: true,
      },
      {
        id: 'set-pangboche',
        name: 'Pangboche Monastery Plateau',
        distanceKm: 13.1,
        surgeEtaMinutes: 68,
        peakDischargeM3s: 290,
        maxStageDepthM: 5.6,
        safeShelterName: 'Upper Gompa Bedrock Terrace',
        safeElevationGainM: 140,
        evacuationWalkTimeMin: 16,
      },
      {
        id: 'set-tengboche',
        name: 'Tengboche River Crossing',
        distanceKm: 18.5,
        surgeEtaMinutes: 94,
        peakDischargeM3s: 240,
        maxStageDepthM: 4.8,
        safeShelterName: 'Tengboche High Monastery Ridge',
        safeElevationGainM: 280,
        evacuationWalkTimeMin: 35,
      },
      {
        id: 'set-phakding',
        name: 'Phakding Low Valley Floodplain',
        distanceKm: 28.2,
        surgeEtaMinutes: 140,
        peakDischargeM3s: 195,
        maxStageDepthM: 4.2,
        safeShelterName: 'Upper Phakding Trail Crest',
        safeElevationGainM: 120,
        evacuationWalkTimeMin: 20,
      },
      {
        id: 'set-namche',
        name: 'Namche River Confluence (Larja)',
        distanceKm: 35.0,
        surgeEtaMinutes: 175,
        peakDischargeM3s: 165,
        maxStageDepthM: 3.5,
        safeShelterName: 'Namche Solar Post Ridge',
        safeElevationGainM: 210,
        evacuationWalkTimeMin: 25,
      },
    ],
  },

  south_lhonak: {
    lakeId: 'south_lhonak',
    riverName: 'Lhonak Chu -> Zemu Chu -> Teesta Valley',
    totalLengthKm: 90.0,
    riverCenterline: [
      [88.1960, 27.9110], // Lake outlet
      [88.2500, 27.8800],
      [88.3500, 27.8400],
      [88.4600, 27.7900],
      [88.5570, 27.7250], // Lachen
      [88.6470, 27.6030], // Chungthang Dam confluence
      [88.5800, 27.4800],
      [88.5200, 27.3900], // Dikchu
      [88.4900, 27.2300], // Singtam
      [88.5300, 27.1700], // Rangpo
    ],
    inundationCorridor: [
      [88.1900, 27.9150],
      [88.2400, 27.8850],
      [88.3600, 27.8350],
      [88.4800, 27.7800],
      [88.5700, 27.7100],
      [88.6600, 27.5900],
      [88.6300, 27.5900],
      [88.5400, 27.7150],
      [88.4400, 27.7950],
      [88.3300, 27.8450],
      [88.2200, 27.8950],
      [88.1900, 27.9150],
    ],
    safeRidgePath: [
      [88.6470, 27.6030], // Chungthang valley floor
      [88.6480, 27.6045],
      [88.6492, 27.6060],
      [88.6508, 27.6080],
      [88.6525, 27.6105], // High Monastery Ridge Lookout (+260m)
    ],
    settlements: [
      {
        id: 'set-lachen-post',
        name: 'Lachen Outpost & Pastures',
        distanceKm: 15.0,
        surgeEtaMinutes: 20,
        peakDischargeM3s: 850,
        maxStageDepthM: 14.5,
        safeShelterName: 'Lachen High Granite Terrace',
        safeElevationGainM: 180,
        evacuationWalkTimeMin: 22,
      },
      {
        id: 'set-chungthang',
        name: 'Chungthang Dam & Valley Floor',
        distanceKm: 30.5,
        surgeEtaMinutes: 45,
        peakDischargeM3s: 380,
        maxStageDepthM: 11.2,
        safeShelterName: 'Chungthang High Monastery Ridge',
        safeElevationGainM: 260,
        evacuationWalkTimeMin: 32,
        isPrimaryUserSettlement: true,
      },
      {
        id: 'set-dikchu',
        name: 'Dikchu Hydropower Colony',
        distanceKm: 55.0,
        surgeEtaMinutes: 90,
        peakDischargeM3s: 290,
        maxStageDepthM: 7.5,
        safeShelterName: 'Dikchu Hill Station Lookout',
        safeElevationGainM: 160,
        evacuationWalkTimeMin: 25,
      },
      {
        id: 'set-singtam',
        name: 'Singtam River Crossing',
        distanceKm: 75.0,
        surgeEtaMinutes: 140,
        peakDischargeM3s: 210,
        maxStageDepthM: 5.8,
        safeShelterName: 'Singtam Upper Bypass Ridge',
        safeElevationGainM: 190,
        evacuationWalkTimeMin: 30,
      },
    ],
  },
};
