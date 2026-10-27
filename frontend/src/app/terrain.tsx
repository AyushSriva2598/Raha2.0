import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Layers, LocateFixed, Pause, Play, RotateCw, Satellite, TriangleAlert } from 'lucide-react-native';
import { Colors, Radii, Shadows, Typography } from '@/constants/theme';
import { GLOF_LEVEL_COLOR, GLOF_LEVEL_LABEL, GLOF_LEVEL_TEXT } from '@/constants/glof';
import { TerrainView, type TerrainLayers } from '@/components/terrain/TerrainView';
import { TimelineSlider } from '@/components/terrain/TimelineSlider';
import { DEFAULT_GLOF_LAKES, useGlofStore } from '@/services/glofStore';
import { useRevalidate } from '@/hooks/use-revalidate';

const BASE_STEP_MS = 650;
const SPEEDS = [0.5, 1, 2, 4] as const;
const HANDLE_H = 32;
const GAP = 10;

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function ToolButton({ label, active, onPress, children }: { label: string; active?: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tool, active && styles.toolActive, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}>
      {children}
    </Pressable>
  );
}

function Stat({ label, value, unit, note, warn }: { label: string; value: string; unit: string; note?: string; warn?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text>
        <Text style={[styles.statValue, warn && styles.statWarn]}>{value}</Text>
        <Text style={styles.statUnit}> {unit}</Text>
      </Text>
      {note ? <Text style={styles.statNote}>{note}</Text> : null}
    </View>
  );
}

function KeyRow({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <View style={styles.keyRow}>
      <View style={styles.keySwatch}>{swatch}</View>
      <Text style={styles.detailText}>{label}</Text>
    </View>
  );
}

// Large handle: the sheet is dragged only from here so the timeline slider stays free.
function SheetHandle() {
  return (
    <View style={styles.handleArea} accessible accessibilityLabel="Drag to resize the lake panel">
      <View style={styles.handle} />
    </View>
  );
}

