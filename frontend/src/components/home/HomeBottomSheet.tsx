import type { SharedValue } from 'react-native-reanimated';
import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  AlertTriangle,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Navigation,
  MapPin,
  Clock,
  Users,
  WifiOff,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Typography, Radii, Shadows, Spacing, RiskLevel } from '@/constants/theme';
import { Pill } from '@/components/common/Pill';
import { StatTile } from '@/components/common/StatTile';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { SosButton } from '@/components/common/SosButton';
import { HomeUpdates } from '@/components/home/HomeUpdates';
import { LakeConfig } from '@/constants/lakes';
import { SafePoint, EventLog } from '@/types';

export type HomeHazardState =
  | 'FLOOD_PATH'
  | 'WATCH_ADVISORY'
  | 'ALL_CLEAR'
  | 'OFFLINE'
  | 'LOCATION_DENIED';

export interface HomeBottomSheetProps {
  state?: HomeHazardState;
  riskLevel?: RiskLevel;
  lake: LakeConfig;
  surgeMinutes: number;
  safePoints: SafePoint[];
  events: EventLog[];
  onOpenTips: () => void;
  onOpenSos: () => void;
  onSelectShelter?: (shelter: SafePoint) => void;
  /** Fractional snap index, so the screen can fade its floating controls as the sheet rises. */
  animatedIndex?: SharedValue<number>;
}

