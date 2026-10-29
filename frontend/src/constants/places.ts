import type { RouteCoordinate } from '@/services/routeCalculator';

export interface PlaceItem {
  id: string;
  name: string;
  region: string;
  coordinate: RouteCoordinate;
  elevationM: number;
}

// Case-study places along the Teesta valley, North Sikkim. Shelter entries are demo data.
export const SIKKIM_PLACES: PlaceItem[] = [
  {
    id: 'place-chungthang',
    name: 'Chungthang',
    region: 'Teesta valley floor • At-risk reach',
    coordinate: { latitude: 27.6026, longitude: 88.6446 },
    elevationM: 1790,
  },
  {
    id: 'place-chungthang-ridge',
    name: 'Chungthang Monastery Ridge',
    region: 'Demo safe haven • High ground above the river',
    coordinate: { latitude: 27.6070, longitude: 88.6462 },
    elevationM: 2050,
  },
  {
    id: 'place-lachung',
    name: 'Lachung',
    region: 'Upstream town • Lachung Chu valley',
    coordinate: { latitude: 27.6894, longitude: 88.7458 },
    elevationM: 2700,
  },
  {
    id: 'place-lachen',
    name: 'Lachen',
    region: 'Upstream town • Lachen Chu valley',
    coordinate: { latitude: 27.7194, longitude: 88.5547 },
    elevationM: 2750,
  },
  {
    id: 'place-mangan',
    name: 'Mangan',
    region: 'District headquarters • Downstream',
    coordinate: { latitude: 27.5167, longitude: 88.5333 },
    elevationM: 1000,
  },
  {
    id: 'place-dikchu',
    name: 'Dikchu',
    region: 'Teesta downstream • At-risk reach',
    coordinate: { latitude: 27.4128, longitude: 88.5036 },
    elevationM: 600,
  },
  {
    id: 'place-gangtok',
    name: 'Gangtok',
    region: 'State capital • Outside the flood corridor',
    coordinate: { latitude: 27.3314, longitude: 88.6138 },
    elevationM: 1650,
  },
  {
    id: 'place-singtam',
    name: 'Singtam',
    region: 'Teesta downstream • At-risk reach',
    coordinate: { latitude: 27.2300, longitude: 88.5000 },
    elevationM: 300,
  },
];

/** Where the user starts by default: the active settlement. */
export const DEFAULT_ORIGIN = SIKKIM_PLACES[0];