export default function TerrainScreen() {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const { lakes, byId, status, loadLakes, loadLake } = useGlofStore();
  const [lakeId, setLakeId] = useState(DEFAULT_GLOF_LAKES[0].id);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [layers, setLayers] = useState<TerrainLayers>({ satellite: true, history: true, baseline: true });
  const [rotate, setRotate] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [sheetIndex, setSheetIndex] = useState(0);

  const data = byId[lakeId] ?? null;
  const loadStatus = status[lakeId] ?? 'idle';
  useRevalidate(() => void loadLake(lakeId), loadStatus === 'offline' || loadStatus === 'error');
  const frames = useMemo(() => data?.frames ?? [], [data]);
  const frame = frames[Math.min(frameIndex, Math.max(0, frames.length - 1))];
  const hasHistory = !!data?.archiveAvailable && frames.length > 1;
  const level = frame?.level ?? null;
  const speed = SPEEDS[speedIdx];

  useEffect(() => {
    loadLakes();
  }, [loadLakes]);

  useEffect(() => {
    loadLake(lakeId);
  }, [lakeId, loadLake]);

  // Jump to the newest scene whenever a lake's data first arrives.
  const lastLake = useRef<string | null>(null);
  useEffect(() => {
    if (data && lastLake.current !== data.lake.id) {
      lastLake.current = data.lake.id;
      setFrameIndex(data.frames.length - 1);
      setPlaying(false);
    }
  }, [data]);

  // Replay: step through scenes at the chosen speed, stop at the newest.
  useEffect(() => {
    if (!playing || !hasHistory) return;
    const t = setInterval(() => {
      setFrameIndex((i) => {
        if (i >= frames.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, BASE_STEP_MS / speed);
    return () => clearInterval(t);
  }, [playing, hasHistory, frames.length, speed]);

  const togglePlay = () => {
    if (!playing && frameIndex >= frames.length - 1) setFrameIndex(0);
    setPlaying((p) => !p);
  };

  /* ---- Layout: a fixed timeline dock at the bottom, the lake panel (3 tiers) sitting above it ---- */
  const sheetRef = useRef<BottomSheet>(null);
  const padBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 28 : 12);
  const [dockH, setDockH] = useState(0);
  const [glanceH, setGlanceH] = useState(56);
  const [exploreH, setExploreH] = useState(200);
  const [detailsH, setDetailsH] = useState(300);
  const dockOffset = hasHistory ? dockH : padBottom;

  // Heights are measured from the real content, so a snap point always lands on a section boundary.
  const snapPoints = useMemo(() => {
    const s0 = HANDLE_H + glanceH + 12;
    const s1 = s0 + GAP + exploreH;
    const maxH = Math.round(screenH * 0.8) - dockOffset;
    const s2 = Math.min(s1 + GAP + detailsH, maxH);
    return s2 - s1 > 48 ? [s0, s1, s2] : [s0, s1];
  }, [glanceH, exploreH, detailsH, screenH, dockOffset]);
  const sheetHeight = snapPoints[Math.min(sheetIndex, snapPoints.length - 1)];
  const measure = (set: (h: number) => void) => (e: LayoutChangeEvent) => set(Math.ceil(e.nativeEvent.layout.height));
  const cycleSheet = useCallback(() => {
    sheetRef.current?.snapToIndex(sheetIndex >= snapPoints.length - 1 ? 0 : sheetIndex + 1);
  }, [sheetIndex, snapPoints.length]);

  // Tiers fade in as the sheet opens, so a half-open sheet never shows a clipped card.
  const animatedIndex = useSharedValue(0);
  const exploreStyle = useAnimatedStyle(() => ({ opacity: interpolate(animatedIndex.value, [0, 0.5, 1], [0, 0, 1], 'clamp') }));
  const detailsStyle = useAnimatedStyle(() => ({ opacity: interpolate(animatedIndex.value, [1, 1.5, 2], [0, 0, 1], 'clamp') }));

  const warnAdvance = (frame?.advanceM ?? 0) >= (data?.thresholds?.advance_watch_m ?? Infinity);
  const warnGrowth = (frame?.growthPct ?? 0) >= (data?.thresholds?.growth_watch_pct ?? Infinity);
  const topPad = Math.max(insets.top, 12) + 4;

  return (
    <View style={styles.screen}>
      <TerrainView
        data={data}
        frameIndex={frameIndex}
        layers={layers}
        rotate={rotate}
        resetKey={resetKey}
        bottomInset={sheetHeight + dockOffset + 16}
        onRotateStopped={() => setRotate(false)}
      />

      {/* Top bar: back + lake tabs */}
      <View style={[styles.top, { paddingTop: topPad }]} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.round, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Back">
          <ArrowLeft size={20} color={Colors.ink} />
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {lakes.map((l) => {
            const selected = l.id === lakeId;
            return (
              <Pressable
                key={l.id}
                onPress={() => {
                  setPlaying(false);
                  setLakeId(l.id);
                }}
                style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityState={{ selected }}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
                  {l.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Tools */}
      <View style={[styles.tools, { top: topPad + 56 }]}>
        <ToolButton label="Satellite imagery" active={layers.satellite} onPress={() => setLayers((l) => ({ ...l, satellite: !l.satellite }))}>
          <Satellite size={20} color={layers.satellite ? Colors.onCoral : Colors.ink} />
        </ToolButton>
        <ToolButton label="Past lake outlines" active={layers.history} onPress={() => setLayers((l) => ({ ...l, history: !l.history, baseline: !l.history }))}>
          <Layers size={20} color={layers.history ? Colors.onCoral : Colors.ink} />
        </ToolButton>
        <ToolButton label="Slow rotation" active={rotate} onPress={() => setRotate((r) => !r)}>
          <RotateCw size={20} color={rotate ? Colors.onCoral : Colors.ink} />
        </ToolButton>
        <ToolButton label="Re-centre on the lake" onPress={() => setResetKey((k) => k + 1)}>
          <LocateFixed size={20} color={Colors.ink} />
        </ToolButton>
      </View>

      {/* Lake panel: Glance (name, level, date, size) / Explore (numbers) / Understand (why, key, sources) */}
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        bottomInset={dockOffset}
        animatedIndex={animatedIndex}
        onChange={setSheetIndex}
        enableContentPanningGesture={false}
        enableDynamicSizing={false}
        handleComponent={SheetHandle}
        backgroundStyle={styles.sheetBg}
        style={Shadows.sheet}>
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false} scrollEnabled={sheetIndex === snapPoints.length - 1}>
          {!data && (
            <Text style={styles.muted}>{loadStatus === 'error' ? 'Could not load lake data. Check that the Raha server is running.' : 'Loading lake data…'}</Text>
          )}

          {data && frame && (
            <>
              {/* Tier 0: Glance */}
              <Pressable
                onPress={cycleSheet}
                style={styles.glance}
                onLayout={measure(setGlanceH)}
                accessibilityRole="button"
                accessibilityLabel={`${data.lake.name}. Tap to ${sheetIndex >= snapPoints.length - 1 ? 'collapse' : 'show more'}`}>
                <View style={styles.glanceText}>
                  <Text style={styles.lakeName} numberOfLines={1}>
                    {data.lake.name}
                  </Text>
                  <Text style={styles.country} numberOfLines={1}>
                    {fmtDate(frame.date)} • {frame.areaHa.toFixed(0)} ha
                  </Text>
                </View>
                {level ? (
                  <View style={[styles.badge, { backgroundColor: GLOF_LEVEL_COLOR[level] }]} accessibilityLabel={`Alert level ${GLOF_LEVEL_LABEL[level]}`}>
                    <Text style={[styles.badgeText, { color: GLOF_LEVEL_TEXT[level] }]}>{GLOF_LEVEL_LABEL[level]}</Text>
                  </View>
                ) : null}
              </Pressable>

              {/* Tier 1: Explore */}
              <Animated.View style={[styles.tier, exploreStyle]} onLayout={measure(setExploreH)}>
                <View style={styles.statRow}>
                  <Stat
                    label="Lake size"
                    value={frame.areaHa.toFixed(0)}
                    unit="ha"
                    note={data.baseline && frame.growthPct != null ? `${frame.growthPct >= 0 ? '+' : ''}${frame.growthPct.toFixed(0)}% vs ${data.baseline.label}` : undefined}
                    warn={warnGrowth}
                  />
                  {hasHistory && frame.advanceM != null ? (
                    <Stat label="Shoreline moved" value={frame.advanceM.toFixed(0)} unit="m" note={data.baseline ? `since ${data.baseline.label}` : undefined} warn={warnAdvance} />
                  ) : (
                    <Stat label="Snow and ice nearby" value={frame.iceAreaKm2 != null ? frame.iceAreaKm2.toFixed(1) : '–'} unit="km²" note="latest scene" />
                  )}
                </View>
                {hasHistory && frame.reasons[0] ? <Text style={styles.reason}>{frame.reasons[0].text}</Text> : null}
                {!hasHistory ? <Text style={styles.muted}>Yearly history is not available for this lake yet. Showing the latest satellite scene.</Text> : null}
              </Animated.View>

              {/* Tier 2: Understand */}
              <Animated.View style={[styles.tier, detailsStyle]} onLayout={measure(setDetailsH)}>
                {frame.reasons.length > 0 && <Text style={styles.detailHeading}>Why this level</Text>}
                {frame.reasons.map((r, i) => (
                  <Text key={i} style={styles.detailText}>
                    • {r.text}
                  </Text>
                ))}
                {frame.flags.map((f, i) => (
                  <View key={i} style={styles.flagRow}>
                    <TriangleAlert size={16} color={Colors.watchTextAlt} />
                    <Text style={styles.detailText}>{f}</Text>
                  </View>
                ))}
                {data.lake.events[0] ? <Text style={styles.detailText}>{data.lake.events[0].detail}</Text> : null}

                <Text style={styles.detailHeading}>Map key</Text>
                <KeyRow swatch={<View style={[styles.swatchFill, { backgroundColor: '#3d9bff' }]} />} label="Lake in this image" />
                {hasHistory && <KeyRow swatch={<View style={[styles.swatchLine, { backgroundColor: '#9ec5f4' }]} />} label="Lake in past years, one line per year (darker is older)" />}
                {hasHistory && data.baseline && <KeyRow swatch={<View style={[styles.swatchLine, { backgroundColor: '#f5d06b' }]} />} label={`${data.baseline.label} lake (baseline)`} />}

                <Text style={styles.detailHeading}>About this data</Text>
                <Text style={styles.detailText}>{data.attribution.method}</Text>
                <Text style={styles.detailText}>{data.attribution.caveat}</Text>
                <Text style={styles.detailHeading}>Sources</Text>
                <Text style={styles.detailText}>{data.attribution.imagery}</Text>
                <Text style={styles.detailText}>{data.attribution.terrain}</Text>
                <Text style={styles.detailText}>Satellite backdrop: Sentinel-2 cloudless 2020 by EOX (CC BY-NC-SA 4.0). Terrain and imagery are bundled for this lake, so the 3D view works offline.</Text>
                <Text style={styles.detailText}>
                  Lake data updated {new Date(data.retrievedAt).toLocaleString()}
                  {loadStatus === 'offline' ? ' (saved copy, server unreachable)' : ''}.
                </Text>
              </Animated.View>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Timeline dock: always visible, like the web monitor's bottom bar */}
      {data && frame && hasHistory ? (
        <View style={[styles.dock, { paddingBottom: padBottom }]} onLayout={measure(setDockH)}>
          <View style={styles.dockRow}>
            <Pressable
              onPress={togglePlay}
              style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={playing ? 'Pause replay' : 'Replay lake history'}>
              {playing ? <Pause size={22} color={Colors.onCoral} /> : <Play size={22} color={Colors.onCoral} />}
            </Pressable>
            <View style={styles.dockDate}>
              <Text style={styles.dockDateText}>{fmtDate(frame.date)}</Text>
              <Text style={styles.dockSub}>Satellite image</Text>
            </View>
            <Pressable
              onPress={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)}
              style={({ pressed }) => [styles.speed, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Replay speed ${speed} times. Tap to change`}>
              <Text style={styles.speedText}>{speed}x</Text>
            </Pressable>
          </View>
          <TimelineSlider
            frames={frames}
            index={frameIndex}
            onChange={(i) => {
              setPlaying(false);
              setFrameIndex(i);
            }}
            events={data.lake.events.map((e) => ({ date: e.date, label: e.label }))}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101418' },
  pressed: { opacity: 0.8 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 12 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.card },
  chips: { gap: 8, paddingRight: 12 },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: Radii.pill, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.surface, justifyContent: 'center', ...Shadows.card },
  chipSelected: { backgroundColor: Colors.coral, borderColor: Colors.coral },
  chipText: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.meta, color: Colors.ink },
  chipTextSelected: { color: Colors.onCoral },
  tools: { position: 'absolute', right: 12, gap: 10 },
  tool: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.card },
  toolActive: { backgroundColor: Colors.coral },

  sheetBg: { backgroundColor: Colors.bg, borderTopLeftRadius: Radii.sheet, borderTopRightRadius: Radii.sheet },
  sheetContent: { paddingHorizontal: 18, gap: GAP, paddingBottom: 12 },
  handleArea: { height: HANDLE_H, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 56, height: 5, borderRadius: 3, backgroundColor: Colors.coral },
  glance: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  glanceText: { flex: 1, justifyContent: 'center' },
  lakeName: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.title, color: Colors.ink },
  country: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, color: Colors.text2 },
  badge: { paddingHorizontal: 14, minHeight: 36, borderRadius: Radii.pill, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.body },
  tier: { gap: GAP },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, padding: 12, borderRadius: Radii.tile, borderCurve: 'continuous', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, gap: 2 },
  statLabel: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.caption, color: Colors.text2 },
  statValue: { fontFamily: Typography.family.bold, fontSize: 26, color: Colors.ink },
  statWarn: { color: Colors.dangerDark },
  statUnit: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, color: Colors.text2 },
  statNote: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.caption, color: Colors.text3 },
  reason: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.body, lineHeight: 22, color: Colors.ink },
  muted: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, lineHeight: 20, color: Colors.text2 },
  detailHeading: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.meta, color: Colors.ink, marginTop: 6 },
  detailText: { flexShrink: 1, fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, lineHeight: 21, color: Colors.text2 },
  flagRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  keyRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  keySwatch: { width: 28, alignItems: 'center' },
  swatchFill: { width: 24, height: 12, borderRadius: 4 },
  swatchLine: { width: 24, height: 3, borderRadius: 2 },

  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  playButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.coral, alignItems: 'center', justifyContent: 'center' },
  dockRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dockDate: { flex: 1 },
  dockDateText: { fontVariant: ['tabular-nums'], fontFamily: Typography.family.bold, fontSize: Typography.sizes.meta, color: Colors.ink },
  dockSub: { fontFamily: Typography.family.regular, fontSize: 11, color: Colors.text3 },
  speed: { minWidth: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: Colors.coral, alignItems: 'center', justifyContent: 'center' },
  speedText: { fontVariant: ['tabular-nums'], fontFamily: Typography.family.bold, fontSize: Typography.sizes.meta, color: Colors.coralDeep },
});
