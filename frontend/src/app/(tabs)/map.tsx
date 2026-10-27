import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Text, Linking } from 'react-native';
import { ArrowLeft, DownloadCloud, Flag, Layers } from 'lucide-react-native';
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
import { Skeleton, useDelayedFlag } from '@/components/common/Skeleton';
import { showToast } from '@/services/toastStore';
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
    let retry: ReturnType<typeof setTimeout> | null = null;
    // One quiet retry first: a slow or dropped first request should not put an error in front of
    // someone who is trying to leave.
    const run = (attempt: number) =>
      fetchRoadRoutes(origin.coordinate, destination.coordinate, controller.signal)
        .then((roads) => setOutcome({ key: tripKey, result: classifyRoadRoutes(roads, DEFAULT_HAZARD_ZONES) }))
        .catch((e: Error) => {
          if (controller.signal.aborted) return;
          if (attempt === 0) retry = setTimeout(() => run(1), 1500);
          else setOutcome({ key: tripKey, error: e.message });
        });
    run(0);
    return () => {
      controller.abort();
      if (retry) clearTimeout(retry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripKey]);

  const current = tripKey && outcome?.key === tripKey ? outcome : null;
  const calculation: RouteCalculationResult | null = sameSpot
    ? { routes: [], isSameLocation: true, noHazardsOnAnyRoute: false }
    : (current?.result ?? null);
  const routeError = current?.error ?? null;
  const loadingRoutes = tripKey !== null && current === null;
  const showSkeleton = useDelayedFlag(loadingRoutes);

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

  // Clearing a trip is instant and reversible, so there is no confirm dialog, just Undo.
  const clearTrip = () => {
    const previous = destination;
    setDestination(null);
    if (previous) {
      showToast({ message: `Trip to ${previous.name} cleared`, actionLabel: 'Undo', onAction: () => setDestination(previous) });
    }
  };

  const openInGoogleMaps = () => {
    if (!destination) return;
    const o = origin.coordinate;
    const d = destination.coordinate;
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&origin=${o.latitude},${o.longitude}&destination=${d.latitude},${d.longitude}&travelmode=driving`
    ).catch(() => {});
  };

  const zoneText = (n: number) => (n > 0 ? `crosses ${n} flood zone${n > 1 ? 's' : ''}` : 'avoids flood zones');

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
      />

      {/* Top overlay */}
      {hasDestination ? (
        <Pressable
          onPress={clearTrip}
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

      {/* Trip card: where you are going and what the chosen road is like. Tap to change the place. */}
      {destination && (
        <Pressable
          onPress={() => openSearch('destination')}
          style={({ pressed }) => [styles.tripCard, { top: topInset }, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Trip from ${origin.name} to ${destination.name}. Tap to change the destination`}>
          <View style={styles.pillIconCoral}>
            <Flag size={15} color="#FFFFFF" strokeWidth={2.6} />
          </View>
          <View style={styles.tripText}>
            <Text style={styles.tripTitle} numberOfLines={1}>
              {destination.name}
            </Text>
            <View style={styles.tripMetaRow}>
              {selectedRoute && <View style={[styles.tripDot, { backgroundColor: selectedRoute.color }]} />}
              <Text style={styles.tripMeta} numberOfLines={1}>
                {selectedRoute
                  ? `${selectedRoute.distanceKm} km · ${selectedRoute.durationMin} min · ${zoneText(selectedRoute.floodZonesCrossed)}`
                  : loadingRoutes
                    ? `From ${origin.name} · finding roads…`
                    : routeError
                      ? 'Road routes unavailable'
                      : `From ${origin.name}`}
              </Text>
            </View>
          </View>
        </Pressable>
      )}

      {/* Map tools: layer cycle + offline map */}
      <View style={[styles.tools, { top: hasDestination ? topInset + 76 : topInset + 104 }]}>
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

      {/* Loading: the sheet's own shape in gray, only if it takes longer than 300 ms. */}
      {destination && showSkeleton && (
        <View style={styles.statusCard} accessibilityLabel={`Finding road routes to ${destination.name}`}>
          <Skeleton height={20} width="70%" />
          {[0, 1].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={40} height={40} radius={20} />
              <View style={styles.skeletonText}>
                <Skeleton height={16} width="55%" />
                <Skeleton height={13} width="80%" />
              </View>
              <Skeleton width={32} height={28} />
            </View>
          ))}
        </View>
      )}

      {destination && routeError && (
        <View style={styles.statusCard} accessibilityLiveRegion="polite">
          <Text style={styles.statusTitle}>Could not get road routes</Text>
          <Text style={styles.statusText}>
            Raha could not reach its route service. Try again, or get driving directions from Google Maps.
          </Text>
          <View style={styles.statusActions}>
            <Pressable onPress={() => setRetryKey((k) => k + 1)} style={styles.retryButton} accessibilityRole="button">
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
            <Pressable onPress={openInGoogleMaps} style={styles.secondaryButton} accessibilityRole="button">
              <Text style={styles.secondaryText}>Open Google Maps</Text>
            </Pressable>
          </View>
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7A2A22',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  tripCard: {
    position: 'absolute',
    left: 72,
    right: 12,
    zIndex: 10,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 8,
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: Colors.surface,
    shadowColor: '#7A2A22',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  pillIconCoral: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.coral, alignItems: 'center', justifyContent: 'center' },
  tripText: { flex: 1, gap: 2 },
  tripTitle: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.body, color: Colors.ink },
  tripMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tripDot: { width: 8, height: 8, borderRadius: 4 },
  tripMeta: { flexShrink: 1, fontFamily: Typography.family.regular, fontSize: Typography.sizes.caption, color: Colors.text2, fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.85 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skeletonText: { flex: 1, gap: 6 },
  statusActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  secondaryButton: { minHeight: 48, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1.5, borderColor: Colors.coral, justifyContent: 'center' },
  secondaryText: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.body, color: Colors.coralDeep },
  statusCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 40,
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
  retryButton: { minHeight: 48, paddingHorizontal: 22, borderRadius: 24, backgroundColor: Colors.coral, justifyContent: 'center' },
  retryText: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.body, color: Colors.onCoral },
  tools: { position: 'absolute', right: 12, zIndex: 10, gap: 8, alignItems: 'flex-end' },
  toolButton: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 12,
    borderRadius: 24,
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
