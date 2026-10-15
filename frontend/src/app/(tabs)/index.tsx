import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { Colors, Radii, Shadows, Spacing } from '@/constants/tokens';
import { useAppStore } from '@/store/useAppStore';
import { EmergencyHeader } from '@/components/emergency-header';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Clock,
  Activity,
  Droplets,
  Radio,
  Layers,
  Compass,
  AlertTriangle,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  ChevronUp,
  Box,
  Flame,
} from 'lucide-react-native';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {
    activeLake,
    surgeMinutesRemaining,
    events,
    setMapViewMode,
    decrementSurgeMinutes,
    init,
  } = useAppStore();

  const [showAllEvents, setShowAllEvents] = useState(false);
  const [isChecklistExpanded, setIsChecklistExpanded] = useState(true);

  useEffect(() => {
    init();
  }, [init]);

  // Periodic decrement of surge timer for live dynamic urgency
  useEffect(() => {
    const timer = setInterval(() => {
      decrementSurgeMinutes();
    }, 60000);
    return () => clearInterval(timer);
  }, [decrementSurgeMinutes]);

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 16);
  const displayedEvents = showAllEvents ? events : events.slice(0, 3);

  // Dynamic flow delta calculation
  const flowDeltaPct = Math.round(
    ((activeLake.criticalSurgeFlowM3s - activeLake.nominalFlowM3s) /
      activeLake.nominalFlowM3s) *
      100
  );

  // Meter percentage (nominal ~25%, critical ~85%)
  const meterWidthPct = Math.min(
    100,
    Math.max(20, Math.round((activeLake.criticalSurgeFlowM3s / 420) * 100))
  );

  const handleOpen3DExplorer = () => {
    setMapViewMode('BASIN_3D');
    router.push('/map' as any);
  };

  const handleOpen2DEvac = () => {
    setMapViewMode('TACTICAL_2D');
    router.push('/map' as any);
  };

  return (
    <View style={styles.outerContainer}>
      {/* Sticky Header with Logo, Location Switcher & Breach Banner */}
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

        {/* Status Indicators Pill Bar */}
        <View style={styles.statusPillsRow}>
          <View style={styles.liveSyncPill}>
            <View style={styles.livePulsingDot} />
            <Text style={styles.liveSyncText}>Live Sync Active (14s ago)</Text>
          </View>
          <View style={styles.basinPill}>
            <Text style={styles.basinPillEmoji}>🏔️</Text>
            <Text style={styles.basinPillText}>
              {activeLake.name} Basin ({activeLake.elevationM.toLocaleString()}m)
            </Text>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.headerSection}>
          <Text style={styles.subheadText}>BASIN TELEMETRY • LIVE EMERGENCY</Text>
          <Text style={styles.headlineText}>Breach Dynamics & Sensor Health</Text>
        </View>

        {/* Card 1: Surge Arrival Window */}
        <View style={styles.metricCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconBox}>
              <Clock size={17} color={Colors.moraineInk} strokeWidth={2.2} />
            </View>
            <Text style={styles.cardTitle}>Surge Arrival Window</Text>
            <View style={styles.imminentChip}>
              <Text style={styles.imminentChipText}>IMMINENT</Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.heroNumber}>{surgeMinutesRemaining}</Text>
            <Text style={styles.heroUnit}>Minutes</Text>
          </View>

          <View style={styles.settlementSubRow}>
            <MapPin size={14} color={Colors.slateFog} />
            <Text style={styles.settlementSubText}>
              {activeLake.primarySettlement.name} Settlement Impact Area ({activeLake.primarySettlement.elevationM.toLocaleString()}m)
            </Text>
          </View>
        </View>

        {/* Card 2: Outflow Severity */}
        <View style={styles.metricCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconBox}>
              <Activity size={17} color={Colors.emergencyRed} strokeWidth={2.4} />
            </View>
            <Text style={styles.cardTitle}>Outflow Severity</Text>
            <View style={styles.criticalChip}>
              <Flame size={12} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.criticalChipText}>CRITICAL SURGE</Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.heroNumber}>
              {activeLake.criticalSurgeFlowM3s}
            </Text>
            <Text style={styles.heroUnit}>m³/s</Text>
            <View style={styles.deltaBadge}>
              <Text style={styles.deltaBadgeText}>+{flowDeltaPct}% nominal</Text>
            </View>
          </View>

          {/* Dual-Tone Outflow Progress Meter */}
          <View style={styles.meterContainer}>
            <View style={styles.meterTrack}>
              <View style={[styles.meterFill, { width: `${meterWidthPct}%` }]} />
              {/* Baseline indicator marker at ~28% */}
              <View style={styles.meterBaselineMarker} />
            </View>
            <View style={styles.meterLabelsRow}>
              <Text style={styles.meterLabelLeft}>
                Nominal baseline: {activeLake.nominalFlowM3s} m³/s
              </Text>
              <Text style={styles.meterLabelRight}>
                Threshold: {Math.round(activeLake.nominalFlowM3s * 1.6)} m³/s
              </Text>
            </View>
          </View>
        </View>

        {/* Card 3: Lake Volume & Capacity */}
        <View style={styles.metricCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconBox}>
              <Droplets size={17} color={Colors.meltwater} strokeWidth={2.2} />
            </View>
            <Text style={styles.cardTitle}>Lake Volume & Capacity</Text>
            <View style={styles.capacityChip}>
              <Text style={styles.capacityChipText}>
                {activeLake.volumeCapacityPct}% CAPACITY
              </Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.heroNumber}>{activeLake.volumeMillionM3}</Text>
            <Text style={styles.heroUnit}>Million m³</Text>
          </View>

          {/* Internal Breach Status Callout */}
          <View style={styles.breachAlertCallout}>
            <AlertTriangle size={16} color={Colors.emergencyRed} strokeWidth={2.4} />
            <View style={styles.breachCalloutTextStack}>
              <Text style={styles.breachCalloutTitle}>
                {activeLake.id === 'imja_tsho'
                  ? 'Active Moraine Breach Detected'
                  : 'North Glacial Ice Apron Failure'}
              </Text>
              <Text style={styles.breachCalloutDesc}>
                High structural instability • Rapid discharge surge underway.
              </Text>
            </View>
          </View>
        </View>

        {/* Card 4: Regional Sensor Checkpoints */}
        <View style={styles.metricCard}>
          <View style={styles.checkpointsHeaderRow}>
            <View style={styles.checkpointsTitleRow}>
              <Radio size={17} color={Colors.moraineInk} strokeWidth={2.2} />
              <Text style={styles.checkpointsTitle}>Sensor Station Checkpoints</Text>
            </View>
            <View style={styles.activeSensorCountBadge}>
              <Text style={styles.activeSensorCountText}>
                {activeLake.sensors.length} of {activeLake.sensors.length} Active
              </Text>
            </View>
          </View>

          <View style={styles.sensorsList}>
            {activeLake.sensors.map((station, index) => {
              const isBreach =
                station.status === 'BREACH_SURGE' ||
                station.status === 'CRITICAL_SURGE';
              return (
                <View key={station.id}>
                  {index > 0 && <View style={styles.sensorDivider} />}
                  <View style={styles.sensorRow}>
                    <View
                      style={[
                        styles.sensorDot,
                        isBreach ? styles.sensorDotRed : styles.sensorDotGreen,
                      ]}
                    />
                    <View style={styles.sensorInfoStack}>
                      <Text style={styles.sensorName}>{station.name}</Text>
                      <Text style={styles.sensorLocation}>{station.location}</Text>
                    </View>
                    <View
                      style={[
                        styles.stationStatusBadge,
                        isBreach
                          ? styles.stationBadgeRed
                          : styles.stationBadgeGreen,
                      ]}>
                      <Text
                        style={[
                          styles.stationStatusText,
                          isBreach
                            ? styles.stationStatusTextRed
                            : styles.stationStatusTextGreen,
                        ]}>
                        • {station.statusLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Card 5: 3D Basin & Terrain Examining Preview Card */}
        <View style={styles.slabPreviewCard}>
          <View style={styles.slabBadgeRow}>
            <View style={styles.slabTagPill}>
              <Layers size={13} color="#38BDF8" strokeWidth={2.2} />
              <Text style={styles.slabTagText}>
                3D TABLETOP SLAB • SENTINEL-2 DEM
              </Text>
            </View>
            <View style={styles.live3DIcon}>
              <Box size={16} color="#38BDF8" />
            </View>
          </View>

          <Text style={styles.slabCardTitle}>
            3D Basin Examining & Flood Simulation
          </Text>
          <Text style={styles.slabCardDesc}>
            Inspect AWS Terrarium 3D elevation slab, morph multi-year moraine
            outlines (2018–2026), and watch simulated downstream outburst flood wave
            advance toward {activeLake.primarySettlement.name}.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.slabButton,
              pressed && styles.pressed,
            ]}
            onPress={handleOpen3DExplorer}>
            <View style={styles.slabButtonContent}>
              <Box size={18} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.slabButtonText}>
                EXPLORE 3D TERRAIN & FLOOD SIMULATION
              </Text>
            </View>
            <ArrowRight size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Primary Action Card: Immediate Evacuation Navigation */}
        <Pressable
          style={({ pressed }) => [
            styles.urgentEvacCard,
            pressed && styles.pressed,
          ]}
          onPress={handleOpen2DEvac}>
          <View style={styles.urgentEvacTopRow}>
            <View style={styles.urgentEvacBadge}>
              <Compass size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.urgentEvacBadgeText}>
                START EVACUATION NAVIGATION
              </Text>
            </View>
            <View style={styles.ascentTimePill}>
              <Text style={styles.ascentTimeText}>
                ASCENT {activeLake.primarySafeHaven.walkTimeMinutes} MIN
              </Text>
            </View>
          </View>

          <View style={styles.safeHavenInfoRow}>
            <View style={styles.safeHavenTextStack}>
              <Text style={styles.safeHavenName}>
                {activeLake.primarySafeHaven.name}
              </Text>
              <Text style={styles.safeHavenElevation}>
                +{activeLake.primarySafeHaven.elevationGainM}m Vertical Gain •{' '}
                {activeLake.primarySafeHaven.distanceKm} km
              </Text>
            </View>
            <View style={styles.bedrockPill}>
              <ShieldCheck size={14} color={Colors.bedrockGreen} />
              <Text style={styles.bedrockPillText}>100% Solid Bedrock</Text>
            </View>
          </View>
        </Pressable>

        {/* Immediate Life-Safety Sequence Checklist */}
        <View style={styles.checklistSectionCard}>
          <Pressable
            style={styles.checklistHeaderRow}
            onPress={() => setIsChecklistExpanded(!isChecklistExpanded)}>
            <View style={styles.checklistTitleLeft}>
              <ShieldCheck size={18} color={Colors.moraineInk} />
              <Text style={styles.checklistSectionTitle}>
                Immediate Life-Safety Checklist
              </Text>
            </View>
            <View style={styles.checklistHeaderRight}>
              <Text style={styles.checklistReqText}>3 Actions</Text>
              {isChecklistExpanded ? (
                <ChevronUp size={16} color={Colors.slateFog} />
              ) : (
                <ChevronRight size={16} color={Colors.slateFog} />
              )}
            </View>
          </Pressable>

          {isChecklistExpanded && (
            <View style={styles.checklistItemsList}>
              <View style={styles.checkItem}>
                <View style={styles.stepNumPill}>
                  <Text style={styles.stepNumText}>1</Text>
                </View>
                <View style={styles.stepTextStack}>
                  <Text style={styles.stepTitle}>
                    Move to High Ground Immediately
                  </Text>
                  <Text style={styles.stepDesc}>
                    Ascend &gt;50m vertical elevation above valley floor toward{' '}
                    {activeLake.primarySafeHaven.name}.
                  </Text>
                </View>
              </View>

              <View style={styles.checklistDivider} />

              <View style={styles.checkItem}>
                <View style={styles.stepNumPill}>
                  <Text style={styles.stepNumText}>2</Text>
                </View>
                <View style={styles.stepTextStack}>
                  <Text style={styles.stepTitle}>
                    Evacuate Riverbeds & Bridges
                  </Text>
                  <Text style={styles.stepDesc}>
                    Do not traverse valley floor or footbridges along{' '}
                    {activeLake.downstreamRiver}.
                  </Text>
                </View>
              </View>

              <View style={styles.checklistDivider} />

              <View style={styles.checkItem}>
                <View style={styles.stepNumPill}>
                  <Text style={styles.stepNumText}>3</Text>
                </View>
                <View style={styles.stepTextStack}>
                  <Text style={styles.stepTitle}>
                    Keep VHF Radio & Satellite Beacon Active
                  </Text>
                  <Text style={styles.stepDesc}>
                    Monitor Channel 07 (146.520 MHz) and alert kin via Satellite SOS.
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Recent Lake Activity Log */}
        <View style={styles.eventLogSection}>
          <View style={styles.eventLogHeaderRow}>
            <Text style={styles.eventLogTitle}>Basin Event Log</Text>
            <Pressable
              style={styles.seeAllRow}
              onPress={() => setShowAllEvents(!showAllEvents)}>
              <Text style={styles.seeAllText}>
                {showAllEvents ? 'Show less' : 'See all'}
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
                    size={17}
                    color={
                      event.level === 'EVACUATE'
                        ? Colors.alarmRed
                        : event.level === 'WARNING'
                        ? Colors.warning
                        : Colors.cirqueTeal
                    }
                  />
                  <View style={styles.eventTextStack}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventTimestamp}>{event.timestamp}</Text>
                  </View>
                  <View
                    style={[
                      styles.eventLevelPill,
                      event.level === 'EVACUATE'
                        ? styles.pillEvac
                        : event.level === 'WARNING'
                        ? styles.pillWarn
                        : styles.pillWatch,
                    ]}>
                    <Text
                      style={[
                        styles.eventLevelText,
                        event.level === 'EVACUATE'
                          ? styles.textEvac
                          : event.level === 'WARNING'
                          ? styles.textWarn
                          : styles.textWatch,
                      ]}>
                      {event.level}
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

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },

  // Status Pills Bar
  statusPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    gap: 8,
  },
  liveSyncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  livePulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveSyncText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  basinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
    flexShrink: 1,
  },
  basinPillEmoji: {
    fontSize: 12,
  },
  basinPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },

  // Header Section
  headerSection: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  subheadText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headlineText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },

  // Metric Cards
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
    ...Shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
  },
  imminentChip: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  imminentChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  criticalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  criticalChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  capacityChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  capacityChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },

  // Metric Rows
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 10,
  },
  heroNumber: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  heroUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  deltaBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    marginLeft: 6,
  },
  deltaBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },

  settlementSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  settlementSubText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },

  // Outflow Progress Meter
  meterContainer: {
    marginTop: 4,
  },
  meterTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    position: 'relative',
  },
  meterFill: {
    height: '100%',
    backgroundColor: Colors.emergencyRed,
    borderRadius: 5,
  },
  meterBaselineMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '26%',
    width: 2,
    backgroundColor: '#64748B',
  },
  meterLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  meterLabelLeft: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  meterLabelRight: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },

  // Breach Alert Callout
  breachAlertCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginTop: 4,
  },
  breachCalloutTextStack: {
    flex: 1,
  },
  breachCalloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C1C',
    marginBottom: 2,
  },
  breachCalloutDesc: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 16,
  },

  // Checkpoints
  checkpointsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  checkpointsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkpointsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  activeSensorCountBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  activeSensorCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  sensorsList: {
    marginTop: 4,
  },
  sensorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  sensorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  sensorDotRed: {
    backgroundColor: Colors.emergencyRed,
  },
  sensorDotGreen: {
    backgroundColor: Colors.bedrockGreen,
  },
  sensorInfoStack: {
    flex: 1,
  },
  sensorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  sensorLocation: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  stationStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  stationBadgeRed: {
    backgroundColor: '#FEE2E2',
  },
  stationBadgeGreen: {
    backgroundColor: '#DCFCE7',
  },
  stationStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stationStatusTextRed: {
    color: '#DC2626',
  },
  stationStatusTextGreen: {
    color: '#15803D',
  },
  sensorDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },

  // 3D Slab Preview Card
  slabPreviewCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 14,
    ...Shadows.card,
  },
  slabBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  slabTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  slabTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.6,
  },
  live3DIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slabCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  slabCardDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 14,
  },
  slabButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  slabButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slabButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  // Urgent Evacuation Navigation Card
  urgentEvacCard: {
    backgroundColor: Colors.emergencyRed,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    ...Shadows.card,
  },
  urgentEvacTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  urgentEvacBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urgentEvacBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  ascentTimePill: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  ascentTimeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  safeHavenInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  safeHavenTextStack: {
    flex: 1,
  },
  safeHavenName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  safeHavenElevation: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  bedrockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  bedrockPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.bedrockGreen,
  },

  // Checklist
  checklistSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 14,
    ...Shadows.card,
  },
  checklistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checklistTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checklistSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  checklistHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checklistReqText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  checklistItemsList: {
    marginTop: 14,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepTextStack: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  checklistDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },

  // Event Log
  eventLogSection: {
    marginTop: 4,
  },
  eventLogHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventLogTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.meltwater,
  },
  eventLogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    ...Shadows.card,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventTextStack: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  eventTimestamp: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  eventLevelPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  pillEvac: {
    backgroundColor: '#FEE2E2',
  },
  pillWarn: {
    backgroundColor: '#FEF3C7',
  },
  pillWatch: {
    backgroundColor: '#E0F2FE',
  },
  eventLevelText: {
    fontSize: 10,
    fontWeight: '700',
  },
  textEvac: {
    color: '#DC2626',
  },
  textWarn: {
    color: '#D97706',
  },
  textWatch: {
    color: '#0284C7',
  },
  eventDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },

  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
