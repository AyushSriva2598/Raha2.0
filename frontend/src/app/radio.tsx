import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ArrowLeft, Pause, Play, Radio as RadioIcon, Search, Square, X } from 'lucide-react-native';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { Skeleton, useDelayedFlag } from '@/components/common/Skeleton';
import { BUILT_IN_STATIONS, searchStations, useRadioStore, type RadioStation } from '@/services/radioStore';

const STATUS_TEXT = {
  idle: 'Pick a station',
  connecting: 'Connecting…',
  playing: 'Live',
  paused: 'Paused',
  error: 'Could not connect',
  unavailable: 'Not available on this build',
} as const;

export default function RadioScreen() {
  const insets = useSafeAreaInsets();
  const station = useRadioStore((s) => s.station);
  const status = useRadioStore((s) => s.status);
  const error = useRadioStore((s) => s.error);
  const play = useRadioStore((s) => s.play);
  const toggle = useRadioStore((s) => s.toggle);
  const stop = useRadioStore((s) => s.stop);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ q: string; list: RadioStation[] } | null>(null);
  const trimmed = query.trim();
  const searching = trimmed.length >= 2 && results?.q !== trimmed;
  const showSkeleton = useDelayedFlag(searching);

  // Search the directory only once typing pauses.
  useEffect(() => {
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      searchStations(trimmed, controller.signal)
        .then((list) => setResults({ q: trimmed, list }))
        .catch(() => setResults({ q: trimmed, list: [] }));
    }, 400);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [trimmed]);

  const unavailable = status === 'unavailable';
  const isActive = status === 'playing' || status === 'connecting';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 24) + 8, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
            <ArrowLeft size={22} color={Colors.ink} />
          </Pressable>
          <Text style={styles.title} accessibilityRole="header">
            Radio
          </Text>
        </View>

        {/* Now playing */}
        <View style={styles.player}>
          <View style={styles.playerText}>
            <View style={styles.statusRow}>
              {status === 'playing' && <LiveDot />}
              <Text style={styles.statusText} accessibilityLiveRegion="polite">
                {STATUS_TEXT[status]}
              </Text>
            </View>
            <Text style={styles.playerTitle} numberOfLines={2} textBreakStrategy="balanced">
              {unavailable ? 'Update Raha to listen' : (station?.name ?? 'All India Radio and more')}
            </Text>
            <Text style={styles.playerDetail} numberOfLines={2}>
              {unavailable
                ? 'This version of the app was built before radio was added. Install the latest build to play stations.'
                : status === 'error'
                  ? error
                  : (station?.detail ?? 'Official bulletins and local stations, playing in the background and on the lock screen.')}
            </Text>
          </View>
          {!unavailable && (
            <View style={styles.playerButtons}>
              <Pressable
                onPress={() => (station ? toggle() : play(BUILT_IN_STATIONS[0]))}
                style={({ pressed }) => [styles.bigButton, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={isActive ? 'Pause' : 'Play'}>
                {isActive ? <Pause size={30} color={Colors.coralDeep} fill={Colors.coralDeep} /> : <Play size={30} color={Colors.coralDeep} fill={Colors.coralDeep} />}
              </Pressable>
              {station && (
                <Pressable onPress={stop} hitSlop={6} style={({ pressed }) => [styles.stopButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Stop">
                  <Square size={16} color={Colors.onCoral} fill={Colors.onCoral} />
                </Pressable>
              )}
            </View>
          )}
        </View>

        <Text style={styles.section}>Stations</Text>
        {BUILT_IN_STATIONS.map((s) => (
          <StationRow key={s.id} station={s} current={station?.id === s.id} status={status} disabled={unavailable} onPress={() => (station?.id === s.id ? toggle() : play(s))} />
        ))}

        <Text style={styles.section}>Find more stations</Text>
        <View style={styles.searchField}>
          <Search size={18} color={Colors.text3} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search Indian and Nepali radio"
            placeholderTextColor={Colors.text3}
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Search radio stations"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
              <X size={18} color={Colors.text3} />
            </Pressable>
          ) : null}
        </View>
        {showSkeleton &&
          [0, 1, 2].map((i) => (
            <View key={i} style={styles.row}>
              <Skeleton width={44} height={44} radius={22} />
              <View style={styles.flex}>
                <Skeleton height={16} width="60%" />
                <Skeleton height={12} width="40%" style={styles.gap6} />
              </View>
            </View>
          ))}
        {!searching && results && trimmed.length >= 2 && results.list.length === 0 && (
          <Text style={styles.muted}>No working station matches “{trimmed}”.</Text>
        )}
        {!searching &&
          trimmed.length >= 2 &&
          results?.list.map((s) => (
            <StationRow key={s.id} station={s} current={station?.id === s.id} status={status} disabled={unavailable} onPress={() => (station?.id === s.id ? toggle() : play(s))} />
          ))}

        <Text style={styles.note}>
          All India Radio broadcasts official announcements. In an emergency, follow instructions from your local authorities first.
        </Text>
      </ScrollView>
    </View>
  );
}

