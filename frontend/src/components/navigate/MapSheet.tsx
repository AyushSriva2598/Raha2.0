import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, {
  BottomSheetFooter,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { AlertTriangle, Flag, LocateFixed, MapPin, Navigation, Search, ShieldCheck, X } from 'lucide-react-native';
import { Colors, Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { RouteRow } from '@/components/common/RouteRow';
import { Skeleton, useDelayedFlag } from '@/components/common/Skeleton';
import type { PlaceItem } from '@/constants/places';
import { hazardAt, type ComputedRoute, type RouteCalculationResult } from '@/services/routeCalculator';
import { metersBetween } from '@/services/geo';

// The one sheet that runs the map, in the spirit of Apple Maps: browsing, searching, choosing a road,
// loading, errors and starting all happen here, at three heights. While you are driving or riding it
// drops to its smallest height on its own so the map has the screen.

export type TripStatus = 'loading' | 'ready' | 'error';

export interface MapSheetProps {
  origin: PlaceItem;
  destination: PlaceItem | null;
  places: PlaceItem[];
  /** Which end of the trip a picked place goes to. */
  pickTarget: 'origin' | 'destination';
  onPickTarget: (target: 'origin' | 'destination') => void;
  onPickPlace: (place: PlaceItem) => void;
  /** Offered as a start point when the phone can give a real position. */
  onUseMyLocation?: () => void;
  status: TripStatus | null;
  result: RouteCalculationResult | null;
  selectedRouteId: string;
  onSelectRoute: (id: string) => void;
  onClearTrip: () => void;
  onRetry: () => void;
  onOpenGoogle: () => void;
  onStart: (route: ComputedRoute) => void;
  moving: boolean;
  /** Reports which height the sheet rests at (0 compact, 1 middle, 2 full) for framing the map. */
  onSnapChange?: (index: number) => void;
}

export const SHEET_COMPACT = 210;
export const SHEET_MIDDLE = 0.52;
const SNAP_POINTS: (number | string)[] = [SHEET_COMPACT, `${SHEET_MIDDLE * 100}%`, '90%'];

export function MapSheet(props: MapSheetProps) {
  const {
    origin,
    destination,
    places,
    pickTarget,
    onPickTarget,
    onPickPlace,
    onUseMyLocation,
    status,
    result,
    selectedRouteId,
    onSelectRoute,
    onClearTrip,
    onRetry,
    onOpenGoogle,
    onStart,
    moving,
    onSnapChange,
  } = props;
  const sheet = useRef<BottomSheet>(null);
  const [query, setQuery] = useState('');
  const [confirming, setConfirming] = useState(false);
  const routes = result?.routes ?? [];
  const selected = routes.find((r) => r.id === selectedRouteId) ?? routes[0];
  const saferRoute = routes.find((r) => !r.hasWarningZoneCrossing && r.id !== selected?.id);
  const showSkeleton = useDelayedFlag(status === 'loading');

  // Driving or riding: get out of the way. The person can still pull it up.
  useEffect(() => {
    if (moving) {
      Keyboard.dismiss();
      sheet.current?.snapToIndex(0);
    }
  }, [moving]);

  // A new trip opens at the middle height so the road and its options are both in view.
  useEffect(() => {
    if (destination) sheet.current?.snapToIndex(1);
  }, [destination?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const other = pickTarget === 'destination' ? origin : destination;
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places
      .filter((p) => p.id !== other?.id)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.region.toLowerCase().includes(q))
      .map((p) => ({
        place: p,
        km: Math.round(metersBetween([origin.coordinate.longitude, origin.coordinate.latitude], [p.coordinate.longitude, p.coordinate.latitude]) / 100) / 10,
        hazard: hazardAt(p.coordinate),
      }))
      .sort((a, b) => a.km - b.km);
  }, [places, other?.id, query, origin.coordinate.latitude, origin.coordinate.longitude]);

  const pick = (p: PlaceItem) => {
    setQuery('');
    Keyboard.dismiss();
    onPickPlace(p);
  };

  const start = () => {
    if (!selected) return;
    if (selected.hasWarningZoneCrossing && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onStart(selected);
  };

  const renderFooter = useCallback(
    (fp: BottomSheetFooterProps) => (
      <BottomSheetFooter {...fp}>
        <View style={styles.footer}>
          {confirming && selected ? (
            <>
              <Text style={styles.confirmText}>
                {selected.endsInZone?.warning
                  ? `${destination?.name} is inside ${selected.endsInZone.name}, a flood warning zone.`
                  : `This road runs ${selected.insideKm} km through ${selected.crossedZones[0]}, a flood warning zone.`}
              </Text>
              <View style={styles.footerRow}>
                <Pressable
                  onPress={() => {
                    setConfirming(false);
                    if (saferRoute) onSelectRoute(saferRoute.id);
                    else onPickTarget('destination');
                  }}
                  style={({ pressed }) => [styles.primary, styles.flex, pressed && styles.pressed]}
                  accessibilityRole="button">
                  <Text style={styles.primaryText}>{saferRoute ? 'Use the safer road' : 'Pick another place'}</Text>
                </Pressable>
                <Pressable onPress={start} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} accessibilityRole="button">
                  <Text style={styles.secondaryText}>Go anyway</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Pressable onPress={start} style={({ pressed }) => [styles.primary, pressed && styles.pressed]} accessibilityRole="button">
              <Navigation size={18} color={Colors.onCoral} />
              <Text style={styles.primaryText}>Start</Text>
            </Pressable>
          )}
        </View>
      </BottomSheetFooter>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [confirming, selected?.id, saferRoute?.id, destination?.id]
  );

  const tripLine = !destination
    ? ''
    : status === 'loading'
      ? `From ${origin.name} · finding roads…`
      : status === 'error'
        ? 'Road routes unavailable'
        : selected
          ? `${selected.distanceKm} km · ${selected.durationMin} min · from ${origin.name}`
          : 'No road found';

  return (
    <BottomSheet
      ref={sheet}
      index={0}
      snapPoints={SNAP_POINTS}
      enableDynamicSizing={false}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      onChange={(i) => {
        setConfirming(false);
        onSnapChange?.(i);
      }}
      footerComponent={destination && status === 'ready' && selected ? renderFooter : undefined}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.background}
      style={Shadows.sheet}>
      {destination ? (
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: Colors.coral }]}>
            <Flag size={18} color={Colors.onCoral} strokeWidth={2.6} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {destination.name}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {tripLine}
            </Text>
          </View>
          <Pressable
            onPress={onClearTrip}
            hitSlop={6}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Clear this trip">
            <X size={20} color={Colors.ink} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.searchBlock}>
          <View style={styles.searchField}>
            <Search size={18} color={Colors.text3} />
            <BottomSheetTextInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => sheet.current?.snapToIndex(2)}
              placeholder={pickTarget === 'destination' ? 'Where to? Search a safe place' : 'Search a start point'}
              placeholderTextColor={Colors.text3}
              style={styles.searchInput}
              returnKeyType="search"
              accessibilityLabel={pickTarget === 'destination' ? 'Search for a destination' : 'Search for a start point'}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
                <X size={18} color={Colors.text3} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={() => onPickTarget(pickTarget === 'origin' ? 'destination' : 'origin')}
            style={styles.fromRow}
            accessibilityRole="button"
            accessibilityLabel={pickTarget === 'origin' ? 'Done choosing a start point' : `Starting from ${origin.name}. Change`}>
            <LocateFixed size={16} color={Colors.you} />
            <Text style={styles.fromText} numberOfLines={1}>
              {pickTarget === 'origin' ? 'Choose where you start' : `From ${origin.name}`}
            </Text>
            <Text style={styles.link}>{pickTarget === 'origin' ? 'Cancel' : 'Change'}</Text>
          </Pressable>
        </View>
      )}

      <BottomSheetScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {!destination && (
          <>
            {pickTarget === 'origin' && onUseMyLocation && (
              <PlaceRow
                icon={<LocateFixed size={18} color={Colors.you} />}
                title="My location"
                sub="Use where this phone is now"
                onPress={() => {
                  setQuery('');
                  onUseMyLocation();
                }}
              />
            )}
            {list.map(({ place, km, hazard }) => (
              <PlaceRow
                key={place.id}
                icon={hazard ? <AlertTriangle size={18} color={Colors.watchTextAlt} /> : <ShieldCheck size={18} color={Colors.safe} />}
                title={place.name}
                sub={hazard ? `In ${hazard.name} flood zone` : place.region}
                trailing={km > 0 ? `${km} km` : undefined}
                onPress={() => pick(place)}
              />
            ))}
            {list.length === 0 && <Text style={styles.muted}>No place matches “{query}”.</Text>}
          </>
        )}

        {destination && status === 'loading' && showSkeleton && (
          <View style={styles.skeletons} accessibilityLabel="Finding road routes">
            {[0, 1].map((i) => (
              <View key={i} style={styles.skeletonRow}>
                <Skeleton width={40} height={40} radius={20} />
                <View style={styles.flex}>
                  <Skeleton height={16} width="55%" />
                  <Skeleton height={13} width="85%" style={styles.gap6} />
                </View>
                <Skeleton width={30} height={28} />
              </View>
            ))}
          </View>
        )}

        {destination && status === 'error' && (
          <View style={styles.notice} accessibilityLiveRegion="polite">
            <Text style={styles.noticeTitle}>Could not get road routes</Text>
            <Text style={styles.noticeText}>Raha could not reach its route service. Try again, or get driving directions from Google Maps.</Text>
            <View style={styles.footerRow}>
              <Pressable onPress={onRetry} style={({ pressed }) => [styles.primary, styles.flex, pressed && styles.pressed]} accessibilityRole="button">
                <Text style={styles.primaryText}>Try again</Text>
              </Pressable>
              <Pressable onPress={onOpenGoogle} style={({ pressed }) => [styles.secondary, styles.flex, pressed && styles.pressed]} accessibilityRole="button">
                <Text style={styles.secondaryText}>Google Maps</Text>
              </Pressable>
            </View>
          </View>
        )}

        {destination && status === 'ready' && (
          <>
            {selected?.leavesZone?.warning && (
              <View style={[styles.banner, styles.bannerDanger]} accessibilityLiveRegion="polite">
                <AlertTriangle size={18} color={Colors.dangerDark} />
                <Text style={styles.bannerText}>
                  You are inside the {selected.leavesZone.name} flood zone. This road gets you out in {selected.leavesZone.exitKm} km.
                </Text>
              </View>
            )}
            {routes.length > 0 && routes.every((r) => r.hasWarningZoneCrossing) && (
              <View style={[styles.banner, styles.bannerWatch]}>
                <MapPin size={18} color={Colors.watchText} />
                <Text style={styles.bannerText}>
                  Every road here runs beside the river. If a warning is active, go uphill on foot instead of driving the valley.
                </Text>
              </View>
            )}
            {routes.map((r) => (
              <RouteRow key={r.id} route={r} isSelected={r.id === selected?.id} onSelect={() => onSelectRoute(r.id)} />
            ))}
            {routes.length === 0 && <Text style={styles.muted}>No driving road connects these two places.</Text>}
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

function PlaceRow({
  icon,
  title,
  sub,
  trailing,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  trailing?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.placeRow, pressed && styles.placePressed]} accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`}>
      <View style={styles.placeIcon}>{icon}</View>
      <View style={styles.flex}>
        <Text style={styles.placeTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.placeSub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {trailing ? <Text style={styles.placeKm}>{trailing}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  background: { backgroundColor: Colors.surface, borderTopLeftRadius: Radii.sheet, borderTopRightRadius: Radii.sheet },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: Colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.sidePadding, paddingBottom: 12 },
  headerIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 2 },
  title: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.bodyLarge, color: Colors.ink },
  subtitle: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, color: Colors.text2, fontVariant: ['tabular-nums'] },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.coralTint, alignItems: 'center', justifyContent: 'center' },
  searchBlock: { paddingHorizontal: Spacing.sidePadding, paddingBottom: 6, gap: 4 },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 26,
    borderCurve: 'continuous',
    backgroundColor: Colors.coralTint,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontFamily: Typography.family.regular, fontSize: Typography.sizes.body, color: Colors.ink },
  fromRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 4 },
  fromText: { flex: 1, fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, color: Colors.text2 },
  link: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.meta, color: Colors.coralDeep },
  body: { paddingHorizontal: Spacing.sidePadding, paddingBottom: 140, gap: 2 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 8, borderRadius: 16, paddingHorizontal: 4 },
  placePressed: { backgroundColor: Colors.coralTint },
  placeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  placeTitle: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.body, color: Colors.ink },
  placeSub: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.caption, color: Colors.text2 },
  placeKm: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, color: Colors.text3, fontVariant: ['tabular-nums'] },
  muted: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.body, color: Colors.text2, paddingVertical: 16, textAlign: 'center' },
  skeletons: { gap: 14, paddingTop: 6 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gap6: { marginTop: 6 },
  notice: { gap: 10, paddingTop: 4 },
  noticeTitle: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.bodyLarge, color: Colors.ink },
  noticeText: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.body, lineHeight: 22, color: Colors.text2 },
  banner: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 16, borderCurve: 'continuous', marginBottom: 8 },
  bannerDanger: { backgroundColor: Colors.dangerTint },
  bannerWatch: { backgroundColor: '#FFF3D6' },
  bannerText: { flex: 1, fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, lineHeight: 19, color: Colors.ink },
  footer: { paddingHorizontal: Spacing.sidePadding, paddingTop: 10, paddingBottom: 34, gap: 10, backgroundColor: Colors.surface },
  footerRow: { flexDirection: 'row', gap: 10 },
  confirmText: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, lineHeight: 19, color: Colors.dangerDark },
  primary: {
    minHeight: 52,
    borderRadius: 26,
    borderCurve: 'continuous',
    backgroundColor: Colors.coral,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  primaryText: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.body, color: Colors.onCoral },
  secondary: {
    minHeight: 52,
    borderRadius: 26,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: Colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryText: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.body, color: Colors.coralDeep },
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
});
