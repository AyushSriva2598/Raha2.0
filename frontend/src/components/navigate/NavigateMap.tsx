import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, Polygon, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { DestinationPin, PinDrop, YouPin } from '@/components/common/MapPins';
import { getLakeCircleStyle, LakeMarkerPill } from '@/components/common/LakeCircle';
import { RAHA_MAP_STYLE } from '@/constants/mapStyle';
import { corridorRing, hazardLabelPoint, type FloodHazard } from '@/constants/floodHazards';
import { ComputedRoute, RouteCoordinate } from '@/services/routeCalculator';
import { useMapScale } from '@/hooks/use-map-scale';

export type NavigateMapType = 'standard' | 'satellite' | 'terrain';

export interface NavigateMapProps {
  origin: RouteCoordinate;
  destination: RouteCoordinate | null;
  hazards: FloodHazard[];
  routes: ComputedRoute[];
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
  mapType: NavigateMapType;
  /** Space covered by overlays, so the trip is framed inside the visible map. */
  insets: { top: number; bottom: number };
  /** Bump to re-frame the camera on the trip (or on you). */
  recenterKey: number;
}

const INITIAL_DELTA = 0.2;

export function NavigateMap({
  origin,
  destination,
  hazards,
  routes,
  selectedRouteId,
  onSelectRoute,
  mapType,
  insets,
  recenterKey,
}: NavigateMapProps) {
  const mapRef = useRef<MapView>(null);
  const { scale, tracksViewChanges, onRegionChangeComplete } = useMapScale(INITIAL_DELTA);
  const inRouteMode = destination !== null && routes.length > 0;
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const labels = useMemo(() => hazards.map((h) => ({ h, at: hazardLabelPoint(h) })), [hazards]);

  const initialRegion: Region = {
    latitude: origin.latitude,
    longitude: origin.longitude,
    latitudeDelta: INITIAL_DELTA,
    longitudeDelta: INITIAL_DELTA,
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const edgePadding = { top: insets.top, bottom: insets.bottom, left: 48, right: 64 };
      if (inRouteMode && selectedRoute) {
        mapRef.current?.fitToCoordinates(selectedRoute.coordinates, { edgePadding, animated: true });
      } else if (destination) {
        mapRef.current?.fitToCoordinates([origin, destination], { edgePadding, animated: true });
      } else {
        mapRef.current?.animateToRegion(initialRegion, 450);
      }
    }, 120);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRouteMode, selectedRoute?.id, origin.latitude, origin.longitude, destination?.latitude, destination?.longitude, insets.bottom, recenterKey]);

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
        {hazards.map((h) => {
          const style = getLakeCircleStyle(h.riskLevel);
          return h.kind === 'circle' ? (
            <Circle
              key={h.id}
              center={{ latitude: h.latitude, longitude: h.longitude }}
              radius={h.radiusMeters}
              fillColor={style.fillColor}
              strokeColor={style.strokeColor}
              strokeWidth={style.strokeWidth}
              lineDashPattern={style.lineDashPattern}
              zIndex={1}
            />
          ) : (
            <Polygon
              key={h.id}
              coordinates={corridorRing(h)}
              fillColor={style.fillColor}
              strokeColor={style.strokeColor}
              strokeWidth={1}
              zIndex={1}
            />
          );
        })}

        {/* Names only while browsing; during a trip the sheet names any zone the road touches. */}
        {!destination &&
          labels.map(({ h, at }) => (
            <Marker key={`label-${h.id}`} coordinate={at} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={tracksViewChanges} zIndex={2}>
              <View style={styles.markerBox}>
                <LakeMarkerPill name={h.name} riskLevel={h.riskLevel} scale={scale} />
                <PinDrop color={getLakeCircleStyle(h.riskLevel).strokeColor} scale={scale} />
              </View>
            </Marker>
          ))}

        {/* Roads: the chosen one solid with a white edge on top, the others faded and tappable. */}
        {inRouteMode &&
          routes
            .filter((r) => r.id !== selectedRoute?.id)
            .map((route) => (
              <Polyline
                key={route.id}
                coordinates={route.coordinates}
                strokeColor={`${route.color}99`}
                strokeWidth={px(5)}
                lineCap="round"
                lineJoin="round"
                tappable
                onPress={() => onSelectRoute(route.id)}
                zIndex={5}
              />
            ))}
        {inRouteMode && selectedRoute && (
          <>
            <Polyline coordinates={selectedRoute.coordinates} strokeColor="#FFFFFF" strokeWidth={px(11)} lineCap="round" lineJoin="round" zIndex={10} />
            <Polyline coordinates={selectedRoute.coordinates} strokeColor={selectedRoute.color} strokeWidth={px(6)} lineCap="round" lineJoin="round" zIndex={11} />
          </>
        )}

        <Marker coordinate={origin} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={tracksViewChanges} zIndex={15}>
          <View style={styles.markerBox}>
            <YouPin scale={scale} />
          </View>
        </Marker>
        {destination && (
          <Marker coordinate={destination} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={tracksViewChanges} zIndex={16}>
            <View style={styles.markerBox}>
              <DestinationPin scale={scale} />
            </View>
          </Marker>
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Padding keeps content inside the native marker bitmap
  markerBox: { padding: 6, alignItems: 'center' },
});
