// Google Maps JSON style in the Raha palette: warm cream land, white streets, soft yellow main
// roads, muted brown labels, no shop clutter. Hospitals stay because they matter in an emergency.
// Google applies a custom style to the standard (roadmap) map only, not to terrain or satellite.
// Generated from the same palette as constants/theme.ts; edit colours here, not in the maps.

type StyleRule = {
  featureType?: string;
  elementType?: string;
  stylers: Record<string, string | number>[];
};

const LAND = '#F6EEE8';
const LABEL = '#6B544F';
const LABEL_HALO = '#FDF3F0';

export const RAHA_MAP_STYLE: StyleRule[] = [
  { elementType: 'geometry', stylers: [{ color: LAND }] },
  { elementType: 'labels.text.fill', stylers: [{ color: LABEL }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: LABEL_HALO }, { weight: 3 }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#D9C3BB' }, { weight: 1 }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },

  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#F1E7DF' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#EFE4DC' }] },

  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#DCE7CC' }] },
  { featureType: 'poi.medical', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.medical', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.medical', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#F6D9D3' }] },

  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#EADBD3' }, { weight: 0.8 }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#FFF4DA' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#F9DE9C' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#EBC46A' }, { weight: 1 }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },

  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#BBD9EA' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#5B8AA6' }] },
];
