import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Layers,
  LocateFixed,
  Pause,
  Play,
  RotateCw,
  Satellite,
  TriangleAlert,
} from 'lucide-react-native';
import { Colors, Radii, Shadows, Typography } from '@/constants/theme';
import { GLOF_LEVEL_COLOR, GLOF_LEVEL_LABEL, GLOF_LEVEL_TEXT } from '@/constants/glof';
import { TerrainView, type TerrainLayers } from '@/components/terrain/TerrainView';
import { TimelineSlider } from '@/components/terrain/TimelineSlider';
import { DEFAULT_GLOF_LAKES, useGlofStore } from '@/services/glofStore';

const PLAY_STEP_MS = 650;
const HANDLE_H = 36;
const GAP = 10;

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function ToolButton({
  label,
  active,
  onPress,
  children,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
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
      <Text style={styles.statValueRow}>
        <Text style={[styles.statValue, warn && styles.statWarn]}>{value}</Text>
        <Text style={styles.statUnit}> {unit}</Text>
      </Text>
      {note ? <Text style={styles.statNote}>{note}</Text> : null}
    </View>
  );
}

// Large, easy-to-grab handle: the sheet is dragged only from here so the timeline slider stays free.
function SheetHandle() {
  return (
    <View style={styles.handleArea} accessible accessibilityLabel="Drag to resize the lake panel">
      <View style={styles.handle} />
    </View>
  );
}

