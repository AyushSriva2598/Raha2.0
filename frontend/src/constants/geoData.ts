// Geographic data for the Raha case study: South Lhonak Lake and the Teesta valley, North Sikkim.
// Coordinates are [longitude, latitude] unless a field says otherwise. The flood corridor and
// shelters are ILLUSTRATIVE demo geometry for the simulation, not surveyed hazard maps.

export const CHUNGTHANG_COORDINATES: [number, number] = [88.6446, 27.6026];
export const SOUTH_LHONAK_COORDINATES: [number, number] = [88.2014, 27.9125];

export interface LatLng {
  latitude: number;
  longitude: number;
}

export const MAP_CONFIG = {
  defaultCenter: CHUNGTHANG_COORDINATES,
  minZoom: 8,
  maxZoom: 18,
};

/** Approximate course of the Teesta from Chungthang downstream (demo flood corridor). */
export const TEESTA_FLOOD_CORRIDOR: LatLng[] = [
  { latitude: 27.6026, longitude: 88.6446 }, // Chungthang
  { latitude: 27.5750, longitude: 88.6300 },
  { latitude: 27.5450, longitude: 88.5800 },
  { latitude: 27.5167, longitude: 88.5333 }, // Mangan
  { latitude: 27.4700, longitude: 88.5150 },
  { latitude: 27.4128, longitude: 88.5036 }, // Dikchu
  { latitude: 27.3200, longitude: 88.5000 },
  { latitude: 27.2300, longitude: 88.5000 }, // Singtam
];

/** Short uphill escape path from Chungthang to the monastery ridge (demo). */
export const CHUNGTHANG_ESCAPE_ROUTE: LatLng[] = [
  { latitude: 27.6026, longitude: 88.6446 },
  { latitude: 27.6034, longitude: 88.6452 },
  { latitude: 27.6046, longitude: 88.6450 },
  { latitude: 27.6058, longitude: 88.6456 },
  { latitude: 27.6070, longitude: 88.6462 },
];

export const CHUNGTHANG_HIGH_GROUND: LatLng = { latitude: 27.6070, longitude: 88.6462 };
export const CHUNGTHANG_FLOOD_REPORT: LatLng = { latitude: 27.5990, longitude: 88.6420 };
