import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { Colors, Radii, Shadows, Spacing } from '@/constants/tokens';
import { useAppStore } from '@/store/useAppStore';
import { WaterlineHero } from '@/components/waterline';
import { MiniMapCard } from '@/components/mini-map';
import { EmergencySosModal } from '@/components/sos-modal';
import { EmergencyHeader } from '@/components/emergency-header';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Radio,
  Footprints,
  Compass,
  ArrowRight,
  Megaphone,
  ChevronUp,
} from 'lucide-react-native';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {
    alertLevel,
    activeAssessment,
    events,
    openSosModal,
    init,
    t,
  } = useAppStore();

  const [showAllEvents, setShowAllEvents] = useState(false);
  const strings = t();
  const isEvacuate = alertLevel === 'EVACUATE';
  const isWarning = alertLevel === 'WARNING';
  const isWatch = alertLevel === 'WATCH';

  useEffect(() => {
    init();
  }, [init]);

  const getStatusTitles = () => {
    if (isEvacuate) {
      return {
        title: strings.home.evacuateTitle,
        subtitle: strings.home.evacuateSubtitle,
      };
    }
    if (isWarning) {
      return {
        title: strings.home.warningTitle,
        subtitle: strings.home.warningSubtitle,
      };
    }
    if (isWatch) {
      return {
        title: strings.home.watchTitle,
        subtitle: strings.home.watchSubtitle,
      };
    }
    return {
      title: strings.home.clearTitle,
      subtitle: strings.home.clearSubtitle,
    };
  };

  const { title, subtitle } = getStatusTitles();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 16);
  const displayedEvents = showAllEvents ? events : events.slice(0, 3);

  const handleNotificationsClick = () => {
    Alert.alert(
      'Basin Telemetry Feeds',
      `Active Level: ${alertLevel}\nLatest Sensor Update: ${activeAssessment?.dataAge || '14 min ago'}\nAll 3 monitored Himalayan basins connected.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.outerContainer}>
      <View style={{ paddingTop: topPadding, backgroundColor: Colors.cardBgLight }}>
        <EmergencyHeader />
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Spacing.sm, paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* Dynamic Waterline & Status Hero */}
        <WaterlineHero
          assessment={activeAssessment}
          alertLevel={alertLevel}
          tTitle={title}
          tSubtitle={subtitle}
        />

        {/* Urgent Action Buttons (for Warning and Evacuate) */}
        {(isEvacuate || isWarning) && (
          <View style={styles.urgentButtonsSection}>
            <Pressable
              style={({ pressed }) => [
                styles.openMapUrgentButton,
                isEvacuate
                  ? { backgroundColor: Colors.alarmRed }
                  : { backgroundColor: Colors.warning },
                pressed && styles.pressed,
              ]}
              onPress={() => router.push('/map' as any)}>
              <View style={styles.openMapUrgentLeft}>
                <Compass size={22} color="#FFFFFF" />
                <Text style={styles.openMapUrgentText}>
                  {strings.home.openEvacuationMap}
                </Text>
              </View>
              <ArrowRight size={20} color="#FFFFFF" />
            </Pressable>

            {isEvacuate && (
              <Pressable
                style={({ pressed }) => [
                  styles.sosTriggerBannerButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => openSosModal(true)}>
                <AlertTriangle
                  size={18}
                  color={Colors.alarmRed}
                  strokeWidth={2.5}
                />
                <Text style={styles.sosTriggerBannerText}>
                  {strings.home.sendSos} (Sita, Meena)
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Basin Hydrology Mini-Map Card */}
        <View style={styles.sectionContainer}>
          <MiniMapCard
            onPress={() => router.push('/map' as any)}
            basinTitle={strings.home.basinHydrology}
            userLocationText={strings.home.youLocation}
            lakeDistText={strings.home.lakeDistance}
          />
        </View>

        {/* If in Evacuate state: Show Immediate Sequence Checklist */}
        {isEvacuate ? (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {strings.home.immediateSequence}
              </Text>
              <Text style={styles.sectionBadgeText}>
                {strings.home.actionsRequired}
              </Text>
            </View>

            <View style={styles.checklistCard}>
              <View style={styles.checklistItem}>
                <View style={styles.numBadge}>
                  <Text style={styles.numBadgeText}>1</Text>
                </View>
                <View style={styles.checklistItemTextStack}>
                  <Text style={styles.itemTitle}>{strings.home.step1Title}</Text>
                  <Text style={styles.itemDesc}>{strings.home.step1Desc}</Text>
                </View>
              </View>

              <View style={styles.itemDivider} />

              <View style={styles.checklistItem}>
                <View style={styles.numBadge}>
                  <Text style={styles.numBadgeText}>2</Text>
                </View>
                <View style={styles.checklistItemTextStack}>
                  <Text style={styles.itemTitle}>{strings.home.step2Title}</Text>
                  <Text style={styles.itemDesc}>{strings.home.step2Desc}</Text>
                </View>
              </View>

              <View style={styles.itemDivider} />

              <View style={styles.checklistItem}>
                <View style={styles.numBadge}>
                  <Text style={styles.numBadgeText}>3</Text>
                </View>
                <View style={styles.checklistItemTextStack}>
                  <Text style={styles.itemTitle}>{strings.home.step3Title}</Text>
                  <Text style={styles.itemDesc}>{strings.home.step3Desc}</Text>
                </View>
              </View>
            </View>

            {/* Official Authority Broadcast Notice */}
            <View style={styles.broadcastCard}>
              <View style={styles.broadcastIconContainer}>
                <Megaphone size={16} color={Colors.meltwater} />
              </View>
              <View style={styles.broadcastTextStack}>
                <Text style={styles.broadcastTitle}>
                  {strings.home.authorityBroadcast}
                </Text>
                <Text style={styles.broadcastCode}>
                  {strings.home.authorityCode}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          /* Normal / Clear / Watch Preparedness Card */
          <View style={styles.sectionContainer}>
            <View style={styles.preparednessCard}>
              <View style={styles.prepHeader}>
                <ShieldCheck size={20} color={Colors.cirqueTeal} />
                <Text style={styles.prepTitle}>
                  {strings.home.preparednessTitle}
                </Text>
              </View>

              <View style={styles.prepItemsStack}>
                <View style={styles.prepItem}>
                  <View style={styles.prepItemIcon}>
                    <Footprints size={18} color={Colors.meltwater} />
                  </View>
                  <View style={styles.prepItemText}>
                    <Text style={styles.prepItemName}>
                      {strings.home.pathFamiliarityTitle}
                    </Text>
                    <Text style={styles.prepItemSub}>
                      {strings.home.pathFamiliarityDesc}
                    </Text>
                  </View>
                </View>

                <View style={styles.prepItem}>
                  <View style={styles.prepItemIcon}>
                    <Radio size={18} color={Colors.meltwater} />
                  </View>
                  <View style={styles.prepItemText}>
                    <Text style={styles.prepItemName}>
                      {strings.home.vhfRadioTitle}
                    </Text>
                    <Text style={styles.prepItemSub}>
                      {strings.home.vhfRadioDesc}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Recent Lake Activity Log */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {strings.home.recentLakeActivity}
            </Text>
            <Pressable
              style={styles.seeAllRow}
              onPress={() => setShowAllEvents(!showAllEvents)}>
              <Text style={styles.seeAllText}>
                {showAllEvents ? 'Show less' : strings.home.seeAll}
              </Text>
              {showAllEvents ? (
                <ChevronUp size={16} color={Colors.meltwater} />
              ) : (
                <ChevronRight size={16} color={Colors.meltwater} />
              )}
            </Pressable>
          </View>

          <View style={styles.eventLogCard}>
            {displayedEvents.map((event, idx) => (
              <React.Fragment key={event.eventId}>
                <View style={styles.eventRow}>
                  <CheckCircle2
                    size={18}
                    color={
                      event.level === 'EVACUATE'
                        ? Colors.alarmRed
                        : event.level === 'WARNING'
                        ? Colors.warning
                        : Colors.cirqueTeal
                    }
                    style={styles.eventIcon}
                  />
                  <View style={styles.eventTextStack}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventMeta}>
                      {event.source} • {event.timestamp}
                    </Text>
                  </View>
                </View>
                {idx < displayedEvents.length - 1 && (
                  <View style={styles.eventDivider} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Primary Review Safe Ground CTA (for Clear/Watch) */}
        {!isEvacuate && (
          <View style={styles.bottomCtaSection}>
            <Pressable
              style={({ pressed }) => [
                styles.reviewGroundButton,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push('/map' as any)}>
              <Compass size={20} color="#FFFFFF" />
              <Text style={styles.reviewGroundButtonText}>
                {strings.home.reviewSafeGround}
              </Text>
            </Pressable>
            <Text style={styles.offlineNotice}>
              {strings.home.cachedGuidanceNotice}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Emergency SOS Modal */}
      <EmergencySosModal />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: Colors.firn,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    gap: Spacing.sm,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.marginMobile,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.firn,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  brandingCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.glacierMist,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.moraineInk,
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 11,
    color: Colors.slateFog,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glacierMist,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.borderSubtle,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  urgentButtonsSection: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.sm,
    gap: 10,
  },
  openMapUrgentButton: {
    height: 56,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.card,
  },
  openMapUrgentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  openMapUrgentText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sosTriggerBannerButton: {
    height: 52,
    borderRadius: Radii.button,
    backgroundColor: Colors.glacierMist,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  sosTriggerBannerText: {
    color: Colors.alarmRed,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionContainer: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.moraineInk,
  },
  sectionBadgeText: {
    fontSize: 12,
    color: Colors.slateFog,
    fontWeight: '600',
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.meltwater,
  },
  eventLogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    gap: 10,
  },
  eventIcon: {
    marginTop: 2,
  },
  eventTextStack: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.moraineInk,
  },
  eventMeta: {
    fontSize: 11,
    color: Colors.slateFog,
    marginTop: 2,
  },
  eventDivider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginHorizontal: Spacing.md,
  },
  preparednessCard: {
    backgroundColor: Colors.glacierMist,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  prepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.moraineInk,
  },
  prepItemsStack: {
    gap: 8,
  },
  prepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: 12,
  },
  prepItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prepItemText: {
    flex: 1,
  },
  prepItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.moraineInk,
  },
  prepItemSub: {
    fontSize: 11,
    color: Colors.slateFog,
    marginTop: 1,
  },
  checklistCard: {
    backgroundColor: Colors.glacierMist,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  numBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.alarmRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  checklistItemTextStack: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.moraineInk,
  },
  itemDesc: {
    fontSize: 12,
    color: Colors.slateFog,
    marginTop: 2,
    lineHeight: 16,
  },
  itemDivider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
  },
  broadcastCard: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radii.button,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  broadcastIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  broadcastTextStack: {
    flex: 1,
  },
  broadcastTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.moraineInk,
  },
  broadcastCode: {
    fontSize: 10,
    color: Colors.slateFog,
    marginTop: 2,
  },
  bottomCtaSection: {
    paddingHorizontal: Spacing.marginMobile,
    marginTop: Spacing.md,
    gap: 8,
  },
  reviewGroundButton: {
    height: 56,
    borderRadius: Radii.button,
    backgroundColor: Colors.meltwater,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadows.card,
  },
  reviewGroundButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  offlineNotice: {
    fontSize: 11,
    color: Colors.slateFog,
    textAlign: 'center',
    marginTop: 2,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
  },
});
