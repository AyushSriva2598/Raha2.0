import { YouPin, ZoneBeacon } from '@/components/common/MapPins';
import { RAHA_MAP_STYLE } from '@/constants/mapStyle';
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, {
  Marker,
  Circle,
  Polyline,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import { ShieldCheck, AlertTriangle, Waves } from 'lucide-react-native';
import { Colors, Typography, Radii, Shadows } from '@/constants/theme';
import { Pill } from '@/components/common/Pill';
import { LakeConfig } from '@/constants/lakes';
import {
  CHUNGTHANG_ESCAPE_ROUTE,
  CHUNGTHANG_FLOOD_REPORT,
  CHUNGTHANG_HIGH_GROUND,
  TEESTA_FLOOD_CORRIDOR,
} from '@/constants/geoData';
import { useMapScale } from '@/hooks/use-map-scale';

export interface HomeMapProps {
  lake: LakeConfig;
  mapType?: 'standard' | 'satellite' | 'terrain';
  bottomSheetHeight?: number;
}

const INITIAL_DELTA = 0.05;

export function HomeMap({ lake, mapType = 'standard', bottomSheetHeight = 340 }: HomeMapProps) {
  const mapRef = useRef<MapView>(null);
  const { scale, tracksViewChanges, onRegionChangeComplete } = useMapScale(INITIAL_DELTA);

  // The resident's position: the primary settlement of the active lake (Chungthang for South Lhonak)
  const userLocation = {
    latitude: lake.primarySettlement.coordinates[1],
    longitude: lake.primarySettlement.coordinates[0],
  };

  const initialRegion: Region = {
    latitude: userLocation.latitude - 0.012,
    longitude: userLocation.longitude - 0.01,
    latitudeDelta: INITIAL_DELTA,
    longitudeDelta: INITIAL_DELTA,
  };

  useEffect(() => {
    mapRef.current?.animateToRegion(initialRegion, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lake.id]);

  const px = (base: number) => Math.max(2, Math.round(base * scale));

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        customMapStyle={mapType === 'standard' ? RAHA_MAP_STYLE : undefined}
        initialRegion={initialRegion}
        onRegionChangeComplete={onRegionChangeComplete}
        showsCompass={false}
        showsMyLocationButton={false}
        showsTraffic={false}
        toolbarEnabled={false}
        mapPadding={{
          top: 64,
          bottom: bottomSheetHeight,
          left: 12,
          right: 12,
        }}>
        {/* Simulated flood corridor along the Teesta: wide translucent stroke plus a thin core */}
        <Polyline
          coordinates={TEESTA_FLOOD_CORRIDOR}
          strokeColor="rgba(70, 180, 206, 0.35)"
          strokeWidth={px(18)}
          lineCap="round"
          lineJoin="round"
          zIndex={3}
        />
        <Polyline
          coordinates={TEESTA_FLOOD_CORRIDOR}
          strokeColor="#46B4CE"
          strokeWidth={px(3)}
          lineCap="round"
          lineJoin="round"
          zIndex={4}
        />

        {/* Settlement flood reach */}
        <Circle
          center={userLocation}
          radius={700}
          fillColor="rgba(126, 219, 232, 0.30)"
          strokeColor="#46B4CE"
          strokeWidth={2}
          zIndex={2}
        />

        {/* Safe escape route: white casing + dashed green */}
        <Polyline
          coordinates={CHUNGTHANG_ESCAPE_ROUTE}
          strokeColor="#FFFFFF"
          strokeWidth={px(7)}
          lineCap="round"
          lineJoin="round"
          zIndex={10}
        />
        <Polyline
          coordinates={CHUNGTHANG_ESCAPE_ROUTE}
          strokeColor={Colors.safe}
          strokeWidth={px(4)}
          lineDashPattern={[10, 6]}
          lineCap="round"
          lineJoin="round"
          zIndex={11}
        />

        {/* High ground destination */}
        <Marker
          coordinate={CHUNGTHANG_HIGH_GROUND}
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges={tracksViewChanges}
          zIndex={20}>
          <View style={[styles.markerScale, { transform: [{ scale }] }]}>
            <View style={styles.highGroundMarker}>
              <ShieldCheck size={14} color="#FFFFFF" strokeWidth={2.6} />
              <Text style={styles.highGroundText}>High ground</Text>
            </View>
          </View>
        </Marker>

        {/* Recent flood report */}
        <Marker
          coordinate={CHUNGTHANG_FLOOD_REPORT}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={tracksViewChanges}
          zIndex={15}>
          <View style={[styles.markerScale, { transform: [{ scale }] }]}>
            <Pill
              label="Flood · 2 h ago"
              variant="danger"
              size="sm"
              icon={<AlertTriangle size={12} color={Colors.dangerDark} />}
              style={styles.floodReportPill}
            />
          </View>
        </Marker>

        {/* Source lake: a fixed-size ring so it can be found at any zoom, with its name pill on top */}
        <Marker
          coordinate={{ latitude: lake.coordinates[1], longitude: lake.coordinates[0] }}
          anchor={{ x: 0.5, y: 0.5 }}
          flat={false}
          tracksViewChanges={tracksViewChanges}
          zIndex={11}>
          <ZoneBeacon color={Colors.danger} />
        </Marker>

        {/* Source lake name */}
        <Marker
          coordinate={{ latitude: lake.coordinates[1], longitude: lake.coordinates[0] }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={tracksViewChanges}
          zIndex={12}>
          <View style={[styles.markerScale, { transform: [{ scale }] }]}>
            <View style={styles.lakeMarker}>
              <Waves size={13} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.highGroundText}>{lake.name}</Text>
            </View>
          </View>
        </Marker>

        {/* User position with accuracy halo */}
        <Circle
          center={userLocation}
          radius={60}
          fillColor="rgba(37, 99, 235, 0.18)"
          strokeColor="rgba(37, 99, 235, 0.35)"
          strokeWidth={1.5}
          zIndex={14}
        />
        <Marker
          coordinate={userLocation}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={tracksViewChanges}
          zIndex={25}>
          <View style={[styles.markerScale, { transform: [{ scale }] }]}>
            <YouPin />
          </View>
        </Marker>
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Padding keeps scaled markers from being clipped by the native marker bitmap bounds
  markerScale: { padding: 6, alignItems: 'center', justifyContent: 'center' },
  highGroundMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.safe,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radii.chip,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Shadows.card,
  },
  lakeMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.danger,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radii.chip,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Shadows.card,
  },
  highGroundText: {
    fontFamily: Typography.family.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  floodReportPill: {
    ...Shadows.card,
    backgroundColor: '#FFFFFF',
    borderColor: Colors.danger,
    borderWidth: 1.5,
  },
});
