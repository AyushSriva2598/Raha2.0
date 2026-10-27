import type { SharedValue } from 'react-native-reanimated';
import React, { useMemo, useRef } from 'react';
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
  Phone,
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
import { useAppStore } from '@/store/useAppStore';

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

  // Snap points: peek (the one-line status stays readable above the raised SOS button), default (map
  // stays mostly visible), expanded. Dynamic sizing is off so the sheet only ever rests on these three.
  const snapPoints = useMemo(() => [140, '42%', '80%'], []);
  const contacts = useAppStore((st) => st.userProfile?.contacts ?? []);
  const lakeKm = Math.round(
    haversineKm(lake.coordinates[1], lake.coordinates[0], lake.primarySettlement.coordinates[1], lake.primarySettlement.coordinates[0])
  );

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
      animatedIndex={animatedIndex}
      enableDynamicSizing={false}
      handleIndicatorStyle={styles.dragIndicator}
      backgroundStyle={styles.sheetBackground}
      style={Shadows.sheet}>
      <BottomSheetScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <PeekHeader state={state} lakeName={lake.name} surgeMinutes={surgeMinutes} />

        {/* =========================================================================
            STATE 1: IN FLOOD PATH (Red / Threat Active)
           ========================================================================= */}
        {state === 'FLOOD_PATH' && (
          <View style={styles.stateContainer}>
            {/* Zone Card (dangerTint, radius 24) */}
            <View style={styles.zoneCard}>
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
                    label="Distance to the lake"
                    value={lakeKm}
                    unit="km upstream"
                    accent="neutral"
                    style={styles.gridTile}
                  />
                </View>
                <View style={styles.gridRow}>
                  <StatTile
                    label="Alert level"
                    value={riskLevel}
                    unit="demo scenario"
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
                label="DEMO"
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

        {/* More, below the fold. Always rendered so nothing pops in when the sheet reaches the top. */}
        <View style={styles.expandedSection}>
          <View style={styles.expandedDivider} />

          <View style={styles.expandedBlock}>
            <View style={styles.expandedHeaderRow}>
              <ShieldCheck size={18} color={Colors.safe} />
              <Text style={styles.expandedTitle} textBreakStrategy="balanced">
                Nearest safe ground
              </Text>
            </View>
            <Pressable
              onPress={() => onSelectShelter && onSelectShelter(nearestSafePoint as any)}
              style={styles.shelterCard}>
              <View style={styles.shelterLeft}>
                <Text style={styles.shelterName}>{nearestSafePoint.name}</Text>
                <Text style={styles.shelterMeta}>
                  +{lake.primarySafeHaven.elevationGainM} m above the river · {lake.primarySafeHaven.distanceKm} km
                </Text>
              </View>
              <View style={styles.shelterRight}>
                <Text style={styles.shelterMinutes}>{lake.primarySafeHaven.walkTimeMinutes}</Text>
                <Text style={styles.shelterUnit}>min on foot</Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.expandedBlock}>
            <View style={styles.expandedHeaderRow}>
              <Users size={18} color={Colors.you} />
              <Text style={styles.expandedTitle}>Your SOS contacts</Text>
            </View>
            {contacts.length === 0 ? (
              <Pressable onPress={() => router.push('/contacts' as any)} style={styles.shelterCard} accessibilityRole="button">
                <Text style={styles.shelterMeta}>Nobody gets your SOS yet. Add someone you trust.</Text>
                <ChevronRight size={18} color={Colors.text3} />
              </Pressable>
            ) : (
              contacts.slice(0, 3).map((c) => (
                <View key={c.contactId} style={styles.kinCard}>
                  <View style={styles.kinAvatar}>
                    <Text style={styles.kinAvatarText}>
                      {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.kinTextStack}>
                    <Text style={styles.kinName}>{c.name}</Text>
                    <Text style={styles.kinSub}>
                      {c.relation} · {c.isActive ? 'gets your SOS' : 'SOS off'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${c.phone.replace(/\s/g, '')}`)}
                    style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Call ${c.name}`}>
                    <Phone size={18} color={Colors.onCoral} />
                  </Pressable>
                </View>
              ))
            )}
          </View>

          {events.length > 0 && (
            <View style={styles.expandedBlock}>
              <View style={styles.expandedHeaderRow}>
                <Clock size={18} color={Colors.text2} />
                <Text style={styles.expandedTitle}>Recent lake events</Text>
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
                </View>
              ))}
            </View>
          )}

          <Text style={styles.attribution}>River course © OpenStreetMap contributors</Text>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

// The one line that must be readable even when the sheet is at its lowest: what is happening, and what
// it means for you. Icon, colour and words all say the same thing, so colour is never the only signal.
function PeekHeader({ state, lakeName, surgeMinutes }: { state: HomeHazardState; lakeName: string; surgeMinutes: number }) {
  const content = {
    FLOOD_PATH: { Icon: AlertTriangle, color: Colors.danger, bg: Colors.dangerTint, title: 'You are in the flood path', sub: `Go to high ground now · wave in about ${surgeMinutes} min (demo)` },
    WATCH_ADVISORY: { Icon: Clock, color: Colors.watchText, bg: '#FFF3D6', title: 'Be ready to leave', sub: `Advisory for ${lakeName} (demo level)` },
    ALL_CLEAR: { Icon: CheckCircle, color: Colors.safe, bg: Colors.safeTint, title: 'No active warnings near you', sub: `${lakeName} · demo level, no live sensors yet` },
    OFFLINE: { Icon: WifiOff, color: Colors.text2, bg: Colors.coralTint, title: 'You are offline', sub: 'Showing the last saved data' },
    LOCATION_DENIED: { Icon: MapPin, color: Colors.dangerDark, bg: Colors.dangerTint, title: 'Location is off', sub: 'Turn it on to see if you are in the flood path' },
  }[state];
  const { Icon } = content;
  return (
    <View style={styles.peek} accessibilityRole="header" accessibilityLiveRegion="polite">
      <View style={[styles.peekIcon, { backgroundColor: content.bg }]}>
        <Icon size={24} color={content.color} strokeWidth={2.4} />
      </View>
      <View style={styles.peekText}>
        <Text style={styles.peekTitle} numberOfLines={1}>
          {content.title}
        </Text>
        <Text style={styles.peekSub} numberOfLines={2}>
          {content.sub}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  peek: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 4, paddingBottom: 16 },
  peekIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  peekText: { flex: 1, gap: 2 },
  peekTitle: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.bodyLarge, color: Colors.ink },
  peekSub: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, lineHeight: 19, color: Colors.text2 },
  callButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.coral, alignItems: 'center', justifyContent: 'center' },
  attribution: { marginTop: 8, fontFamily: Typography.family.regular, fontSize: Typography.sizes.caption, color: Colors.text3, textAlign: 'center' },
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
