import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors, Radii, Spacing, Shadows } from '@/constants/tokens';
import { Maximize2 } from 'lucide-react-native';
import { router } from 'expo-router';
import {
  DINGBOCHE_COORDINATES,
  HAZARD_INUNDATION_GEOJSON,
} from '@/constants/geoData';

interface MiniMapCardProps {
  onPress?: () => void;
  basinTitle?: string;
  userLocationText?: string;
  lakeDistText?: string;
}

export function MiniMapCard({
  onPress,
  basinTitle = 'Basin Hydrology View',
  userLocationText = 'You • Dingboche (4,410m)',
  lakeDistText = 'Lake dist: 7.2 km',
}: MiniMapCardProps) {
  console.log('🌍 [HELLO WORLD] MiniMapCard (Mobile Native) is RENDERING!', {
    basinTitle,
    userLocationText,
    platform: Platform.OS,
  });

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/map' as any);
    }
  };

  const hazardCoords = useMemo(() => {
    const feature = HAZARD_INUNDATION_GEOJSON.features[0];
    if (feature && feature.geometry.type === 'Polygon') {
      return feature.geometry.coordinates[0].map(([lng, lat]) => ({
        latitude: lat,
        longitude: lng,
      }));
    }
    return [];
  }, []);

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={handlePress}>
      {/* Real Native MapView Thumbnail */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <MapView
          style={StyleSheet.absoluteFill}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={{
            latitude: DINGBOCHE_COORDINATES[1],
            longitude: DINGBOCHE_COORDINATES[0],
            latitudeDelta: 0.045,
            longitudeDelta: 0.045,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          mapType="standard"
          onMapReady={() => {
            console.log('🌍 [HELLO WORLD] MiniMapCard MapView ON_MAP_READY fired!');
          }}>

          {hazardCoords.length > 0 && (
            <Polygon
              coordinates={hazardCoords}
              strokeColor={Colors.warning}
              strokeWidth={2}
              fillColor="rgba(245, 158, 11, 0.35)"
              zIndex={2}
            />
          )}

          <Marker
            coordinate={{
              latitude: DINGBOCHE_COORDINATES[1],
              longitude: DINGBOCHE_COORDINATES[0],
            }}
            zIndex={10}>
            <View style={styles.miniUserPin} />
          </Marker>
        </MapView>
      </View>

      {/* Header Info Overlay */}
      <View style={styles.headerRow} pointerEvents="none">
        <View style={styles.titleBadge}>
          <Text style={styles.basinTitleText}>{basinTitle}</Text>
        </View>
        <View style={styles.maximizeButton}>
          <Maximize2 size={13} color={Colors.moraineInk} />
          <Text style={styles.tapToExpandText}>Expand Map</Text>
        </View>
      </View>

      {/* Bottom Footer Info Pill */}
      <View style={styles.footerRow} pointerEvents="none">
        <View style={styles.userLocationPill}>
          <View style={styles.livePulseDot} />
          <Text style={styles.userLocationText}>{userLocationText}</Text>
        </View>
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceBadgeText}>{lakeDistText}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 180,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(205, 219, 228, 0.8)',
    position: 'relative',
    backgroundColor: '#E8ECEF',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    ...Shadows.subtle,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  miniUserPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.meltwater,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: Colors.meltwater,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  titleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.full,
    ...Shadows.subtle,
  },
  basinTitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.moraineInk,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  maximizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.full,
    gap: 4,
    ...Shadows.subtle,
  },
  tapToExpandText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.moraineInk,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  userLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 24, 37, 0.9)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.full,
    gap: 6,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.cirqueTeal,
  },
  userLocationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  distanceBadge: {
    backgroundColor: 'rgba(14, 24, 37, 0.9)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  distanceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#CBD5E1',
  },
});