export default function TerrainScreen() {
  const insets = useSafeAreaInsets();
  const { lakes, byId, status, loadLakes, loadLake } = useGlofStore();
  const [lakeId, setLakeId] = useState(DEFAULT_GLOF_LAKES[0].id);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [layers, setLayers] = useState<TerrainLayers>({ satellite: true, history: true, baseline: true });
  const [rotate, setRotate] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [sheetIndex, setSheetIndex] = useState(1);
  const { height: screenH } = useWindowDimensions();

  const data = byId[lakeId] ?? null;
  const loadStatus = status[lakeId] ?? 'idle';
  const frames = data?.frames ?? [];
  const frame = frames[Math.min(frameIndex, Math.max(0, frames.length - 1))];
  const hasHistory = !!data?.archiveAvailable && frames.length > 1;

  // The sheet has three information tiers. Each tier's height is measured from its real content so a
  // snap point always lands on a section boundary and never cuts a card in half.
  //   0 Glance: play, name, level, date and size.   1 Explore: timeline, numbers, reason.
  //   2 Understand: why this level, caveats and sources.
  const sheetRef = useRef<BottomSheet>(null);
  const padBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 32 : 14);
  const [glanceH, setGlanceH] = useState(72);
  const [exploreH, setExploreH] = useState(230);
  const [detailsH, setDetailsH] = useState(300);
  const snapPoints = useMemo(() => {
    const s0 = HANDLE_H + glanceH + padBottom;
    const s1 = s0 + GAP + exploreH;
    const s2 = Math.min(s1 + GAP + detailsH, Math.round(screenH * 0.88));
    return s2 - s1 > 48 ? [s0, s1, s2] : [s0, s1];
  }, [glanceH, exploreH, detailsH, padBottom, screenH]);
  const sheetHeight = snapPoints[Math.min(sheetIndex, snapPoints.length - 1)];
  const measure = (set: (h: number) => void) => (e: LayoutChangeEvent) => set(Math.ceil(e.nativeEvent.layout.height));
  // Tapping the glance row (or using the accessibility action) steps between the tiers.
  const cycleSheet = useCallback(() => {
    sheetRef.current?.snapToIndex(sheetIndex >= snapPoints.length - 1 ? 0 : sheetIndex + 1);
  }, [sheetIndex, snapPoints.length]);
  useEffect(() => {
    loadLakes();
  }, [loadLakes]);

  useEffect(() => {
    loadLake(lakeId);
  }, [lakeId, loadLake]);

  // Jump to the newest scene whenever a lake's data first arrives.
  const lastLakeData = useRef<string | null>(null);
  useEffect(() => {
    if (data && lastLakeData.current !== data.lake.id) {
      lastLakeData.current = data.lake.id;
      setFrameIndex(data.frames.length - 1);
      setPlaying(false);
    }
  }, [data]);

  // Replay: step through scenes, stop at the newest.
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
    }, PLAY_STEP_MS);
    return () => clearInterval(t);
  }, [playing, hasHistory, frames.length]);

  const togglePlay = () => {
    if (!playing && frameIndex >= frames.length - 1) setFrameIndex(0);
    setPlaying((p) => !p);
  };

  const pastLayers = useMemo(() => layers, [layers]);
  const level = frame?.level ?? null;
  const warnAdvance = (frame?.advanceM ?? 0) >= (data?.thresholds?.advance_watch_m ?? Infinity);
  const warnGrowth = (frame?.growthPct ?? 0) >= (data?.thresholds?.growth_watch_pct ?? Infinity);

  return (
    <View style={styles.screen}>
      <TerrainView
        data={data}
        frameIndex={frameIndex}
        layers={pastLayers}
        rotate={rotate}
        resetKey={resetKey}
        bottomInset={sheetHeight + 16}
        onRotateStopped={() => setRotate(false)}
      />

      {/* Top bar: back + lake chips */}
      <View style={[styles.top, { paddingTop: Math.max(insets.top, 12) + 4 }]} pointerEvents="box-none">
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.round, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Back">
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
      <View style={[styles.tools, { top: Math.max(insets.top, 12) + 64 }]}>
        <ToolButton label="Satellite imagery" active={layers.satellite} onPress={() => setLayers((l) => ({ ...l, satellite: !l.satellite }))}>
          <Satellite size={20} color={layers.satellite ? Colors.onCoral : Colors.ink} />
        </ToolButton>
        <ToolButton
          label="Past lake outlines"
          active={layers.history}
          onPress={() => setLayers((l) => ({ ...l, history: !l.history, baseline: !l.history }))}>
          <Layers size={20} color={layers.history ? Colors.onCoral : Colors.ink} />
        </ToolButton>
        <ToolButton label="Slow rotation" active={rotate} onPress={() => setRotate((r) => !r)}>
          <RotateCw size={20} color={rotate ? Colors.onCoral : Colors.ink} />
        </ToolButton>
        <ToolButton label="Re-centre on the lake" onPress={() => setResetKey((k) => k + 1)}>
          <LocateFixed size={20} color={Colors.ink} />
        </ToolButton>
      </View>

      {/* Lake sheet: three tiers, resized by dragging the handle or tapping the top row. */}
      <BottomSheet
        ref={sheetRef}
        index={1}
        snapPoints={snapPoints}
        onChange={setSheetIndex}
        enableContentPanningGesture={false}
        enableDynamicSizing={false}
        handleComponent={SheetHandle}
        backgroundStyle={styles.sheetBg}
        style={Shadows.sheet}>
        <BottomSheetScrollView
          contentContainerStyle={[styles.sheetContent, { paddingBottom: padBottom }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={sheetIndex === snapPoints.length - 1}>
          {!data && (
            <Text style={styles.muted}>
              {loadStatus === 'error' ? 'Could not load lake data. Check that the Raha server is running.' : 'Loading lake data…'}
            </Text>
          )}

          {data && frame && (
            <>
              {/* Tier 0, Glance */}
              <View style={styles.glance} onLayout={measure(setGlanceH)}>
                {hasHistory ? (
                  <Pressable
                    onPress={togglePlay}
                    style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={playing ? 'Pause replay' : 'Replay lake history'}>
                    {playing ? <Pause size={22} color={Colors.onCoral} /> : <Play size={22} color={Colors.onCoral} />}
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={cycleSheet}
                  style={styles.glanceText}
                  accessibilityRole="button"
                  accessibilityLabel={`${data.lake.name}. Tap to ${sheetIndex >= snapPoints.length - 1 ? 'collapse' : 'show more'}`}>
                  <Text style={styles.lakeName} numberOfLines={1}>
                    {data.lake.name}
                  </Text>
                  <Text style={styles.country} numberOfLines={1}>
                    {fmtDate(frame.date)} • {frame.areaHa.toFixed(0)} ha
                  </Text>
                </Pressable>
                {level ? (
                  <View style={[styles.badge, { backgroundColor: GLOF_LEVEL_COLOR[level] }]} accessibilityLabel={`Alert level ${GLOF_LEVEL_LABEL[level]}`}>
                    <Text style={[styles.badgeText, { color: GLOF_LEVEL_TEXT[level] }]}>{GLOF_LEVEL_LABEL[level]}</Text>
                  </View>
                ) : null}
              </View>

              {/* Tier 1, Explore */}
              <View style={styles.tier} onLayout={measure(setExploreH)}>
                {hasHistory ? (
                  <TimelineSlider
                    frames={frames}
                    index={frameIndex}
                    onChange={(i) => {
                      setPlaying(false);
                      setFrameIndex(i);
                    }}
                    events={data.lake.events.map((e) => ({ date: e.date, label: e.label }))}
                  />
                ) : null}
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
                {hasHistory && data.lake.events[0] ? (
                  <Text style={styles.eventNote}>
                    Black tick on the timeline: {data.lake.events[0].label}, {fmtDate(data.lake.events[0].date)}
                  </Text>
                ) : null}
              </View>

              {/* Tier 2, Understand */}
              <View style={styles.tier} onLayout={measure(setDetailsH)}>
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
                <Text style={styles.detailHeading}>About this data</Text>
                <Text style={styles.detailText}>{data.attribution.method}</Text>
                <Text style={styles.detailText}>{data.attribution.caveat}</Text>
                <Text style={styles.detailHeading}>Sources</Text>
                <Text style={styles.detailText}>{data.attribution.imagery}</Text>
                <Text style={styles.detailText}>{data.attribution.terrain}</Text>
                <Text style={styles.detailText}>Satellite backdrop: Sentinel-2 cloudless 2020 by EOX (CC BY-NC-SA 4.0).</Text>
                <Text style={styles.detailText}>Terrain and imagery are bundled for this lake, so the 3D view works offline.</Text>
                <Text style={styles.detailText}>
                  Lake data updated {new Date(data.retrievedAt).toLocaleString()}
                  {loadStatus === 'offline' ? ' (saved copy, server unreachable)' : ''}.
                </Text>
              </View>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b0e12' },
  pressed: { opacity: 0.8 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 12 },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  chips: { gap: 8, paddingRight: 12 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.surface,
    justifyContent: 'center',
    ...Shadows.card,
  },
  chipSelected: { backgroundColor: Colors.coral, borderColor: Colors.coral },
  chipText: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.meta, color: Colors.ink },
  chipTextSelected: { color: Colors.onCoral },
  tools: { position: 'absolute', right: 12, gap: 10 },
  tool: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  toolActive: { backgroundColor: Colors.coral },
  sheetBg: { backgroundColor: Colors.bg, borderTopLeftRadius: Radii.sheet, borderTopRightRadius: Radii.sheet },
  sheetContent: { paddingHorizontal: 18, gap: GAP },
  handleArea: { height: HANDLE_H, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 56, height: 5, borderRadius: 3, backgroundColor: Colors.coral },
  glance: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  glanceText: { flex: 1, minHeight: 48, justifyContent: 'center' },
  tier: { gap: 10 },
  lakeName: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.title, color: Colors.ink },
  country: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, color: Colors.text2 },
  badge: { paddingHorizontal: 14, minHeight: 36, borderRadius: Radii.pill, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.body },
  dateLine: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, color: Colors.text2 },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, padding: 12, borderRadius: Radii.tile, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, gap: 2 },
  statLabel: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.caption, color: Colors.text2 },
  statValueRow: {},
  statValue: { fontFamily: Typography.family.bold, fontSize: 26, color: Colors.ink },
  statWarn: { color: Colors.dangerDark },
  statUnit: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, color: Colors.text2 },
  statNote: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.caption, color: Colors.text3 },
  reason: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.body, lineHeight: 22, color: Colors.ink },
  muted: { flex: 1, fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, lineHeight: 20, color: Colors.text2 },
  playButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.coral, alignItems: 'center', justifyContent: 'center' },
  eventNote: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.caption, color: Colors.text3 },
  detailsToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, alignSelf: 'flex-start' },
  detailsToggleText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.body,
    color: Colors.coralDeep,
    textDecorationLine: 'underline',
  },
  flip: { transform: [{ rotate: '180deg' }] },
  detailHeading: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.meta, color: Colors.ink, marginTop: 10, marginBottom: 2 },
  detailText: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, lineHeight: 21, color: Colors.text2, marginBottom: 4, flexShrink: 1 },
  flagRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  offlineRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
});
