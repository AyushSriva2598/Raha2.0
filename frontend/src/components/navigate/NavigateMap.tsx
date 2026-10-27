import { DestinationPin, PinDrop, YouPin } from '@/components/common/MapPins';
import { RAHA_MAP_STYLE } from '@/constants/mapStyle';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE, Region } from 'react-native-maps';
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
      } else if (destination) {
        // Routes still loading (or failed): show both ends so the trip is clear.
        mapRef.current?.fitToCoordinates([origin, destination], {
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
  }, [inRouteMode, selectedRoute?.id, origin.latitude, origin.longitude, destination?.latitude, destination?.longitude, insets.top, insets.bottom]);

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
              {/* While planning a trip only the road and its two ends get pins; the zones stay as tinted
                  areas and the sheet names any the road crosses. */}
              {!destination && (
                <Marker
                  coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
                  anchor={{ x: 0.5, y: 1 }}
                  flat={false}
                  tracksViewChanges={tracksViewChanges}
                  zIndex={2}>
                  <View style={styles.markerBox}>
                    <LakeMarkerPill name={zone.name} riskLevel={zone.riskLevel} scale={scale} />
                    <PinDrop color={style.strokeColor} scale={scale} />
                  </View>
                </Marker>
              )}
            </React.Fragment>
          );
        })}

        {/* Roads: the selected one solid with a white edge on top; the others thinner and faded
            underneath, tappable to switch. Colour comes from the flood-zone check. */}
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
            <Polyline
              coordinates={selectedRoute.coordinates}
              strokeColor="#FFFFFF"
              strokeWidth={px(11)}
              lineCap="round"
              lineJoin="round"
              zIndex={10}
            />
            <Polyline
              coordinates={selectedRoute.coordinates}
              strokeColor={selectedRoute.color}
              strokeWidth={px(6)}
              lineCap="round"
              lineJoin="round"
              zIndex={11}
            />
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
  // Padding keeps scaled content inside the native marker bitmap
  markerBox: { padding: 6, alignItems: 'center' },
});
