import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Colors, Radii, Shadows } from '@/constants/tokens';
import { useAppStore } from '@/store/useAppStore';
import { HazardMapCanvas } from '@/components/hazard-map-canvas';
import { Lake3DCanvas } from '@/components/lake-3d-canvas';
import { EmergencySosModal } from '@/components/sos-modal';
import { LakeId, LAKES_REGISTRY } from '@/constants/lakes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Compass,
  Box,
  Radio,
  ChevronDown,
  Check,
  ShieldCheck,
  Play,
  Pause,
  RotateCcw,
  Layers,
  Flame,
  Navigation,
} from 'lucide-react-native';

const TIMELINE_YEARS = [2018, 2020, 2022, 2023, 2024, 2026];

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const {
    activeLakeId,
    activeLake,
    activeReach,
    setActiveLakeId,
    mapViewMode,
    setMapViewMode,
    openSosModal,
    safePoints,
    selectedSafePoint,
    setSelectedSafePoint,
  } = useAppStore();

  const [isLakePickerOpen, setIsLakePickerOpen] = useState(false);
  const [isGuidanceActive, setIsGuidanceActive] = useState(false);

  // 3D Basin & Simulation state
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState<boolean>(false);
  const [timelineSpeed, setTimelineSpeed] = useState<number>(1);
  const [cameraPreset, setCameraPreset] = useState<'moraine' | 'downstream' | 'ortho'>('moraine');
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);

  // Flood Surge Simulator state
  const [isSimulatingFlood, setIsSimulatingFlood] = useState<boolean>(false);
  const [simulationProgress, setSimulationProgress] = useState<number>(0);

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 16);

  // Auto-play timeline loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimelinePlaying) {
      interval = setInterval(() => {
        setSelectedYear((prev) => {
          const idx = TIMELINE_YEARS.indexOf(prev);
          const nextIdx = (idx + 1) % TIMELINE_YEARS.length;
          return TIMELINE_YEARS[nextIdx];
        });
      }, 2000 / timelineSpeed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimelinePlaying, timelineSpeed]);

  const handleLakeSelect = (lakeId: LakeId) => {
    setActiveLakeId(lakeId);
    setIsLakePickerOpen(false);
    setSimulationProgress(0);
    setIsSimulatingFlood(false);
  };

  const handleToggleFloodSim = () => {
    if (isSimulatingFlood) {
      setIsSimulatingFlood(false);
    } else {
      setCameraPreset('downstream');
      setIsSimulatingFlood(true);
    }
  };

  const handleResetFloodSim = () => {
    setIsSimulatingFlood(false);
    setSimulationProgress(0);
  };

  const handleStartGuidance = () => {
    setIsGuidanceActive(!isGuidanceActive);
    Alert.alert(
      isGuidanceActive ? 'Navigation Ended' : 'Emergency Ascent Navigation Active',
      `Target: ${activeLake.primarySafeHaven.name}\nElevation Gain: +${activeLake.primarySafeHaven.elevationGainM}m\nEstimated Walk: ${activeLake.primarySafeHaven.walkTimeMinutes} min uphill along marked green bedrock path.`,
      [{ text: 'OK' }]
    );
  };

  // Determine current settlement affected by flood surge
  const currentDistanceKm = (simulationProgress / 100) * activeReach.totalLengthKm;
  const currentImpactSettlement =
    activeReach.settlements.find((st) => currentDistanceKm < st.distanceKm) ||
    activeReach.settlements[activeReach.settlements.length - 1];

  return (
    <View style={styles.container}>
      {/* Top Floating Control Bar */}
      <View style={[styles.topBarContainer, { paddingTop: topPadding }]}>
        <View style={styles.topBarRow}>
          {/* Location / Lake Selector Pill */}
          <Pressable
            style={({ pressed }) => [
              styles.locationPill,
              pressed && styles.pressed,
            ]}
            onPress={() => setIsLakePickerOpen(true)}>
            <View style={styles.locationDot} />
            <Text style={styles.locationText} numberOfLines={1}>
              {activeLake.primarySettlement.name} • {activeLake.primarySettlement.elevationM.toLocaleString()}m
            </Text>
            <ChevronDown size={14} color="#64748B" />
          </Pressable>

          {/* 2D Tactical vs 3D Basin Mode Switcher */}
          <View style={styles.modeSegment}>
            <Pressable
              style={[
                styles.modeButton,
                mapViewMode === 'TACTICAL_2D' && styles.modeButtonActive,
              ]}
              onPress={() => setMapViewMode('TACTICAL_2D')}>
              <Compass
                size={14}
                color={mapViewMode === 'TACTICAL_2D' ? '#FFFFFF' : '#64748B'}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  mapViewMode === 'TACTICAL_2D' && styles.modeButtonTextActive,
                ]}>
                2D Evac
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.modeButton,
                mapViewMode === 'BASIN_3D' && styles.modeButtonActive,
              ]}
              onPress={() => setMapViewMode('BASIN_3D')}>
              <Box
                size={14}
                color={mapViewMode === 'BASIN_3D' ? '#FFFFFF' : '#64748B'}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  mapViewMode === 'BASIN_3D' && styles.modeButtonTextActive,
                ]}>
                3D Basin
              </Text>
            </Pressable>
          </View>

          {/* Quick SOS Red Action Button */}
          <Pressable
            style={({ pressed }) => [
              styles.sosButton,
              pressed && styles.pressed,
            ]}
            onPress={() => openSosModal(true)}>
            <Radio size={13} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.sosButtonText}>SOS</Text>
          </Pressable>
        </View>
      </View>

      {/* Main Map Canvas Area */}
      <View style={styles.mapArea}>
        {mapViewMode === 'TACTICAL_2D' ? (
          /* Mode A: Native 2D Tactical Evacuation Google Map */
          <HazardMapCanvas
            mode="EVACUATE"
            targetPerson="ME"
            selectedSafePoint={selectedSafePoint}
            onSelectSafePoint={setSelectedSafePoint}
            safePoints={safePoints}
            lake={activeLake}
            reach={activeReach}
          />
        ) : (
          /* Mode B: 3D Basin Tabletop Slab with Downstream Flood Simulation */
          <Lake3DCanvas
            lake={activeLake}
            reach={activeReach}
            selectedYear={selectedYear}
            isSimulatingFlood={isSimulatingFlood}
            simulationProgress={simulationProgress}
            cameraPreset={cameraPreset}
            isOrbiting={isOrbiting}
            onSimulationProgressUpdate={(prog) => setSimulationProgress(prog)}
          />
        )}
      </View>

      {/* Mode A: 2D Tactical Evacuation Floating Bottom Drawer */}
      {mapViewMode === 'TACTICAL_2D' && (
        <View style={[styles.bottomDrawer, { paddingBottom: Math.max(insets.bottom, 16) + 60 }]}>
          {/* Urgent Evacuation Action Banner */}
          <Pressable
            style={({ pressed }) => [
              styles.startNavButton,
              isGuidanceActive && styles.startNavButtonActive,
              pressed && styles.pressed,
            ]}
            onPress={handleStartGuidance}>
            <View style={styles.startNavLeft}>
              <Navigation size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.startNavText}>
                {isGuidanceActive ? 'STOP EMERGENCY NAVIGATION' : 'START EMERGENCY NAVIGATION'}
              </Text>
            </View>
            <View style={styles.ascentBadge}>
              <Text style={styles.ascentBadgeText}>
                ASCENT {activeLake.primarySafeHaven.walkTimeMinutes} MIN
              </Text>
            </View>
          </Pressable>

          {/* Bedrock Safe Haven Destination Card */}
          <View style={styles.safeHavenCard}>
            <View style={styles.safeHavenCardHeader}>
              <View style={styles.havenTitleStack}>
                <Text style={styles.havenName}>
                  {activeLake.primarySafeHaven.name}
                </Text>
                <Text style={styles.havenDist}>
                  +{activeLake.primarySafeHaven.elevationGainM}m High Ground • {activeLake.primarySafeHaven.distanceKm} km
                </Text>
              </View>
              <View style={styles.bedrockPill}>
                <ShieldCheck size={14} color={Colors.bedrockGreen} />
                <Text style={styles.bedrockPillText}>100% Solid Bedrock</Text>
              </View>
            </View>

            <View style={styles.havenCapacityRow}>
              <Text style={styles.capacityText}>
                Available capacity: {activeLake.primarySafeHaven.availableBeds} / {activeLake.primarySafeHaven.totalCapacity} spots
              </Text>
              <Text style={styles.geologyText}>
                {activeLake.primarySafeHaven.geologyType}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Mode B: 3D Basin Simulation Floating Controls & HUD */}
      {mapViewMode === 'BASIN_3D' && (
        <View style={[styles.simOverlayContainer, { paddingBottom: Math.max(insets.bottom, 16) + 60 }]}>
          {/* Camera Presets Floating Pill Bar */}
          <View style={styles.cameraPillsBar}>
            <Pressable
              style={[
                styles.camButton,
                cameraPreset === 'moraine' && styles.camButtonActive,
              ]}
              onPress={() => setCameraPreset('moraine')}>
              <Text style={styles.camButtonText}>🏔️ Moraine Rim</Text>
            </Pressable>

            <Pressable
              style={[
                styles.camButton,
                cameraPreset === 'downstream' && styles.camButtonActive,
              ]}
              onPress={() => setCameraPreset('downstream')}>
              <Text style={styles.camButtonText}>🌊 Surge Valley</Text>
            </Pressable>

            <Pressable
              style={[
                styles.camButton,
                cameraPreset === 'ortho' && styles.camButtonActive,
              ]}
              onPress={() => setCameraPreset('ortho')}>
              <Text style={styles.camButtonText}>🛰️ Ortho Topo</Text>
            </Pressable>

            <Pressable
              style={[
                styles.camButton,
                isOrbiting && styles.camButtonActive,
              ]}
              onPress={() => setIsOrbiting(!isOrbiting)}>
              <Text style={styles.camButtonText}>🔄 Orbit</Text>
            </Pressable>
          </View>

          {/* Downstream Flood Simulator Floating HUD Card */}
          <View style={styles.simHudCard}>
            <View style={styles.simHudHeaderRow}>
              <View style={styles.simBadgePill}>
                <Flame size={13} color="#EF4444" strokeWidth={2.4} />
                <Text style={styles.simBadgeText}>
                  DOWNSTREAM OUTBURST FLOOD SIMULATOR
                </Text>
              </View>

              <View style={styles.simControlsRow}>
                <Pressable
                  style={[
                    styles.simActionButton,
                    isSimulatingFlood && styles.simActionButtonActive,
                  ]}
                  onPress={handleToggleFloodSim}>
                  {isSimulatingFlood ? (
                    <>
                      <Pause size={13} color="#FFFFFF" />
                      <Text style={styles.simActionText}>PAUSE</Text>
                    </>
                  ) : (
                    <>
                      <Play size={13} color="#FFFFFF" />
                      <Text style={styles.simActionText}>SIMULATE</Text>
                    </>
                  )}
                </Pressable>

                <Pressable style={styles.resetButton} onPress={handleResetFloodSim}>
                  <RotateCcw size={13} color="#94A3B8" />
                </Pressable>
              </View>
            </View>

            {/* Dynamic Wave Front Telemetry */}
            <View style={styles.waveStatsRow}>
              <View style={styles.waveStatItem}>
                <Text style={styles.waveStatLabel}>WAVE FRONT</Text>
                <Text style={styles.waveStatValue}>{Math.round(simulationProgress)}%</Text>
              </View>
              <View style={styles.waveStatItem}>
                <Text style={styles.waveStatLabel}>PEAK OUTFLOW</Text>
                <Text style={styles.waveStatValue}>{activeLake.criticalSurgeFlowM3s} m³/s</Text>
              </View>
              <View style={styles.waveStatItem}>
                <Text style={styles.waveStatLabel}>NEXT IMPACT</Text>
                <Text style={styles.waveStatValue}>{currentImpactSettlement?.name.split(' ')[0]}</Text>
              </View>
              <View style={styles.waveStatItem}>
                <Text style={styles.waveStatLabel}>STAGE DEPTH</Text>
                <Text style={styles.waveStatValue}>+{currentImpactSettlement?.maxStageDepthM}m</Text>
              </View>
            </View>

            {/* Progress Bar of Surge Wave Along Valley */}
            <View style={styles.simProgressTrack}>
              <View
                style={[
                  styles.simProgressFill,
                  { width: `${Math.min(100, Math.max(3, simulationProgress))}%` },
                ]}
              />
            </View>
          </View>

          {/* Sentinel-2 Multi-Year Timeline Scrubber (2018–2026) */}
          <View style={styles.timelineCard}>
            <View style={styles.timelineHeaderRow}>
              <View style={styles.timelineTitleRow}>
                <Layers size={13} color="#38BDF8" />
                <Text style={styles.timelineTitle}>
                  SENTINEL-2 TIMELINE • {selectedYear}
                </Text>
              </View>

              <View style={styles.timelinePlayControls}>
                <Pressable
                  style={styles.timelinePlayButton}
                  onPress={() => setIsTimelinePlaying(!isTimelinePlaying)}>
                  {isTimelinePlaying ? (
                    <Pause size={12} color="#FFFFFF" />
                  ) : (
                    <Play size={12} color="#FFFFFF" />
                  )}
                </Pressable>

                <Pressable
                  style={styles.speedChip}
                  onPress={() =>
                    setTimelineSpeed((prev) => (prev === 1 ? 5 : prev === 5 ? 20 : 1))
                  }>
                  <Text style={styles.speedChipText}>{timelineSpeed}x</Text>
                </Pressable>
              </View>
            </View>

            {/* Year Selector Capsules */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.yearsScrollRow}>
              {TIMELINE_YEARS.map((yr) => (
                <Pressable
                  key={yr}
                  style={[
                    styles.yearCapsule,
                    selectedYear === yr && styles.yearCapsuleActive,
                  ]}
                  onPress={() => setSelectedYear(yr)}>
                  <Text
                    style={[
                      styles.yearCapsuleText,
                      selectedYear === yr && styles.yearCapsuleTextActive,
                    ]}>
                    {yr}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Lake Switcher Modal */}
      <Modal
        visible={isLakePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLakePickerOpen(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsLakePickerOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Glacial Lake Basin</Text>
            <Text style={styles.modalSubtitle}>
              Switch monitored Himalayan basin for 2D tactical evacuation and 3D terrain simulation.
            </Text>

            {(Object.keys(LAKES_REGISTRY) as LakeId[]).map((lakeKey) => {
              const item = LAKES_REGISTRY[lakeKey];
              const isSelected = item.id === activeLakeId;
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.lakeOptionCard,
                    isSelected && styles.lakeOptionCardActive,
                  ]}
                  onPress={() => handleLakeSelect(item.id)}>
                  <View style={styles.lakeOptionLeft}>
                    <View style={styles.lakeOptionTitleRow}>
                      <Text style={styles.lakeOptionName}>{item.name}</Text>
                      <View style={styles.countryBadge}>
                        <Text style={styles.countryBadgeText}>{item.country}</Text>
                      </View>
                    </View>
                    <Text style={styles.lakeOptionDetails}>
                      {item.primarySettlement.name} ({item.primarySettlement.elevationM.toLocaleString()}m) • {item.riverBasin}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkCircle}>
                      <Check size={16} color="#FFFFFF" strokeWidth={2.8} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* Global Emergency SOS Modal */}
      <EmergencySosModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E12',
  },

  // Top Floating Bar
  topBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(11, 14, 18, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 8,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    gap: 8,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexShrink: 1,
  },
  locationDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  locationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },

  // Mode Segment
  modeSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: Radii.full,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  modeButtonActive: {
    backgroundColor: '#2563EB',
  },
  modeButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },

  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.emergencyRed,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  sosButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  mapArea: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  // 2D Drawer
  bottomDrawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 16,
    paddingTop: 14,
    ...Shadows.sheet,
  },
  startNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.emergencyRed,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  startNavButtonActive: {
    backgroundColor: '#991B1B',
  },
  startNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  startNavText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  ascentBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  ascentBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  safeHavenCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
  },
  safeHavenCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  havenTitleStack: {
    flex: 1,
  },
  havenName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  havenDist: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  bedrockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  bedrockPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.bedrockGreen,
  },
  havenCapacityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 8,
    marginTop: 4,
  },
  capacityText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  geologyText: {
    fontSize: 10,
    color: '#94A3B8',
  },

  // 3D Simulation Overlays
  simOverlayContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    gap: 8,
    pointerEvents: 'box-none',
  },
  cameraPillsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(11, 14, 18, 0.88)',
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 4,
    backdropFilter: 'blur(10px)',
  },
  camButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  camButtonActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.22)',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  camButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
  },

  // Simulator HUD
  simHudCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    padding: 12,
    backdropFilter: 'blur(12px)',
  },
  simHudHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  simBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  simBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  simControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  simActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
  },
  simActionButtonActive: {
    backgroundColor: '#EA580C',
  },
  simActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 6,
    borderRadius: Radii.sm,
  },
  waveStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  waveStatItem: {
    alignItems: 'center',
  },
  waveStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  waveStatValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  simProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  simProgressFill: {
    height: '100%',
    backgroundColor: '#EF4444',
  },

  // Timeline
  timelineCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    padding: 10,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timelineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timelineTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.4,
  },
  timelinePlayControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timelinePlayButton: {
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  speedChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  speedChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  yearsScrollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  yearCapsule: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  yearCapsuleActive: {
    backgroundColor: '#2563EB',
    borderColor: '#60A5FA',
  },
  yearCapsuleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  yearCapsuleTextActive: {
    color: '#FFFFFF',
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalSheet: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 17,
  },
  lakeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    marginBottom: 10,
  },
  lakeOptionCardActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  lakeOptionLeft: {
    flex: 1,
  },
  lakeOptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  lakeOptionName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  countryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  countryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  lakeOptionDetails: {
    fontSize: 12,
    color: '#94A3B8',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
