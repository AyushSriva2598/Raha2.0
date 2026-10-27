import { DestinationPin, YouPin } from '@/components/common/MapPins';
import { RAHA_MAP_STYLE } from '@/constants/mapStyle';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Pencil } from 'lucide-react-native';
import { Colors, Typography } from '@/constants/theme';
import {
  getLakeCircleStyle,
  LakeMarkerPill,
  LakeHazardZone,
} from '@/components/common/LakeCircle';
import { ComputedRoute, RouteCoordinate } from '@/services/routeCalculator';
import { useMapScale } from '@/hooks/use-map-scale';

export type NavigateMapType = 'standard' | 'satellite' | 'terrain';

export interface NavigateMapProps {
  origin: RouteCoordinate;
  originName: string;
  destination: RouteCoordinate | null;
  destinationName: string;
  hazardZones: LakeHazardZone[];
  routes: ComputedRoute[];
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
  mapType: NavigateMapType;
  /** Space covered by overlays, so the route is framed inside the visible map. */
  insets: { top: number; bottom: number };
  onPressOrigin?: () => void;
  onPressDestination?: () => void;
}

const INITIAL_DELTA = 0.2;

export function NavigateMap({
  origin,
  originName,
  destination,
  destinationName,
  hazardZones,
  routes,
  selectedRouteId,
  onSelectRoute,
  mapType,
  insets,
  onPressOrigin,
  onPressDestination,
}: NavigateMapProps) {
  const mapRef = useRef<MapView>(null);
  const { scale, tracksViewChanges, onRegionChangeComplete } = useMapScale(INITIAL_DELTA);
  const inRouteMode = destination !== null && routes.length > 0;

  const initialRegion: Region = {
    latitude: origin.latitude - 0.03,
    longitude: origin.longitude - 0.04,
    latitudeDelta: INITIAL_DELTA,
    longitudeDelta: INITIAL_DELTA,
  };

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  useEffect(() => {
    if (!mapRef.current) return;
    const timer = setTimeout(() => {
      if (inRouteMode && selectedRoute) {
        mapRef.current?.fitToCoordinates(selectedRoute.coordinates, {
          edgePadding: { top: insets.top, bottom: insets.bottom, left: 48, right: 48 },
          animated: true,
        });
      } else {
        mapRef.current?.animateToRegion(
          { ...initialRegion, latitude: origin.latitude, longitude: origin.longitude },
          500
        );
      }
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRouteMode, selectedRoute?.id, origin.latitude, origin.longitude, insets.top, insets.bottom]);

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
        toolbarEnabled={false}>
        {hazardZones.map((zone) => {
          const style = getLakeCircleStyle(zone.riskLevel);
          return (
            <React.Fragment key={zone.id}>
              <Circle
                center={{ latitude: zone.latitude, longitude: zone.longitude }}
                radius={zone.radiusMeters}
                fillColor={style.fillColor}
                strokeColor={style.strokeColor}
                strokeWidth={style.strokeWidth}
                lineDashPattern={style.lineDashPattern}
                zIndex={1}
              />
              <Marker
                coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={tracksViewChanges}
                zIndex={2}>
                <View style={[styles.markerBox, { transform: [{ scale }] }]}>
                  <LakeMarkerPill name={zone.name} riskLevel={zone.riskLevel} />
                </View>
              </Marker>
            </React.Fragment>
          );
        })}

        {inRouteMode &&
          routes.map((route) => {
            const isSelected = route.id === selectedRouteId;
            const dash = route.type === 'shortest' ? [9, 7] : undefined;
            if (!isSelected) {
              return (
                <Polyline
                  key={route.id}
                  coordinates={route.coordinates}
                  strokeColor={route.color}
                  strokeWidth={px(4)}
                  lineDashPattern={dash}
                  tappable
                  onPress={() => onSelectRoute(route.id)}
                  zIndex={5}
                />
              );
            }
            return (
              <React.Fragment key={route.id}>
                <Polyline
                  coordinates={route.coordinates}
                  strokeColor="#FFFFFF"
                  strokeWidth={px(10)}
                  zIndex={10}
                />
                <Polyline
                  coordinates={route.coordinates}
                  strokeColor={route.color}
                  strokeWidth={px(6)}
                  lineDashPattern={dash}
                  tappable
                  onPress={() => onSelectRoute(route.id)}
                  zIndex={11}
                />
              </React.Fragment>
            );
          })}

        {/* Origin: blue dot, plus a name chip once a route is planned */}
        <Marker
          coordinate={origin}
          anchor={inRouteMode ? { x: 0.5, y: 1 } : { x: 0.5, y: 0.5 }}
          tracksViewChanges={tracksViewChanges}
          zIndex={15}>
          <View style={[styles.markerBox, { transform: [{ scale }] }]}>
            {inRouteMode && (
              <Pressable onPress={onPressOrigin} style={styles.chip} accessibilityRole="button">
                <Text style={styles.chipText} numberOfLines={1}>
                  {originName}
                </Text>
                <Pencil size={13} color={Colors.ink} />
              </Pressable>
            )}
            <YouPin />
          </View>
        </Marker>

        {inRouteMode && destination && (
          <Marker
            coordinate={destination}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={tracksViewChanges}
            zIndex={16}>
            <View style={[styles.markerBox, { transform: [{ scale }] }]}>
              <Pressable onPress={onPressDestination} style={styles.chip} accessibilityRole="button">
                <Text style={styles.chipText} numberOfLines={1}>
                  {destinationName}
                </Text>
                <Pencil size={13} color={Colors.ink} />
              </Pressable>
              <DestinationPin />
            </View>
          </Marker>
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Padding keeps scaled content inside the native marker bitmap
  markerBox: { padding: 6, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 190,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#7A2A22',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 4,
  },
  chipText: {
    flexShrink: 1,
    fontFamily: Typography.family.bold,
    fontSize: 13,
    color: Colors.ink,
  },
});
