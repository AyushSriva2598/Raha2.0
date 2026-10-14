/// <reference types="@types/google.maps" />

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, Radii, Spacing, Shadows } from '@/constants/tokens';
import { Maximize2 } from 'lucide-react-native';
import { router } from 'expo-router';
import {
  DINGBOCHE_COORDINATES,
  HAZARD_INUNDATION_GEOJSON,
} from '@/constants/geoData';
import { loadGoogleMaps } from '@/utils/loadGoogleMaps';

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
  console.log('🌐 [HELLO WORLD] MiniMapCard (Web) is RENDERING!');
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/map' as any);
    }
  };

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
          zoom: 12.2,
          mapTypeId: 'terrain',
          tilt: 0,
          heading: 0,
          disableDefaultUI: true,
          gestureHandling: 'none',
          keyboardShortcuts: false,
        });

        map.setTilt(0);
        map.setHeading(0);
        mapRef.current = map;

        // Add Hazard Polygon
        const hazardFeature = HAZARD_INUNDATION_GEOJSON.features[0];
        if (hazardFeature && hazardFeature.geometry.type === 'Polygon') {
          const hazardPaths = hazardFeature.geometry.coordinates[0].map(([lng, lat]) => ({
            lat,
            lng,
          }));

          new maps.Polygon({
            paths: hazardPaths,
            strokeColor: Colors.warning,
            strokeOpacity: 0.9,
            strokeWeight: 2,
            fillColor: Colors.warning,
            fillOpacity: 0.35,
            map,
            zIndex: 2,
          });
        }

        // Add User Location Pin using AdvancedMarkerElement
        const AdvancedMarker =
          maps.marker?.AdvancedMarkerElement ||
          (window.google?.maps as any)?.marker?.AdvancedMarkerElement;
        const Pin =
          maps.marker?.PinElement ||
          (window.google?.maps as any)?.marker?.PinElement;

        if (AdvancedMarker) {
          const pinElement = Pin
            ? (new Pin({
                background: Colors.meltwater,
                borderColor: '#FFFFFF',
                glyphColor: '#FFFFFF',
                scale: 0.7,
              }) as unknown as HTMLElement)
            : (() => {
                const el = document.createElement('div');
                el.style.width = '14px';
                el.style.height = '14px';
                el.style.borderRadius = '50%';
                el.style.backgroundColor = Colors.meltwater;
                el.style.border = '2.5px solid #FFFFFF';
                el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)';
                return el;
              })();

          new AdvancedMarker({
            position: center,
            map,
            title: userLocationText,
            content: pinElement,
            zIndex: 10,
          });
        }
      })
      .catch((err) => {
        console.error('[Google Maps Mini] Failed to initialize:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [userLocationText]);

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={handlePress}>
      {/* Real Google Maps Mini Canvas */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
          }}
        />
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
    backgroundColor: '#0F1A24',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    ...Shadows.subtle,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
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
