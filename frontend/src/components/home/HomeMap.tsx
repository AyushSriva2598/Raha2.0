import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, {
  Marker,
  Circle,
  Polyline,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import { ShieldCheck, AlertTriangle } from 'lucide-react-native';
import { Colors, Typography, Radii, Shadows } from '@/constants/theme';
import { Pill } from '@/components/common/Pill';
import { LakeConfig } from '@/constants/lakes';
import { SAFE_ESCAPE_ROUTE_GEOJSON } from '@/constants/geoData';

export interface HomeMapProps {
  lake: LakeConfig;
  mapType?: 'standard' | 'satellite' | 'terrain';
  bottomSheetHeight?: number;
}

export function HomeMap({
  lake,
  mapType = 'terrain',
  bottomSheetHeight = 424,
}: HomeMapProps) {
  const mapRef = useRef<MapView>(null);

  // User location at Dingboche settlement
  const userLocation = {
    latitude: 27.8938,
    longitude: 86.8315,
  };

  // Safe High Ground destination
  const highGroundLocation = {
    latitude: 27.8965,
    longitude: 86.8315,
  };

  // Recent flood incident location
  const recentFloodLocation = {
    latitude: 27.8912,
    longitude: 86.8370,
  };

  // Safe Escape Route points (white casing + green dashed line)
  const escapeFeature = SAFE_ESCAPE_ROUTE_GEOJSON.features[0];
  const rawCoords = ((escapeFeature.geometry as any)?.coordinates || []) as [number, number][];
  const safeRouteCoords = rawCoords.map(([lng, lat]) => ({
    latitude: lat,
    longitude: lng,
  }));

  // Focus region
  const initialRegion: Region = {
    latitude: 27.8945,
    longitude: 86.8335,
    latitudeDelta: 0.016,
    longitudeDelta: 0.016,
  };

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: 27.8945,
        longitude: 86.8335,
        latitudeDelta: 0.016,
        longitudeDelta: 0.016,
      }, 800);
    }
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        initialRegion={initialRegion}
        showsCompass={false}
        showsMyLocationButton={false}
        showsTraffic={false}
        toolbarEnabled={false}
        mapPadding={{
          top: 90,
          bottom: bottomSheetHeight + (Platform.OS === 'android' ? 70 : 84),
          left: 16,
          right: 16,
        }}>
        {/* 1. Flood Inundation Buffer Circle (Teal #7EDBE8 at 38%, stroke #46B4CE) */}
        <Circle
          center={{
            latitude: lake.coordinates[1],
            longitude: lake.coordinates[0],
          }}
          radius={1200}
          fillColor="rgba(126, 219, 232, 0.38)"
          strokeColor="#46B4CE"
          strokeWidth={2.5}
        />

        {/* Valley Floor Inundation Reach Circle */}
        <Circle
          center={{
            latitude: 27.8915,
            longitude: 86.8340,
          }}
          radius={480}
          fillColor="rgba(126, 219, 232, 0.38)"
          strokeColor="#46B4CE"
          strokeWidth={2}
        />

        {/* 2. Green Safe Route: White Casing Line (7px) */}
        <Polyline
          coordinates={safeRouteCoords}
          strokeColor="#FFFFFF"
          strokeWidth={7}
          lineCap="round"
          lineJoin="round"
          zIndex={10}
        />

        {/* 2b. Green Safe Route: Green Dashed Line (4px) */}
        <Polyline
          coordinates={safeRouteCoords}
          strokeColor={Colors.safe}
          strokeWidth={4}
          lineDashPattern={[10, 6]}
          lineCap="round"
          lineJoin="round"
          zIndex={11}
        />

        {/* 3. Destination Marker with "High ground" label */}
        <Marker
          coordinate={highGroundLocation}
          anchor={{ x: 0.5, y: 0.9 }}
          zIndex={20}>
          <View style={styles.highGroundMarker}>
            <View style={styles.highGroundIconCircle}>
              <ShieldCheck size={14} color="#FFFFFF" strokeWidth={2.6} />
            </View>
            <Text style={styles.highGroundText}>High ground (+180m)</Text>
          </View>
        </Marker>

        {/* 4. Recent Flood Report Red Pill: "Flood · 2 h ago" */}
        <Marker
          coordinate={recentFloodLocation}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={15}>
          <Pill
            label="Flood · 2 h ago"
            variant="danger"
            size="sm"
            icon={<AlertTriangle size={12} color={Colors.dangerDark} />}
            style={styles.floodReportPill}
          />
        </Marker>

        {/* 5. User Dot with Accuracy Halo */}
        <Circle
          center={userLocation}
          radius={50}
          fillColor="rgba(37, 99, 235, 0.18)"
          strokeColor="rgba(37, 99, 235, 0.35)"
          strokeWidth={1.5}
          zIndex={14}
        />
        <Marker
          coordinate={userLocation}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={25}>
          <View style={styles.userDotHalo}>
            <View style={styles.userDotCore} />
          </View>
        </Marker>
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  // User Location Pin
  userDotHalo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(37, 99, 235, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Shadows.card,
  },
  userDotCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.you, // #2563EB
  },

  // High Ground Destination Marker
  highGroundMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.safe,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.chip,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Shadows.card,
  },
  highGroundIconCircle: {
    marginRight: 6,
  },
  highGroundText: {
    fontFamily: Typography.family.bold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // Flood Report Pill
  floodReportPill: {
    ...Shadows.card,
    backgroundColor: '#FFFFFF',
    borderColor: Colors.danger,
    borderWidth: 1.5,
  },
});