function StationRow({
  station,
  current,
  status,
  disabled,
  onPress,
}: {
  station: RadioStation;
  current: boolean;
  status: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const active = current && (status === 'playing' || status === 'connecting');
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.row, current && styles.rowCurrent, pressed && styles.pressed, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityState={{ selected: current, disabled }}
      accessibilityLabel={`${station.name}. ${station.detail}. ${active ? 'Pause' : 'Play'}`}>
      <View style={[styles.rowIcon, current && styles.rowIconCurrent]}>
        <RadioIcon size={20} color={current ? Colors.onCoral : Colors.coralDeep} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {station.name}
        </Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {current && status === 'connecting' ? 'Connecting…' : station.detail}
        </Text>
      </View>
      {active ? <Pause size={20} color={Colors.coralDeep} /> : <Play size={20} color={Colors.coralDeep} />}
    </Pressable>
  );
}

// A softly pulsing dot next to "Live". With reduce motion it stays still.
function LiveDot() {
  const reduceMotion = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    o.set(withRepeat(withTiming(0.35, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true));
    return () => cancelAnimation(o);
  }, [reduceMotion, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[styles.liveDot, style]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.sidePadding, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 },
  back: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.hero, color: Colors.ink },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: Radii.cardLarge,
    borderCurve: 'continuous',
    backgroundColor: Colors.coral,
  },
  playerText: { flex: 1, gap: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.caption, letterSpacing: 1, color: 'rgba(255,255,255,0.92)', textTransform: 'uppercase' },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#FFFFFF' },
  playerTitle: { fontFamily: Typography.family.bold, fontSize: 22, lineHeight: 28, color: Colors.onCoral },
  playerDetail: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, lineHeight: 19, color: 'rgba(255,255,255,0.92)' },
  playerButtons: { alignItems: 'center', gap: 10 },
  bigButton: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.onCoral, alignItems: 'center', justifyContent: 'center' },
  stopButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: 14,
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.caption,
    letterSpacing: 1.2,
    color: Colors.text3,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radii.card,
    borderCurve: 'continuous',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowCurrent: { borderColor: Colors.coral },
  rowIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.coralTint, alignItems: 'center', justifyContent: 'center' },
  rowIconCurrent: { backgroundColor: Colors.coral },
  rowTitle: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.body, color: Colors.ink },
  rowDetail: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.caption, color: Colors.text2 },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 26,
    borderCurve: 'continuous',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontFamily: Typography.family.regular, fontSize: Typography.sizes.body, color: Colors.ink },
  muted: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.body, color: Colors.text2, textAlign: 'center', paddingVertical: 12 },
  note: { marginTop: 14, fontFamily: Typography.family.regular, fontSize: Typography.sizes.caption, lineHeight: 18, color: Colors.text3, textAlign: 'center' },
  flex: { flex: 1 },
  gap6: { marginTop: 6 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
