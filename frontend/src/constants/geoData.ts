import type { FeatureCollection } from 'geojson';

// Real geographic data for Khumbu Glacial Threat EWS (Imja Tsho & Dingboche)
// Coordinates format: [longitude, latitude] per GeoJSON specification

export const DINGBOCHE_COORDINATES: [number, number] = [86.8315, 27.8938];
export const IMJA_TSHO_COORDINATES: [number, number] = [86.9247, 27.9008];

export const MAP_CONFIG = {
  defaultCenter: DINGBOCHE_COORDINATES,
  defaultZoom: 13.8,
  minZoom: 10,
  maxZoom: 18,
};

// GLOF Inundation Hazard Corridor Polygon (Dudh Koshi valley floor)
export const HAZARD_INUNDATION_GEOJSON: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'inundation-corridor-01',
        title: 'GLOF High-Velocity Inundation Zone',
        riskLevel: 'CATASTROPHIC',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
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
        ],
      },
    },
  ],
};

// Safe Evacuation Ridge Route LineString (Path climbing uphill out of flood reach)
export const SAFE_ESCAPE_ROUTE_GEOJSON: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'ridge-escape-01',
        title: 'Nangkartshang Ridge Escape Pathway',
        elevationGainM: 180,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [86.8315, 27.8938],
          [86.8318, 27.8944],
          [86.8321, 27.8950],
          [86.8319, 27.8956],
          [86.8316, 27.8960],
          [86.8315, 27.8965],
        ],
      },
    },
  ],
};
