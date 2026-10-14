/// <reference types="@types/google.maps" />

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/tokens';
import { SafePoint } from '@/types';
import {
  DINGBOCHE_COORDINATES,
  HAZARD_INUNDATION_GEOJSON,
  SAFE_ESCAPE_ROUTE_GEOJSON,
} from '@/constants/geoData';
import { loadGoogleMaps } from '@/utils/loadGoogleMaps';

interface HazardMapCanvasProps {
  mode: 'EVACUATE' | 'NAVIGATE';
  targetPerson: 'ME' | 'OTHER';
  selectedSafePoint: SafePoint | null;
  onSelectSafePoint: (safePoint: SafePoint) => void;
  safePoints: SafePoint[];
}

export function HazardMapCanvas({
  mode,
  targetPerson,
  selectedSafePoint,
  onSelectSafePoint,
  safePoints,
}: HazardMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const markersRef = useRef<(google.maps.Marker | google.maps.marker.AdvancedMarkerElement)[]>([]);
  const modeRef = useRef(mode);

  // 1. Initialize Google Maps instance
  useEffect(() => {
    let isCancelled = false;

    loadGoogleMaps()
      .then((maps) => {
        if (isCancelled || !containerRef.current) return;

        const center = {
          lat: DINGBOCHE_COORDINATES[1],
          lng: DINGBOCHE_COORDINATES[0],
        };

        const map = new maps.Map(containerRef.current, {
          mapId: 'DEMO_MAP_ID',
          center,
          zoom: 14,
          mapTypeId: 'terrain',
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: maps.ControlPosition.TOP_RIGHT,
            mapTypeIds: ['terrain', 'satellite', 'hybrid', 'roadmap'],
          },
          zoomControl: true,
          zoomControlOptions: {
            position: maps.ControlPosition.RIGHT_BOTTOM,
          },
        });

        mapRef.current = map;

        // A. GLOF Inundation Hazard Polygon
        const hazardFeature = HAZARD_INUNDATION_GEOJSON.features[0];
        if (hazardFeature && hazardFeature.geometry.type === 'Polygon') {
          const hazardPaths = hazardFeature.geometry.coordinates[0].map(([lng, lat]) => ({
            lat,
            lng,
          }));

          const polygon = new maps.Polygon({
            paths: hazardPaths,
            strokeColor: Colors.alarmRed,
            strokeOpacity: 0.9,
            strokeWeight: 2.5,
            fillColor: Colors.alarmRed,
            fillOpacity: modeRef.current === 'EVACUATE' ? 0.35 : 0.2,
            map,
            zIndex: 2,
          });

          polygonRef.current = polygon;
        }

        // B. Safe Escape Route Polylines
        const routeFeature = SAFE_ESCAPE_ROUTE_GEOJSON.features[0];
        if (routeFeature && routeFeature.geometry.type === 'LineString') {
          const routeCoords = routeFeature.geometry.coordinates.map(([lng, lat]) => ({
            lat,
            lng,
          }));

          // White casing underlay for contrast
          new maps.Polyline({
            path: routeCoords,
            strokeColor: '#FFFFFF',
            strokeOpacity: 0.95,
            strokeWeight: 7,
            map,
            zIndex: 3,
          });

          // Active cirque teal route line
          new maps.Polyline({
            path: routeCoords,
            strokeColor: Colors.cirqueTeal,
            strokeOpacity: 1.0,
            strokeWeight: 4,
            map,
            zIndex: 4,
          });
        }
      })
      .catch((err) => {
        console.error('[Google Maps Web] Failed to initialize Google Maps:', err);
      });

    return () => {
      isCancelled = true;
      markersRef.current.forEach((m) => {
        if ('setMap' in m && typeof m.setMap === 'function') {
          m.setMap(null);
        } else if ('map' in m) {
          (m as google.maps.marker.AdvancedMarkerElement).map = null;
        }
      });
      markersRef.current = [];
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
      }
    };
  }, []);

  // 2. Update Hazard Polygon Fill Opacity on Mode Change
  useEffect(() => {
    modeRef.current = mode;
    if (polygonRef.current) {
      polygonRef.current.setOptions({
        fillOpacity: mode === 'EVACUATE' ? 0.35 : 0.2,
      });
    }
  }, [mode]);

  // 3. Render Markers (Resident + Safe Shelters)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof window === 'undefined' || !window.google?.maps) return;

    // Clear previous markers
    markersRef.current.forEach((m) => {
      if ('setMap' in m && typeof m.setMap === 'function') {
        m.setMap(null);
      } else if ('map' in m) {
        (m as google.maps.marker.AdvancedMarkerElement).map = null;
      }
    });
    markersRef.current = [];

    const maps = window.google.maps;

    // A. User Location Pin
    const userPos = {
      lat: DINGBOCHE_COORDINATES[1],
      lng: DINGBOCHE_COORDINATES[0],
    };

    const userLabel =
      targetPerson === 'ME'
        ? 'You • Dingboche (4,410m)'
        : 'Meena • Dingboche (4,410m)';

    if (maps.marker?.AdvancedMarkerElement) {
      const pin = new maps.marker.PinElement({
        background: Colors.meltwater,
        borderColor: '#FFFFFF',
        glyphColor: '#FFFFFF',
        scale: 0.9,
      });
      const userMarker = new maps.marker.AdvancedMarkerElement({
        position: userPos,
        map,
        title: userLabel,
        content: pin.element,
        zIndex: 10,
      });
      markersRef.current.push(userMarker);
    } else {
      const userMarker = new maps.Marker({
        position: userPos,
        map,
        title: userLabel,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: Colors.meltwater,
          fillOpacity: 1.0,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
        },
        zIndex: 10,
      });
      markersRef.current.push(userMarker);
    }

    // B. Safe Points Markers
    safePoints.forEach((sp) => {
      const isSelected = selectedSafePoint?.pointId === sp.pointId;

      if (maps.marker?.AdvancedMarkerElement) {
        const pin = new maps.marker.PinElement({
          background: isSelected ? Colors.cirqueTeal : '#0F6CBD',
          borderColor: '#FFFFFF',
          glyphColor: '#FFFFFF',
          scale: isSelected ? 1.15 : 0.9,
        });
        const spMarker = new maps.marker.AdvancedMarkerElement({
          position: {
            lat: sp.coordinates.latitude,
            lng: sp.coordinates.longitude,
          },
          map,
          title: `${sp.name} (+${sp.elevationGainM}m)`,
          content: pin.element,
          zIndex: isSelected ? 20 : 10,
        });

        spMarker.addListener('click', () => {
          onSelectSafePoint(sp);
          map.panTo({
            lat: sp.coordinates.latitude,
            lng: sp.coordinates.longitude,
          });
          map.setZoom(15);
        });

        markersRef.current.push(spMarker);
      } else {
        const spMarker = new maps.Marker({
          position: {
            lat: sp.coordinates.latitude,
            lng: sp.coordinates.longitude,
          },
          map,
          title: `${sp.name} (+${sp.elevationGainM}m)`,
          label: {
            text: '▲',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: 'bold',
          },
          icon: {
            path: maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: isSelected ? 6.5 : 5.5,
            fillColor: isSelected ? Colors.cirqueTeal : '#0F6CBD',
            fillOpacity: 1.0,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
          zIndex: isSelected ? 20 : 10,
        });

        spMarker.addListener('click', () => {
          onSelectSafePoint(sp);
          map.panTo({
            lat: sp.coordinates.latitude,
            lng: sp.coordinates.longitude,
          });
          map.setZoom(15);
        });

        markersRef.current.push(spMarker);
      }
    });
  }, [safePoints, selectedSafePoint, targetPerson, onSelectSafePoint]);

  // 4. Pan to selected Safe Point when changed externally
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedSafePoint) return;

    map.panTo({
      lat: selectedSafePoint.coordinates.latitude,
      lng: selectedSafePoint.coordinates.longitude,
    });
    map.setZoom(15);
  }, [selectedSafePoint]);

  return (
    <View style={styles.container}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          inset: 0,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 480,
    width: '100%',
    position: 'relative',
    backgroundColor: '#0F1A24',
    overflow: 'hidden',
  },
});