export function HomeBottomSheet({
  state = 'FLOOD_PATH',
  riskLevel = 'WARNING',
  lake,
  surgeMinutes,
  safePoints,
  events,
  onOpenTips,
  onOpenSos,
  onSelectShelter,
  animatedIndex,
}: HomeBottomSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const [currentSnapIndex, setCurrentSnapIndex] = useState(1); // default 424px

  // Snap points: peek, default (map stays mostly visible), expanded
  const snapPoints = useMemo(() => [96, '38%', '78%'], []);

  const handleSheetChanges = useCallback((index: number) => {
    setCurrentSnapIndex(index);
  }, []);

  const isExpanded = currentSnapIndex === 2;

  const handleStartSafeRoute = () => {
    router.push('/map' as any);
  };

  const handleOpenSettings = () => {
    Linking.openSettings().catch(() => {});
  };

  const nearestSafePoint = safePoints[0] || {
    id: 'sp-1',
    name: lake.primarySafeHaven.name,
    distanceKm: lake.primarySafeHaven.distanceKm,
    elevationGainM: lake.primarySafeHaven.elevationGainM,
    walkingTimeMinutes: lake.primarySafeHaven.walkTimeMinutes,
    isRecommended: true,
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={1} // Default collapsed snap (424px)
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      animatedIndex={animatedIndex}
      handleIndicatorStyle={styles.dragIndicator}
      backgroundStyle={styles.sheetBackground}
      style={Shadows.sheet}>
      <BottomSheetScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Offline Banner indicator (if in offline state or cached) */}
        {state === 'OFFLINE' && (
          <View style={styles.offlineBanner}>
            <WifiOff size={16} color={Colors.text2} />
            <Text style={styles.offlineText}>
              Showing saved data from 10:14 AM • Offline map tiles active
            </Text>
          </View>
        )}

        {/* =========================================================================
            STATE 1: IN FLOOD PATH (Red / Threat Active)
           ========================================================================= */}
        {state === 'FLOOD_PATH' && (
          <View style={styles.stateContainer}>
            {/* Zone Card (dangerTint, radius 24) */}
            <View style={styles.zoneCard}>
              {/* White Pill Header */}
              <View style={styles.whitePillHeader}>
                <AlertTriangle size={20} color={Colors.danger} strokeWidth={2.4} />
                <Text style={styles.whitePillText}>You are in the flood path</Text>
              </View>

              {/* 2x2 StatTile Grid */}
              <View style={styles.statGrid}>
                <View style={styles.gridRow}>
                  <StatTile
                    label="Wave reaches you"
                    value={surgeMinutes}
                    unit="min"
                    accent="danger"
                    style={styles.gridTile}
                  />
                  <StatTile
                    label="Lake breach point"
                    value={lake.primarySafeHaven.distanceKm}
                    unit="km away"
                    accent="neutral"
                    style={styles.gridTile}
                  />
                </View>
                <View style={styles.gridRow}>
                  <StatTile
                    label="River level"
                    value="+2.8"
                    unit="m, rising"
                    accent="danger"
                    style={styles.gridTile}
                  />
                  <StatTile
                    label="Safe camp"
                    value={lake.primarySafeHaven.distanceKm}
                    unit={`km, ${lake.primarySafeHaven.walkTimeMinutes} min on foot`}
                    accent="safe"
                    style={styles.gridTile}
                  />
                </View>
              </View>
            </View>

            {/* Red Banner (60 px, radius 20): "Lake outburst risk: WARNING" */}
            <View style={styles.redRiskBanner}>
              <View style={styles.riskBannerLeft}>
                <ShieldAlert size={22} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.riskBannerText}>
                  Lake outburst risk: {riskLevel}
                </Text>
              </View>
              <Pill
                label="LIVE"
                variant="white"
                size="sm"
                textStyle={{ color: Colors.danger, fontSize: 11 }}
              />
            </View>

            {/* Action Row: SOS (96 px) + Start safe route (flex) + Tips (64 px) */}
            <View style={styles.actionRow}>
              {/* SOS Button: 96 px wide */}
              <SosButton
                mode="inline"
                size={56}
                label="Hold 3s"
                onTrigger={onOpenSos}
              />

              {/* Start Safe Route: flex 1 coral */}
              <PrimaryButton
                title="Start safe route"
                variant="filled"
                icon={<Navigation size={18} color="#FFFFFF" />}
                onPress={handleStartSafeRoute}
                height={56}
                style={styles.startSafeButton}
              />

              {/* Tips Button: 64 px amber tint */}
              <Pressable
                onPress={onOpenTips}
                style={({ pressed }) => [
                  styles.tipsButton,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Tips: What to do right now">
                <HelpCircle size={22} color={Colors.watchText} strokeWidth={2.4} />
                <Text style={styles.tipsText}>Tips</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* =========================================================================
            STATE 2: WATCH / ADVISORY (Amber Banner, "Be ready", Prepare button)
           ========================================================================= */}
        {state === 'WATCH_ADVISORY' && (
          <View style={styles.stateContainer}>
            {/* Amber Banner */}
            <View style={styles.amberBanner}>
              <View style={styles.amberBannerIconBox}>
                <Clock size={20} color={Colors.watchText} strokeWidth={2.4} />
              </View>
              <View style={styles.amberBannerTextStack}>
                <Text style={styles.amberBannerTitle}>
                  Glacial Outburst Risk: ADVISORY
                </Text>
                <Text style={styles.amberBannerSubtitle}>
                  Elevated meltwater surge detected at {lake.name}. Be ready to evacuate.
                </Text>
              </View>
            </View>

            {/* Prepare Button & Actions */}
            <View style={styles.advisoryActions}>
              <PrimaryButton
                title="Prepare & Pack Evacuation Kit"
                variant="watch"
                onPress={onOpenTips}
                height={54}
                style={{ width: '100%', marginBottom: 10 }}
              />

              <View style={styles.actionRow}>
                <SosButton
                  mode="inline"
                  size={56}
                  label="Hold 3s"
                  onTrigger={onOpenSos}
                />
                <PrimaryButton
                  title="View High Ground Route"
                  variant="filled"
                  icon={<Navigation size={18} color="#FFFFFF" />}
                  onPress={handleStartSafeRoute}
                  height={56}
                  style={styles.startSafeButton}
                />
              </View>
            </View>
          </View>
        )}

        {/* =========================================================================
            STATE 3: ALL CLEAR (Green check, Calm sheet, "No active warnings near you")
           ========================================================================= */}
        {state === 'ALL_CLEAR' && (
          <View style={styles.stateContainer}>
            <View style={styles.allClearContainer}>
              <View style={styles.greenCheckCircle}>
                <CheckCircle size={32} color={Colors.safe} strokeWidth={2.5} />
              </View>
              <Text style={styles.allClearTitle}>No active warnings near you</Text>
              <Text style={styles.allClearSubtext}>
                Demo threat level for {lake.name}. No live lake sensors are connected yet.
              </Text>

              <View style={styles.allClearActionRow}>
                <SosButton
                  mode="inline"
                  size={56}
                  label="Hold 3s"
                  onTrigger={onOpenSos}
                />
                <PrimaryButton
                  title="View lakes in 3D"
                  variant="outlineCoral"
                  onPress={() => router.push('/terrain' as any)}
                  height={56}
                  style={styles.startSafeButton}
                />
              </View>
              <HomeUpdates />
            </View>
          </View>
        )}

        {/* =========================================================================
            STATE 4: LOCATION DENIED (Explain why, Settings button, place search)
           ========================================================================= */}
        {state === 'LOCATION_DENIED' && (
          <View style={styles.stateContainer}>
            <View style={styles.deniedContainer}>
              <MapPin size={28} color={Colors.dangerDark} />
              <Text style={styles.deniedTitle}>Location Access Required</Text>
              <Text style={styles.deniedBody}>
                Raha requires high-precision GPS to immediately compute whether you
                stand in an active glacial outburst flood wave reach.
              </Text>
              <PrimaryButton
                title="Open Device Settings"
                variant="neutral"
                onPress={handleOpenSettings}
                height={52}
                style={{ width: '100%', marginTop: 8 }}
              />
              <Pressable
                onPress={handleStartSafeRoute}
                style={styles.manualSearchButton}>
                <Text style={styles.manualSearchText}>
                  Or search your village manually
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* =========================================================================
            EXPANDED SHEET CONTENT (revealed when pulled up to ~85%)
           ========================================================================= */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            <View style={styles.expandedDivider} />

            {/* 1. Nearest Shelters & High Ground */}
            <View style={styles.expandedBlock}>
              <View style={styles.expandedHeaderRow}>
                <ShieldCheck size={18} color={Colors.safe} />
                <Text style={styles.expandedTitle}>Nearest Safe Ground & Shelters</Text>
              </View>

              <Pressable
                onPress={() => onSelectShelter && onSelectShelter(nearestSafePoint as any)}
                style={styles.shelterCard}>
                <View style={styles.shelterLeft}>
                  <Text style={styles.shelterName}>{nearestSafePoint.name}</Text>
                  <Text style={styles.shelterMeta}>
                    +{lake.primarySafeHaven.elevationGainM}m elevation gain • Solid bedrock ridge
                  </Text>
                </View>
                <View style={styles.shelterRight}>
                  <Text style={styles.shelterMinutes}>
                    {lake.primarySafeHaven.walkTimeMinutes}
                  </Text>
                  <Text style={styles.shelterUnit}>min on foot</Text>
                </View>
              </Pressable>

              <View style={styles.shelterCard}>
                <View style={styles.shelterLeft}>
                  <Text style={styles.shelterName}>Pheriche Moraine High Ground Camp</Text>
                  <Text style={styles.shelterMeta}>
                    +140m elevation gain • Solar backup & radio station
                  </Text>
                </View>
                <View style={styles.shelterRight}>
                  <Text style={styles.shelterMinutes}>35</Text>
                  <Text style={styles.shelterUnit}>min on foot</Text>
                </View>
              </View>
            </View>

            {/* 2. Family Status ("People you protect") */}
            <View style={styles.expandedBlock}>
              <View style={styles.expandedHeaderRow}>
                <Users size={18} color={Colors.you} />
                <Text style={styles.expandedTitle}>People You Protect</Text>
              </View>

              <View style={styles.kinCard}>
                <View style={styles.kinAvatar}>
                  <Text style={styles.kinAvatarText}>PL</Text>
                </View>
                <View style={styles.kinTextStack}>
                  <Text style={styles.kinName}>Pasang Lhamo (Spouse)</Text>
                  <Text style={styles.kinSub}>Chungthang Monastery Ridge</Text>
                </View>
                <Pill
                  label="Safe · 2 min"
                  variant="safe"
                  size="sm"
                  icon={<CheckCircle size={12} color={Colors.safeDark} />}
                />
              </View>

              <View style={styles.kinCard}>
                <View style={styles.kinAvatar}>
                  <Text style={styles.kinAvatarText}>MS</Text>
                </View>
                <View style={styles.kinTextStack}>
                  <Text style={styles.kinName}>Karma Lepcha (Village Head)</Text>
                  <Text style={styles.kinSub}>Pheriche High Camp</Text>
                </View>
                <Pill
                  label="Safe · 8 min"
                  variant="safe"
                  size="sm"
                  icon={<CheckCircle size={12} color={Colors.safeDark} />}
                />
              </View>
            </View>

            {/* 3. Alert History Preview */}
            <View style={styles.expandedBlock}>
              <View style={styles.expandedHeaderRow}>
                <Clock size={18} color={Colors.text2} />
                <Text style={styles.expandedTitle}>Recent Hazard Timeline</Text>
              </View>

              {events.slice(0, 3).map((event) => (
                <View key={event.eventId} style={styles.timelineRow}>
                  <View
                    style={[
                      styles.timelineDot,
                      event.level === 'EVACUATE' || event.level === 'WARNING'
                        ? styles.timelineDotRed
                        : styles.timelineDotGreen,
                    ]}
                  />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>{event.title}</Text>
                    <Text style={styles.timelineTime}>{event.timestamp}</Text>
                  </View>
                  <ChevronRight size={16} color={Colors.text3} />
                </View>
              ))}
            </View>
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
  },
  dragIndicator: {
    width: 56,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.coral,
    alignSelf: 'center',
    marginVertical: 6,
  },
  scrollContent: {
    paddingHorizontal: Spacing.sidePadding,
    paddingTop: 4,
    paddingBottom: 120,
  },
  stateContainer: {
    width: '100%',
  },

  // Offline banner
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: Colors.watch,
    borderRadius: Radii.tile, borderCurve: 'continuous',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 8,
  },
  offlineText: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.watchText,
    flex: 1,
  },

  // 1. Zone Card (dangerTint, radius 24)
  zoneCard: {
    backgroundColor: Colors.dangerTint,
    borderRadius: Radii.cardLarge, borderCurve: 'continuous', // radius 24
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.danger,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  whitePillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.chip,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 8,
    marginBottom: 14,
    ...Shadows.card,
  },
  whitePillText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.title, // 20 bold
    color: Colors.danger,
  },
  statGrid: {
    gap: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gridTile: {
    flex: 1,
  },

  // Red Banner (60 px, radius 20): "Lake outburst risk: WARNING"
  redRiskBanner: {
    height: 60,
    borderRadius: Radii.card, borderCurve: 'continuous', // radius 20
    backgroundColor: Colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 14,
    ...Shadows.card,
  },
  riskBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  riskBannerText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.bodyLarge,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  startSafeButton: {
    flex: 1,
  },
  tipsButton: {
    width: 64,
    height: 56,
    borderRadius: Radii.button, borderCurve: 'continuous',
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: Colors.watch,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tipsText: {
    fontFamily: Typography.family.bold,
    fontSize: 11,
    color: Colors.watchText,
  },
  pressed: {
    opacity: 0.8,
  },

  // 2. Watch / Advisory
  amberBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E6',
    borderRadius: Radii.card, borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.watch,
    gap: 12,
    marginBottom: 14,
  },
  amberBannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amberBannerTextStack: {
    flex: 1,
  },
  amberBannerTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.watchText,
  },
  amberBannerSubtitle: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.watchTextAlt,
    marginTop: 2,
  },
  advisoryActions: {
    width: '100%',
  },

  // 3. All Clear
  allClearContainer: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: Colors.surface,
  },
  greenCheckCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.safeTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  allClearTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.title,
    color: Colors.ink,
    textAlign: 'center',
  },
  allClearSubtext: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.text2,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  allClearActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },

  // 4. Location Denied
  deniedContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.dangerTint,
    borderRadius: Radii.card, borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.danger,
    gap: 8,
  },
  deniedTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.title,
    color: Colors.dangerDark,
  },
  deniedBody: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.text2,
    textAlign: 'center',
    lineHeight: 18,
  },
  manualSearchButton: {
    paddingVertical: 8,
  },
  manualSearchText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.caption,
    color: Colors.you,
  },

  // Expanded Section
  expandedSection: {
    marginTop: 16,
    paddingTop: 12,
  },
  expandedDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  expandedBlock: {
    marginBottom: 20,
  },
  expandedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  expandedTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.body,
    color: Colors.ink,
  },

  // Shelter card
  shelterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg,
    borderRadius: Radii.card, borderCurve: 'continuous',
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shelterLeft: {
    flex: 1,
    marginRight: 10,
  },
  shelterName: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.body,
    color: Colors.ink,
  },
  shelterMeta: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.text2,
    marginTop: 2,
  },
  shelterRight: {
    alignItems: 'flex-end',
  },
  shelterMinutes: {
    fontFamily: Typography.family.bold,
    fontSize: 20,
    color: Colors.safe,
  },
  shelterUnit: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.text3,
  },

  // Kin Card
  kinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    borderRadius: Radii.card, borderCurve: 'continuous',
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kinAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  kinAvatarText: {
    fontFamily: Typography.family.bold,
    fontSize: 13,
    color: Colors.you,
  },
  kinTextStack: {
    flex: 1,
  },
  kinName: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.body,
    color: Colors.ink,
  },
  kinSub: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.text2,
  },

  // Timeline
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  timelineDotRed: {
    backgroundColor: Colors.danger,
  },
  timelineDotGreen: {
    backgroundColor: Colors.safe,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.caption,
    color: Colors.ink,
  },
  timelineTime: {
    fontFamily: Typography.family.regular,
    fontSize: 12,
    color: Colors.text3,
    marginTop: 1,
  },
});
