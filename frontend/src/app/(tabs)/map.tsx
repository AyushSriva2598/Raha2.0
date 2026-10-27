import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Text, ActivityIndicator } from 'react-native';
import { ArrowLeft, DownloadCloud, Flag, Layers, Route as RouteIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteSearchCard } from '@/components/navigate/RouteSearchCard';
import {
  PlaceSearchModal,
  PlaceItem,
  DEFAULT_ORIGIN,
  SIKKIM_PLACES,
} from '@/components/navigate/PlaceSearchModal';
import { NavigateMap, NavigateMapType } from '@/components/navigate/NavigateMap';
import { RouteBottomSheet } from '@/components/navigate/RouteBottomSheet';
import { OfflineMapSheet } from '@/components/common/OfflineMapSheet';
import { Colors, Typography } from '@/constants/theme';
import {
  classifyRoadRoutes,
  DEFAULT_HAZARD_ZONES,
  isSamePlace,
  RouteCalculationResult,
} from '@/services/routeCalculator';
import { fetchRoadRoutes } from '@/services/roadRouting';

const NEXT_MAP_TYPE: Record<NavigateMapType, NavigateMapType> = {
  standard: 'terrain',
  terrain: 'satellite',
  satellite: 'standard',
};
const MAP_TYPE_LABEL: Record<NavigateMapType, string> = {
  standard: 'Map',
  terrain: 'Terrain',
  satellite: 'Satellite',
};

