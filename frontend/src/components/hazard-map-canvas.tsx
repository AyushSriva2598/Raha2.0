import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polygon, Polyline, PROVIDER_GOOGLE, UrlTile, type Region } from 'react-native-maps';
import { Colors } from '@/constants/tokens';
import { SafePoint } from '@/types';
import {
  DINGBOCHE_COORDINATES,
  HAZARD_INUNDATION_GEOJSON,
  SAFE_ESCAPE_ROUTE_GEOJSON,
} from '@/constants/geoData';

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
  const mapRef = useRef<MapView>(null);

  // Convert GeoJSON Polygon [lng, lat] to react-native-maps { latitude, longitude }
  const hazardPolygonCoords = useMemo(() => {
    const feature = HAZARD_INUNDATION_GEOJSON.features[0];
    if (feature && feature.geometry.type === 'Polygon') {
      return feature.geometry.coordinates[0].map(([lng, lat]) => ({
        latitude: lat,
        longitude: lng,
      }));
    }
    return [];
  }, []);

  // Convert GeoJSON LineString [lng, lat] to react-native-maps { latitude, longitude }
  const escapeRouteCoords = useMemo(() => {
    const feature = SAFE_ESCAPE_ROUTE_GEOJSON.features[0];
    if (feature && feature.geometry.type === 'LineString') {
      return feature.geometry.coordinates.map(([lng, lat]) => ({
        latitude: lat,
        longitude: lng,
      }));
    }
    return [];
  }, []);

  const initialRegion: Region = useMemo(
    () => ({
      latitude: DINGBOCHE_COORDINATES[1],
      longitude: DINGBOCHE_COORDINATES[0],
      latitudeDelta: 0.038,
      longitudeDelta: 0.038,
    }),
    []
  );

  // Smoothly pan and zoom camera when a safe point is selected
  useEffect(() => {
    if (selectedSafePoint && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: selectedSafePoint.coordinates.latitude,
          longitude: selectedSafePoint.coordinates.longitude,
          latitudeDelta: 0.018,
          longitudeDelta: 0.018,
        },
        900
      );
    }
  }, [selectedSafePoint]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsCompass={true}
        showsScale={true}
        mapType="terrain">
        {/* OpenStreetMap Tile Layer for crisp topography without requiring Google API Keys */}
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          zIndex={-1}
        />

        {/* 1. GLOF Inundation Hazard Polygon Corridor */}
        {hazardPolygonCoords.length > 0 && (
          <Polygon
            coordinates={hazardPolygonCoords}
            strokeColor={Colors.alarmRed}
            strokeWidth={2.5}
            fillColor={mode === 'EVACUATE' ? 'rgba(214, 69, 41, 0.35)' : 'rgba(214, 69, 41, 0.20)'}
            zIndex={2}
          />
        )}

        {/* 2. Safe Evacuation Escape Route (Ridge line) */}
        {escapeRouteCoords.length > 0 && (
          <>
            {/* White casing underlay for high visibility over mountain terrain */}
            <Polyline
              coordinates={escapeRouteCoords}
              strokeColor="#FFFFFF"
              strokeWidth={7}
              lineCap="round"
              lineJoin="round"
              zIndex={3}
            />
            {/* Active cirque teal escape route */}
            <Polyline
              coordinates={escapeRouteCoords}
              strokeColor={Colors.cirqueTeal}
              strokeWidth={4.5}
              lineCap="round"
              lineJoin="round"
              zIndex={4}
            />
          </>
        )}

        {/* 3. User Location Marker */}
        <Marker
          coordinate={{
            latitude: DINGBOCHE_COORDINATES[1],
            longitude: DINGBOCHE_COORDINATES[0],
          }}
          title={targetPerson === 'ME' ? 'Your Location' : 'Meena Location'}
          description="Dingboche (4,410m)"
          zIndex={10}>
          <View style={styles.userMarkerContainer}>
            <View style={styles.userDot} />
            <View style={styles.userPill}>
              <Text style={styles.userPillText}>
                {targetPerson === 'ME' ? 'You • Dingboche' : 'Meena • Dingboche'}
              </Text>
            </View>
          </View>
        </Marker>

        {/* 4. Safe Point Markers */}
        {safePoints.map((sp) => {
          const isSelected = selectedSafePoint?.pointId === sp.pointId;
          return (
            <Marker
              key={sp.pointId}
              coordinate={{
                latitude: sp.coordinates.latitude,
                longitude: sp.coordinates.longitude,
              }}
              title={sp.name}
              description={`+${sp.elevationGainM}m elevation`}
              onPress={() => onSelectSafePoint(sp)}
              zIndex={isSelected ? 20 : 10}>
              <View style={styles.spMarkerContainer}>
                <View style={[styles.spBadge, isSelected && styles.spBadgeSelected]}>
                  <Text style={styles.spBadgeText}>▲</Text>
                </View>
                <View style={[styles.spPill, isSelected && styles.spPillSelected]}>
                  <Text style={[styles.spPillText, isSelected && styles.spPillTextSelected]}>
                    {sp.name} (+{sp.elevationGainM}m)
                  </Text>
                </View>
              </View>
            </Marker>
          );
        })}
      </MapView>
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
  userMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.meltwater,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: Colors.meltwater,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  userPill: {
    backgroundColor: 'rgba(14, 24, 37, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  userPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  spMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0F6CBD',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  spBadgeSelected: {
    backgroundColor: Colors.cirqueTeal,
    transform: [{ scale: 1.15 }],
  },
  spBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  spPill: {
    backgroundColor: 'rgba(14, 24, 37, 0.92)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#0F6CBD',
  },
  spPillSelected: {
    borderColor: Colors.cirqueTeal,
  },
  spPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  spPillTextSelected: {
    color: Colors.cirqueTeal,
    fontWeight: '700',
  },
});
