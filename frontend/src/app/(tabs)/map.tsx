import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Colors, Radii, Shadows, Spacing } from '@/constants/tokens';
import { useAppStore } from '@/store/useAppStore';
import { HazardMapCanvas } from '@/components/hazard-map-canvas';
import { EvacuationBottomSheet } from '@/components/bottom-sheet';
import { EmergencySosModal } from '@/components/sos-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  Navigation,
  Layers,
  X,
  Search,
  CheckCircle2,
  Route,
} from 'lucide-react-native';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const {
    mapMode,
    setMapMode,
    targetPerson,
    setTargetPerson,
    isLegendOpen,
    toggleLegend,
    safePoints,
    selectedSafePoint,
    setSelectedSafePoint,
    activeAssessment,
    openSosModal,
    t,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('Namche Ridge Solar Post (+210m)');
  const [isGuidanceActive, setIsGuidanceActive] = useState(false);

  const strings = t();
  const isNavigate = mapMode === 'NAVIGATE';
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 16);

  const handleStartGuidance = () => {
    setIsGuidanceActive(true);
    Alert.alert(
      'Live Safe Ridge Guidance Active',
      `Routing to ${selectedSafePoint?.name || 'Namche Health Post'}.\nFollow the marked teal pathway uphill. Elevation gain: +${selectedSafePoint?.elevationGainM || 210}m.`,
      [{ text: 'Start Navigation', onPress: () => {} }]
    );
  };

  const handleCallShelter = () => {
    Alert.alert(
      'Emergency Shelter Hotline',
      `Connecting to ${selectedSafePoint?.name || 'Namche Health Post'}\nPhone: ${selectedSafePoint?.contactPhone || '+977 38-540122'}\nRadio: 146.520 MHz`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Now', onPress: () => {} },
      ]
    );
  };

  return (
    <View style={styles.outerContainer}>
      {/* Top Floating Controls Container with proper status bar inset */}
      <View style={[styles.topControlsContainer, { paddingTop: topPadding }]}>
        {/* Primary Segmented Mode Control: Evacuate vs Navigate */}
        <View style={styles.modeSegment}>
          <Pressable
            style={[
              styles.modeButton,
              !isNavigate && styles.modeButtonEvacuateActive,
            ]}
            onPress={() => setMapMode('EVACUATE')}>
            <AlertTriangle
              size={16}
              color={!isNavigate ? '#FFFFFF' : Colors.moraineInk}
              strokeWidth={2.4}
            />
            <Text
              style={[
                styles.modeButtonText,
                !isNavigate && styles.modeButtonTextActive,
              ]}>
              {strings.map.evacuateMode}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.modeButton,
              isNavigate && styles.modeButtonNavigateActive,
            ]}
            onPress={() => setMapMode('NAVIGATE')}>
            <Navigation
              size={16}
              color={isNavigate ? '#FFFFFF' : Colors.moraineInk}
              strokeWidth={2.4}
            />
            <Text
              style={[
                styles.modeButtonText,
                isNavigate && styles.modeButtonTextActive,
              ]}>
              {strings.map.navigateMode}
            </Text>
          </Pressable>
        </View>

        {/* Secondary Switcher Row: For me / For Meena & Legend Pill */}
        <View style={styles.secondaryControlsRow}>
          <View style={styles.personSegment}>
            <Pressable
              style={[
                styles.personButton,
                targetPerson === 'ME' && styles.personButtonActive,
              ]}
              onPress={() => setTargetPerson('ME')}>
              <Text
                style={[
                  styles.personButtonText,
                  targetPerson === 'ME' && styles.personButtonTextActive,
                ]}>
                {strings.map.forMe}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.personButton,
                targetPerson === 'OTHER' && styles.personButtonActive,
              ]}
              onPress={() => setTargetPerson('OTHER')}>
              <Text
                style={[
                  styles.personButtonText,
                  targetPerson === 'OTHER' && styles.personButtonTextActive,
                ]}>
                {strings.map.forSomeoneElse}
              </Text>
              <View style={styles.otherDot} />
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.legendPill,
              pressed && styles.pressed,
            ]}
            onPress={toggleLegend}>
            <Layers size={16} color={Colors.meltwater} />
            <Text style={styles.legendPillText}>{strings.map.legend}</Text>
          </Pressable>
        </View>

        {/* Navigate Mode Search Bar & Route Preview */}
        {isNavigate && (
          <View style={styles.navigateSection}>
            <View style={styles.searchBar}>
              <Search size={16} color={Colors.slateFog} />
              <TextInput
                style={styles.searchInput}
                placeholder={strings.map.searchPlaceholder}
                placeholderTextColor={Colors.slateFog}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={styles.routeVerifiedCard}>
              <View style={styles.routeVerifiedRow}>
                <CheckCircle2 size={15} color={Colors.cirqueTeal} />
                <Text style={styles.routeVerifiedTitle}>
                  Hazard Avoidance Active • GLOF Basin Cleared
                </Text>
              </View>
              <Text style={styles.routeVerifiedDesc}>
                Auto-routed via East Ridge spur (+210m elevation gain, 1.8 km)
              </Text>
            </View>
          </View>
        )}

        {/* Collapsible Map Legend Drawer */}
        {isLegendOpen && (
          <View style={styles.legendDrawer}>
            <View style={styles.legendHeader}>
              <Text style={styles.legendTitle}>MAP LEGEND & SAFETY KEYS</Text>
              <Pressable onPress={toggleLegend}>
                <X size={16} color={Colors.slateFog} />
              </Pressable>
            </View>

            <View style={styles.legendGrid}>
              <View style={styles.legendItem}>
                <View style={styles.blueLegendDot} />
                <Text style={styles.legendItemText}>
                  {strings.map.yourPosition}
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View style={styles.tealLegendBar} />
                <Text style={styles.legendItemText}>
                  {strings.map.safeRoute}
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View style={styles.hazardLegendBox} />
                <Text style={styles.legendItemText}>
                  {strings.map.hazardBasin}
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View style={styles.shelterLegendCircle}>
                  <Text style={styles.shelterCrossText}>✚</Text>
                </View>
                <Text style={styles.legendItemText}>
                  {strings.map.highGroundShelter}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Live Guidance Banner if guidance is active */}
      {isGuidanceActive && (
        <View style={styles.guidanceBanner}>
          <Route size={18} color="#FFFFFF" />
          <View style={styles.guidanceTextStack}>
            <Text style={styles.guidanceTitle}>
              Navigating: {selectedSafePoint?.name || 'Namche Health Post'}
            </Text>
            <Text style={styles.guidanceSub}>
              Step 1 of 3: Ascend northeast teal cairn spur (350m remaining)
            </Text>
          </View>
          <Pressable
            style={styles.guidanceStopBtn}
            onPress={() => setIsGuidanceActive(false)}>
            <Text style={styles.guidanceStopText}>End</Text>
          </Pressable>
        </View>
      )}

      {/* Scrollable Map & Bottom Sheet Area */}
      <ScrollView
        style={styles.mapScroll}
        contentContainerStyle={[
          styles.mapScrollContent,
          { paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Vector Cartography Canvas */}
        <HazardMapCanvas
          mode={mapMode}
          targetPerson={targetPerson}
          selectedSafePoint={selectedSafePoint}
          onSelectSafePoint={setSelectedSafePoint}
          safePoints={safePoints}
        />

        {/* Safe Point Dossier & Guidance Bottom Sheet */}
        <EvacuationBottomSheet
          safePoint={selectedSafePoint || safePoints[0] || null}
          mode={mapMode}
          arrivalWindowText={
            targetPerson === 'OTHER'
              ? 'about 3.5 to 5 hours'
              : activeAssessment?.arrivalWindow || 'about 2 to 4 hours'
          }
          onStartRoute={handleStartGuidance}
          onCallShelter={handleCallShelter}
          onTriggerSos={() => openSosModal(true)}
        />
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
  topControlsContainer: {
    paddingHorizontal: Spacing.marginMobile,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    zIndex: 50,
    backgroundColor: Colors.firn,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  modeSegment: {
    height: 44,
    backgroundColor: Colors.glacierMist,
    borderRadius: Radii.full,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.subtle,
  },
  modeButton: {
    flex: 1,
    height: '100%',
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modeButtonEvacuateActive: {
    backgroundColor: Colors.alarmRed,
    ...Shadows.subtle,
  },
  modeButtonNavigateActive: {
    backgroundColor: Colors.meltwater,
    ...Shadows.subtle,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.moraineInk,
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  personSegment: {
    flex: 1,
    height: 36,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.full,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  personButton: {
    flex: 1,
    height: '100%',
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  personButtonActive: {
    backgroundColor: '#FFFFFF',
    ...Shadows.subtle,
  },
  personButtonText: {
    fontSize: 12,
    color: Colors.slateFog,
    fontWeight: '500',
  },
  personButtonTextActive: {
    color: Colors.moraineInk,
    fontWeight: '700',
  },
  otherDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.warning,
  },
  legendPill: {
    height: 36,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    ...Shadows.subtle,
  },
  legendPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.moraineInk,
  },
  navigateSection: {
    gap: 6,
  },
  searchBar: {
    height: 42,
    backgroundColor: Colors.glacierMist,
    borderRadius: Radii.button,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.moraineInk,
    fontWeight: '500',
  },
  routeVerifiedCard: {
    backgroundColor: 'rgba(18, 165, 155, 0.12)',
    padding: 8,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(18, 165, 155, 0.25)',
  },
  routeVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeVerifiedTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.cirqueTeal,
  },
  routeVerifiedDesc: {
    fontSize: 10,
    color: Colors.moraineInk,
    marginTop: 2,
  },
  legendDrawer: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  legendTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.moraineInk,
    letterSpacing: 0.8,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: '45%',
  },
  blueLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.meltwater,
  },
  tealLegendBar: {
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.cirqueTeal,
  },
  hazardLegendBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: 'rgba(217, 98, 43, 0.35)',
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  shelterLegendCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.cirqueTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shelterCrossText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: '800',
    lineHeight: 10,
  },
  legendItemText: {
    fontSize: 11,
    color: Colors.moraineInk,
    fontWeight: '500',
  },
  guidanceBanner: {
    backgroundColor: Colors.cirqueTeal,
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guidanceTextStack: {
    flex: 1,
  },
  guidanceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  guidanceSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 1,
  },
  guidanceStopBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  guidanceStopText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.alarmRed,
  },
  mapScroll: {
    flex: 1,
  },
  mapScrollContent: {
    gap: 0,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
