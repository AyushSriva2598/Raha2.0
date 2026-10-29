import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { DownloadCloud, Layers, LocateFixed } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigateMap, NavigateMapType } from '@/components/navigate/NavigateMap';
import { MapSheet, SHEET_COMPACT, SHEET_MIDDLE } from '@/components/navigate/MapSheet';
import { OfflineMapSheet } from '@/components/common/OfflineMapSheet';
import { Colors, Shadows } from '@/constants/theme';
import { DEFAULT_ORIGIN, SIKKIM_PLACES, type PlaceItem } from '@/constants/places';
import { DEFAULT_HAZARDS, isSamePlace, type RouteCalculationResult } from '@/services/routeCalculator';
import { planRoutes } from '@/services/roadRouting';
import { openGoogleDirections, openNavigation } from '@/services/handoff';
import { showToast } from '@/services/toastStore';
import { useMovement } from '@/hooks/use-movement';

const NEXT_MAP_TYPE: Record<NavigateMapType, NavigateMapType> = {
  standard: 'terrain',
  terrain: 'satellite',
  satellite: 'standard',
};

// The map and one sheet. Everything else (search, routes, loading, errors, start) lives in the sheet;
// the only things floating on the map are three small controls.
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { access, position, moving, request } = useMovement();

  const [origin, setOrigin] = useState<PlaceItem>(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState<PlaceItem | null>(null);
  const [pickTarget, setPickTarget] = useState<'origin' | 'destination'>('destination');
  const [selectedRouteId, setSelectedRouteId] = useState('route-1');
  const [mapType, setMapType] = useState<NavigateMapType>('standard');
  const [isOfflineOpen, setIsOfflineOpen] = useState(false);
  const [snapIndex, setSnapIndex] = useState(0);
  const [recenterKey, setRecenterKey] = useState(0);

  // Road routes for the trip, keyed by the trip so a late answer for an earlier one is never shown.
  const [retryKey, setRetryKey] = useState(0);
  const [outcome, setOutcome] = useState<{ key: string; result?: RouteCalculationResult; error?: string } | null>(null);
  const tripKey = destination ? `${origin.id}@${origin.coordinate.latitude},${origin.coordinate.longitude}|${destination.id}|${retryKey}` : null;

  useEffect(() => {
    if (!tripKey || !destination) return;
    const controller = new AbortController();
    let retry: ReturnType<typeof setTimeout> | null = null;
    // One quiet retry first: a slow or dropped request should not put an error in front of someone
    // who is trying to leave.
    const run = (attempt: number) =>
      planRoutes(origin.coordinate, destination.coordinate, DEFAULT_HAZARDS, controller.signal)
        .then((result) => setOutcome({ key: tripKey, result }))
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
  const status = !destination ? null : !current ? 'loading' : current.error ? 'error' : 'ready';
  const result = current?.result ?? null;

  const pickPlace = (place: PlaceItem) => {
    if (pickTarget === 'origin') {
      setOrigin(place);
      setPickTarget('destination');
      return;
    }
    if (isSamePlace(origin.coordinate, place.coordinate)) {
      showToast({ message: `You are already at ${place.name}. Pick somewhere else.` });
      return;
    }
    setDestination(place);
    setSelectedRouteId('route-1');
  };

  const startFromMyLocation = async () => {
    const ok = access === 'granted' || (await request());
    if (!ok) {
      showToast({ message: 'Location is off. Allow it in Settings to start from where you are.', tone: 'error' });
      return;
    }
    if (!position) {
      showToast({ message: 'Finding your position… try again in a moment.' });
      return;
    }
    setOrigin({ id: 'my-location', name: 'My location', region: 'Where this phone is', coordinate: position, elevationM: 0 });
    setPickTarget('destination');
  };

  // Clearing a trip is instant and reversible: no confirm dialog, just Undo.
  const clearTrip = () => {
    const previous = destination;
    setDestination(null);
    setPickTarget('destination');
    if (previous) {
      showToast({ message: `Trip to ${previous.name} cleared`, actionLabel: 'Undo', onAction: () => setDestination(previous) });
    }
  };

  const sheetPx = snapIndex <= 0 ? SHEET_COMPACT : snapIndex === 1 ? height * SHEET_MIDDLE : height * 0.9;
  const top = Math.max(insets.top, 12) + 8;

  return (
    <View style={styles.container}>
      <NavigateMap
        origin={origin.coordinate}
        destination={destination?.coordinate ?? null}
        hazards={DEFAULT_HAZARDS}
        routes={result?.routes ?? []}
        selectedRouteId={selectedRouteId}
        onSelectRoute={setSelectedRouteId}
        mapType={mapType}
        insets={{ top: top + 20, bottom: Math.min(sheetPx, height * SHEET_MIDDLE) + 24 }}
        recenterKey={recenterKey}
      />

      <View style={[styles.controls, { top }]}>
        <Control label={`Map style: ${mapType}. Tap to change`} onPress={() => setMapType(NEXT_MAP_TYPE[mapType])} active={mapType !== 'standard'}>
          <Layers size={20} color={mapType !== 'standard' ? Colors.onCoral : Colors.ink} />
        </Control>
        <Control label="Save the valley for offline use" onPress={() => setIsOfflineOpen(true)}>
          <DownloadCloud size={20} color={Colors.coralDeep} />
        </Control>
        <Control label={destination ? 'Show the whole trip' : 'Centre the map'} onPress={() => setRecenterKey((k) => k + 1)}>
          <LocateFixed size={20} color={Colors.you} />
        </Control>
      </View>

      <MapSheet
        origin={origin}
        destination={destination}
        places={SIKKIM_PLACES}
        pickTarget={pickTarget}
        onPickTarget={setPickTarget}
        onPickPlace={pickPlace}
        onUseMyLocation={access === 'unavailable' ? undefined : startFromMyLocation}
        status={status}
        result={result}
        selectedRouteId={selectedRouteId}
        onSelectRoute={setSelectedRouteId}
        onClearTrip={clearTrip}
        onRetry={() => setRetryKey((k) => k + 1)}
        onOpenGoogle={() => destination && openGoogleDirections(origin.coordinate, destination.coordinate)}
        onStart={() => destination && openNavigation(destination.coordinate, destination.name, origin.coordinate)}
        moving={moving}
        onSnapChange={setSnapIndex}
      />

      <OfflineMapSheet visible={isOfflineOpen} onClose={() => setIsOfflineOpen(false)} />
    </View>
  );
}

function Control({ children, label, onPress, active }: { children: React.ReactNode; label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.control, active && styles.controlActive, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  controls: { position: 'absolute', right: 12, zIndex: 10, gap: 10 },
  control: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  controlActive: { backgroundColor: Colors.coral, borderColor: Colors.coral },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
});