// Two stages: pick a destination (compact bar, map fills the screen), then review routes
// (map on top with named pins, route list and Start button below).
export default function NavigateScreen() {
  const insets = useSafeAreaInsets();
  const [origin, setOrigin] = useState<PlaceItem>(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState<PlaceItem | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState('route-1');
  const [mapType, setMapType] = useState<NavigateMapType>('standard');
  const [searchTarget, setSearchTarget] = useState<'origin' | 'destination'>('destination');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOfflineOpen, setIsOfflineOpen] = useState(false);

  // Real road routes come from the backend. The result is keyed by the trip so a stale answer for an
  // earlier destination is never shown, and "loading" is simply "no answer for this trip yet".
  const [retryKey, setRetryKey] = useState(0);
  const [outcome, setOutcome] = useState<{ key: string; result?: RouteCalculationResult; error?: string } | null>(null);
  const sameSpot = destination !== null && isSamePlace(origin.coordinate, destination.coordinate);
  const tripKey = destination && !sameSpot ? `${origin.id}|${destination.id}|${retryKey}` : null;

  useEffect(() => {
    if (!tripKey || !destination) return;
    const controller = new AbortController();
    fetchRoadRoutes(origin.coordinate, destination.coordinate, controller.signal)
      .then((roads) => setOutcome({ key: tripKey, result: classifyRoadRoutes(roads, DEFAULT_HAZARD_ZONES) }))
      .catch((e: Error) => {
        if (!controller.signal.aborted) setOutcome({ key: tripKey, error: e.message });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripKey]);

  const current = tripKey && outcome?.key === tripKey ? outcome : null;
  const calculation: RouteCalculationResult | null = sameSpot
    ? { routes: [], isSameLocation: true, noHazardsOnAnyRoute: false }
    : (current?.result ?? null);
  const routeError = current?.error ?? null;
  const loadingRoutes = tripKey !== null && current === null;

  const hasDestination = destination !== null;
  const inRouteMode = destination !== null && calculation !== null;
  const selectedRoute = calculation?.routes.find((r) => r.id === selectedRouteId) ?? calculation?.routes[0];
  const topInset = Math.max(insets.top, 12) + 8;

  const openSearch = (target: 'origin' | 'destination') => {
    setSearchTarget(target);
    setIsSearchOpen(true);
  };

  const handleSelectPlace = (place: PlaceItem) => {
    if (searchTarget === 'origin') setOrigin(place);
    else {
      setDestination(place);
      setSelectedRouteId('route-1');
    }
  };

  // Nearest few safe places as one-tap destinations before a route exists
  const suggestions = SIKKIM_PLACES.filter((p) => p.id !== origin.id).slice(0, 4);

  return (
    <View style={styles.container}>
      <NavigateMap
        origin={origin.coordinate}
        originName={origin.name}
        destination={destination?.coordinate ?? null}
        destinationName={destination?.name ?? ''}
        hazardZones={DEFAULT_HAZARD_ZONES}
        routes={calculation?.routes ?? []}
        selectedRouteId={selectedRouteId}
        onSelectRoute={setSelectedRouteId}
        mapType={mapType}
        insets={{ top: topInset + 70, bottom: inRouteMode ? 300 : 150 }}
        onPressOrigin={() => openSearch('origin')}
        onPressDestination={() => openSearch('destination')}
      />

      {/* Top overlay */}
      {hasDestination ? (
        <Pressable
          onPress={() => setDestination(null)}
          style={[styles.roundButton, { top: topInset, left: 12 }]}
          accessibilityRole="button"
          accessibilityLabel="Back to destination search">
          <ArrowLeft size={20} color={Colors.ink} />
        </Pressable>
      ) : (
        <View style={[styles.searchWrap, { top: topInset }]}>
          <RouteSearchCard
            originName={origin.name}
            destinationName={null}
            onPressOrigin={() => openSearch('origin')}
            onPressDestination={() => openSearch('destination')}
          />
        </View>
      )}

      {/* Route mode: destination and selected-route pills, like the trip pills on the reference map */}
      {inRouteMode && destination && selectedRoute && (
        <View pointerEvents="none" style={[styles.pills, { top: topInset }]}>
          <View style={styles.pill}>
            <View style={styles.pillIconCoral}>
              <Flag size={14} color="#FFFFFF" strokeWidth={2.6} />
            </View>
            <Text style={styles.pillText} numberOfLines={1}>
              <Text style={styles.pillStrong}>{destination.name}</Text> · {selectedRoute.distanceKm} km · {selectedRoute.durationMin} min
            </Text>
          </View>
          <View style={styles.pill}>
            <View style={[styles.pillIconCoral, { backgroundColor: selectedRoute.color }]}>
              <RouteIcon size={14} color="#FFFFFF" strokeWidth={2.6} />
            </View>
            <Text style={styles.pillText} numberOfLines={1}>
              {selectedRoute.name}
              {selectedRoute.floodZonesCrossed > 0 ? ` · crosses ${selectedRoute.floodZonesCrossed} flood zone${selectedRoute.floodZonesCrossed > 1 ? 's' : ''}` : ' · avoids flood zones'}
            </Text>
          </View>
        </View>
      )}

      {/* Map tools: layer cycle + offline map */}
      <View style={[styles.tools, { top: inRouteMode ? topInset + 108 : topInset + 104 }]}>
        <Pressable
          onPress={() => setMapType(NEXT_MAP_TYPE[mapType])}
          style={styles.toolButton}
          accessibilityRole="button"
          accessibilityLabel={`Map style: ${MAP_TYPE_LABEL[mapType]}. Tap to change`}>
          <Layers size={18} color={Colors.ink} />
          <Text style={styles.toolText}>{MAP_TYPE_LABEL[mapType]}</Text>
        </Pressable>
        <Pressable
          onPress={() => setIsOfflineOpen(true)}
          style={styles.toolButton}
          accessibilityRole="button"
          accessibilityLabel="Download offline map">
          <DownloadCloud size={18} color={Colors.coralDeep} />
        </Pressable>
      </View>

      {/* Before a route exists: one-tap safe places, kept low so the map stays visible */}
      {!hasDestination && (
        <View style={styles.suggestions}>
          {suggestions.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                setDestination(p);
                setSelectedRouteId('route-1');
              }}
              style={styles.suggestionChip}
              accessibilityRole="button"
              accessibilityLabel={`Route to ${p.name}`}>
              <Text style={styles.suggestionText} numberOfLines={1}>
                {p.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {destination && (loadingRoutes || routeError) && (
        <View style={styles.statusCard} accessibilityLiveRegion="polite">
          {loadingRoutes ? (
            <>
              <ActivityIndicator color={Colors.coral} />
              <Text style={styles.statusText}>Finding road routes to {destination.name}…</Text>
            </>
          ) : (
            <>
              <Text style={styles.statusTitle}>Could not get road routes</Text>
              <Text style={styles.statusText}>
                Road routes need a connection to the Raha server. Check it and try again.
              </Text>
              <Pressable
                onPress={() => setRetryKey((k) => k + 1)}
                style={styles.retryButton}
                accessibilityRole="button">
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {inRouteMode && destination && calculation && (
        <RouteBottomSheet
          routes={calculation.routes}
          selectedRouteId={selectedRouteId}
          onSelectRoute={setSelectedRouteId}
          destinationCoordinate={destination.coordinate}
          destinationName={destination.name}
          isSameLocation={calculation.isSameLocation}
          noHazardsOnAnyRoute={calculation.noHazardsOnAnyRoute}
          onChange={() => openSearch('destination')}
        />
      )}

      <PlaceSearchModal
        visible={isSearchOpen}
        title={searchTarget === 'origin' ? 'Choose start' : 'Choose destination'}
        onClose={() => setIsSearchOpen(false)}
        onSelectPlace={handleSelectPlace}
      />
      <OfflineMapSheet visible={isOfflineOpen} onClose={() => setIsOfflineOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF0F2' },
  searchWrap: { position: 'absolute', left: 12, right: 12, zIndex: 10 },
  roundButton: {
    position: 'absolute',
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7A2A22',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  pills: { position: 'absolute', left: 64, right: 12, zIndex: 9, gap: 8, alignItems: 'flex-start' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
    minHeight: 44,
    paddingLeft: 6,
    paddingRight: 16,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    shadowColor: '#7A2A22',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 5,
  },
  pillIconCoral: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.coral, alignItems: 'center', justifyContent: 'center' },
  pillText: { flexShrink: 1, fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, color: Colors.text2, fontVariant: ['tabular-nums'] },
  pillStrong: { fontFamily: Typography.family.bold, color: Colors.ink },
  statusCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 110,
    zIndex: 10,
    gap: 10,
    padding: 18,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    shadowColor: '#7A2A22',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  statusTitle: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.bodyLarge, color: Colors.ink },
  statusText: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.body, lineHeight: 22, color: Colors.text2 },
  retryButton: { alignSelf: 'flex-start', minHeight: 48, paddingHorizontal: 22, borderRadius: 24, backgroundColor: Colors.coral, justifyContent: 'center' },
  retryText: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.body, color: Colors.onCoral },
  tools: { position: 'absolute', right: 12, zIndex: 10, gap: 8, alignItems: 'flex-end' },
  toolButton: {
    minHeight: 40,
    minWidth: 40,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#7A2A22',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  toolText: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.caption, color: Colors.ink },
  suggestions: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    maxWidth: '48%',
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.coral,
    justifyContent: 'center',
  },
  suggestionText: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.meta, color: Colors.coralDeep },
});
