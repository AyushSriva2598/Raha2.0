import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Polygon, Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { Colors } from '@/constants/tokens';
import { SafePoint } from '@/types';
import { LakeConfig } from '@/constants/lakes';
import { DownstreamReachConfig } from '@/constants/downstreamReaches';
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
  lake?: LakeConfig;
  reach?: DownstreamReachConfig;
}

export function HazardMapCanvas({
  mode,
  targetPerson,
  selectedSafePoint,
  onSelectSafePoint,
  safePoints,
  lake,
  reach,
}: HazardMapCanvasProps) {
  const mapRef = useRef<MapView>(null);

  // Settlement location: dynamic if lake provided, else Dingboche
  const settlementCoords = useMemo(() => {
    if (lake?.primarySettlement?.coordinates) {
      return {
        latitude: lake.primarySettlement.coordinates[1],
        longitude: lake.primarySettlement.coordinates[0],
      };
    }
    return {
      latitude: DINGBOCHE_COORDINATES[1],
      longitude: DINGBOCHE_COORDINATES[0],
    };
  }, [lake]);

  // Convert Hazard Inundation Corridor Polygon to { latitude, longitude }
  const hazardPolygonCoords = useMemo(() => {
    if (reach?.inundationCorridor && reach.inundationCorridor.length > 0) {
      return reach.inundationCorridor.map(([lng, lat]) => ({
        latitude: lat,
        longitude: lng,
      }));
    }
    const feature = HAZARD_INUNDATION_GEOJSON.features[0];
    if (feature && feature.geometry.type === 'Polygon') {
      return feature.geometry.coordinates[0].map(([lng, lat]) => ({
        latitude: lat,
        longitude: lng,
      }));
    }
    return [];
  }, [reach]);

  // Convert Safe Escape Ridge Route to { latitude, longitude }
  const escapeRouteCoords = useMemo(() => {
    if (reach?.safeRidgePath && reach.safeRidgePath.length > 0) {
      return reach.safeRidgePath.map(([lng, lat]) => ({
        latitude: lat,
        longitude: lng,
      }));
    }
    const feature = SAFE_ESCAPE_ROUTE_GEOJSON.features[0];
    if (feature && feature.geometry.type === 'LineString') {
      return feature.geometry.coordinates.map(([lng, lat]) => ({
        latitude: lat,
        longitude: lng,
      }));
    }
    return [];
  }, [reach]);

  const initialRegion: Region = useMemo(
    () => ({
      latitude: settlementCoords.latitude,
      longitude: settlementCoords.longitude,
      latitudeDelta: 0.045,
      longitudeDelta: 0.045,
    }),
    [settlementCoords]
  );

  // Pan when lake changes
  useEffect(() => {
    if (mapRef.current && settlementCoords) {
      mapRef.current.animateToRegion(
        {
          latitude: settlementCoords.latitude,
          longitude: settlementCoords.longitude,
          latitudeDelta: 0.045,
          longitudeDelta: 0.045,
        },
        800
      );
    }
  }, [settlementCoords]);

  // Smoothly pan and zoom camera when a safe point is selected
  useEffect(() => {
    if (selectedSafePoint && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: selectedSafePoint.coordinates.latitude,
          longitude: selectedSafePoint.coordinates.longitude,
          latitudeDelta: 0.022,
          longitudeDelta: 0.022,
        },
        900
      );
    }
  }, [selectedSafePoint]);

  const settlementName = lake?.primarySettlement?.name || 'Dingboche';
  const settlementElev = lake?.primarySettlement?.elevationM || 4410;
  const safeHavenName = lake?.primarySafeHaven?.name || 'North Ridge Gompa';
  const safeHavenGain = lake?.primarySafeHaven?.elevationGainM || 210;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        showsCompass={true}
        showsScale={true}
        mapType="standard"
        loadingEnabled={true}
        loadingBackgroundColor="#E8ECEF"
        loadingIndicatorColor={Colors.cirqueTeal}>

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
            <Polyline
              coordinates={escapeRouteCoords}
              strokeColor="#FFFFFF"
              strokeWidth={7}
              lineCap="round"
              lineJoin="round"
              zIndex={3}
            />
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

        {/* 3. Primary Settlement User Location Marker */}
        <Marker
          coordinate={settlementCoords}
          title={targetPerson === 'ME' ? 'Your Location' : 'Contact Location'}
          description={`${settlementName} (${settlementElev.toLocaleString()}m)`}
          zIndex={10}>
          <View style={styles.userMarkerContainer}>
            <View style={styles.userDot} />
            <View style={styles.userPill}>
              <Text style={styles.userPillText}>
                {targetPerson === 'ME' ? `You • ${settlementName}` : `Contact • ${settlementName}`}
              </Text>
            </View>
          </View>
        </Marker>

        {/* 4. Safe Haven Marker (Ridge Destination) */}
        {escapeRouteCoords.length > 0 && (
          <Marker
            coordinate={escapeRouteCoords[escapeRouteCoords.length - 1]}
            title={safeHavenName}
            description={`+${safeHavenGain}m High Ground (100% Solid Bedrock)`}
            zIndex={15}>
            <View style={styles.spMarkerContainer}>
              <View style={[styles.spBadge, styles.spBadgeSelected]}>
                <Text style={styles.spBadgeText}>▲</Text>
              </View>
              <View style={[styles.spPill, styles.spPillSelected]}>
                <Text style={[styles.spPillText, styles.spPillTextSelected]}>
                  {safeHavenName} (+{safeHavenGain}m)
                </Text>
              </View>
            </View>
          </Marker>
        )}

        {/* 5. Additional Safe Points */}
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
    flex: 1,
    width: '100%',
    position: 'relative',
    backgroundColor: '#E8ECEF',
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
