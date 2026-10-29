import { useShallow } from 'zustand/react/shallow';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Text, Pressable } from 'react-native';
import {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useAppStore } from '@/store/useAppStore';
import { HomeFabs } from '@/components/home/HomeFabs';
import { HomeHeader } from '@/components/home/HomeHeader';
import { HomeMap } from '@/components/home/HomeMap';
import {
  HomeBottomSheet,
  HomeHazardState,
} from '@/components/home/HomeBottomSheet';
import { WhatToDoModal } from '@/components/home/WhatToDoModal';
import { Colors, Typography, Radii, Shadows, RiskLevel } from '@/constants/theme';
import { LAKES_REGISTRY, LakeId } from '@/constants/lakes';
import { X, Check } from 'lucide-react-native';

export default function HomeScreen() {
  const { activeLakeId, activeLake, setActiveLakeId, alertLevel, setAlertLevel, surgeMinutesRemaining, decrementSurgeMinutes, safePoints, events, openSosModal, init } = useAppStore(useShallow((s) => ({ activeLakeId: s.activeLakeId, activeLake: s.activeLake, setActiveLakeId: s.setActiveLakeId, alertLevel: s.alertLevel, setAlertLevel: s.setAlertLevel, surgeMinutesRemaining: s.surgeMinutesRemaining, decrementSurgeMinutes: s.decrementSurgeMinutes, safePoints: s.safePoints, events: s.events, openSosModal: s.openSosModal, init: s.init })));

  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'terrain'>('standard');
  const [isTipsModalOpen, setIsTipsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // The header and map buttons belong to the map: they fade out as the sheet rises over them. All of
  // this runs on the UI thread from the sheet's own position, with no React state, so dragging the
  // sheet never triggers a re-render of the screen.
  const sheetIndex = useSharedValue(1);
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheetIndex.get(), [1, 1.6], [1, 0], Extrapolation.CLAMP),
  }));
  const chromeProps = useAnimatedProps(() => ({
    pointerEvents: sheetIndex.get() > 1.5 ? ('none' as const) : ('box-none' as const),
  }));
  const [overrideState, setOverrideState] = useState<HomeHazardState | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  // Periodic surge timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      decrementSurgeMinutes();
    }, 60000);
    return () => clearInterval(timer);
  }, [decrementSurgeMinutes]);

  // Map backend alert level to bottom sheet hazard state
  const computedState: HomeHazardState = overrideState || (() => {
    if (alertLevel === 'EVACUATE' || alertLevel === 'WARNING') {
      return 'FLOOD_PATH';
    }
    if (alertLevel === 'WATCH') {
      return 'WATCH_ADVISORY';
    }
    return 'ALL_CLEAR';
  })();

  const computedRiskLevel: RiskLevel =
    alertLevel === 'EVACUATE'
      ? 'EVACUATE'
      : alertLevel === 'WARNING'
        ? 'WARNING'
        : alertLevel === 'WATCH'
          ? 'WATCH'
          : 'NORMAL';

  const toggleMapLayers = () => {
    setMapType((prev) => {
      if (prev === 'standard') return 'terrain';
      if (prev === 'terrain') return 'satellite';
      return 'standard';
    });
  };

  return (
    <View style={styles.container}>
      {/* 1. Full-bleed Google Map Behind */}
      <HomeMap
        lake={activeLake}
        mapType={mapType}
        bottomSheetHeight={300}
      />

      {/* 2. Floating Minimal Header Over White Fade */}
      <HomeHeader onToggleMenu={() => setIsMenuOpen(true)} fadeStyle={chromeStyle} fadeProps={chromeProps} />
      <HomeFabs mapType={mapType} onToggleLayers={toggleMapLayers} fadeStyle={chromeStyle} fadeProps={chromeProps} />

      {/* 3. Bottom Sheet in Front (120px / 424px / ~85%) */}
      <HomeBottomSheet
        state={computedState}
        riskLevel={computedRiskLevel}
        lake={activeLake}
        surgeMinutes={surgeMinutesRemaining}
        safePoints={safePoints}
        events={events}
        onOpenTips={() => setIsTipsModalOpen(true)}
        onOpenSos={() => openSosModal(true)}
        animatedIndex={sheetIndex}
      />

      {/* 4. "What To Do" Emergency Tips Sheet Modal */}
      <WhatToDoModal
        visible={isTipsModalOpen}
        onClose={() => setIsTipsModalOpen(false)}
        settlementName={activeLake.primarySettlement.name}
        safeHavenName={activeLake.primarySafeHaven.name}
      />

      {/* 5. Basin & State Switcher Menu Modal */}
      <Modal visible={isMenuOpen} transparent animationType="fade">
        <View style={styles.menuOverlay}>
          <View style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Raha Mission Control</Text>
              <Pressable
                onPress={() => setIsMenuOpen(false)}
                hitSlop={8}
                style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}>
                <X size={20} color={Colors.ink} />
              </Pressable>
            </View>

            {/* Basin Selector */}
            <Text style={styles.menuSectionHeader}>ACTIVE BASIN</Text>
            {Object.keys(LAKES_REGISTRY).map((key) => {
              const lake = LAKES_REGISTRY[key as LakeId];
              const isSelected = lake.id === activeLakeId;
              return (
                <Pressable
                  key={lake.id}
                  style={[styles.menuOption, isSelected && styles.menuOptionSelected]}
                  onPress={() => {
                    setActiveLakeId(lake.id);
                    setIsMenuOpen(false);
                  }}>
                  <View style={styles.menuOptionTextStack}>
                    <Text style={styles.menuOptionTitle}>{lake.name}</Text>
                    <Text style={styles.menuOptionMeta}>
                      {lake.region}, {lake.country} • {lake.elevationM.toLocaleString()}m
                    </Text>
                  </View>
                  {isSelected && <Check size={18} color={Colors.safe} />}
                </Pressable>
              );
            })}

            {/* Hazard State Tester */}
            <Text style={styles.menuSectionHeader}>SIMULATE HAZARD STATE</Text>
            <View style={styles.stateButtonsGrid}>
              <Pressable
                style={[
                  styles.stateBtn,
                  computedState === 'FLOOD_PATH' && styles.stateBtnRed,
                ]}
                onPress={() => {
                  setOverrideState('FLOOD_PATH');
                  setAlertLevel('WARNING');
                  setIsMenuOpen(false);
                }}>
                <Text
                  style={[
                    styles.stateBtnText,
                    computedState === 'FLOOD_PATH' && styles.stateBtnTextWhite,
                  ]}>
                  Warning (Red)
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.stateBtn,
                  computedState === 'WATCH_ADVISORY' && styles.stateBtnAmber,
                ]}
                onPress={() => {
                  setOverrideState('WATCH_ADVISORY');
                  setAlertLevel('WATCH');
                  setIsMenuOpen(false);
                }}>
                <Text
                  style={[
                    styles.stateBtnText,
                    computedState === 'WATCH_ADVISORY' && styles.stateBtnTextWhite,
                  ]}>
                  Watch (Amber)
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.stateBtn,
                  computedState === 'ALL_CLEAR' && styles.stateBtnGreen,
                ]}
                onPress={() => {
                  setOverrideState('ALL_CLEAR');
                  setAlertLevel('CLEAR');
                  setIsMenuOpen(false);
                }}>
                <Text
                  style={[
                    styles.stateBtnText,
                    computedState === 'ALL_CLEAR' && styles.stateBtnTextWhite,
                  ]}>
                  All Clear (Green)
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.stateBtn,
                  computedState === 'OFFLINE' && styles.stateBtnGray,
                ]}
                onPress={() => {
                  setOverrideState('OFFLINE');
                  setIsMenuOpen(false);
                }}>
                <Text
                  style={[
                    styles.stateBtnText,
                    computedState === 'OFFLINE' && styles.stateBtnTextWhite,
                  ]}>
                  Offline Banner
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.stateBtn,
                  computedState === 'LOCATION_DENIED' && styles.stateBtnDark,
                ]}
                onPress={() => {
                  setOverrideState('LOCATION_DENIED');
                  setIsMenuOpen(false);
                }}>
                <Text
                  style={[
                    styles.stateBtnText,
                    computedState === 'LOCATION_DENIED' && styles.stateBtnTextWhite,
                  ]}>
                  Location Denied
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 33, 61, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: Radii.cardLarge, borderCurve: 'continuous',
    padding: 20,
    ...Shadows.sheet,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 14,
  },
  menuTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.title,
    color: Colors.ink,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  menuSectionHeader: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.caption,
    color: Colors.text3,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 6,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: Radii.tile, borderCurve: 'continuous',
    backgroundColor: Colors.bg,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuOptionSelected: {
    borderColor: Colors.safe,
    backgroundColor: Colors.safeTint,
  },
  menuOptionTextStack: {
    flex: 1,
  },
  menuOptionTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.body,
    color: Colors.ink,
  },
  menuOptionMeta: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.text2,
    marginTop: 2,
  },
  stateButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  stateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.chip,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stateBtnText: {
    fontFamily: Typography.family.bold,
    fontSize: 12,
    color: Colors.ink,
  },
  stateBtnRed: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  stateBtnAmber: {
    backgroundColor: Colors.watch,
    borderColor: Colors.watch,
  },
  stateBtnGreen: {
    backgroundColor: Colors.safe,
    borderColor: Colors.safe,
  },
  stateBtnGray: {
    backgroundColor: Colors.text2,
    borderColor: Colors.text2,
  },
  stateBtnDark: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  stateBtnTextWhite: {
    color: '#FFFFFF',
  },
});
