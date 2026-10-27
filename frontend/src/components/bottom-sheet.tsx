import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { Colors, Radii, Shadows, Spacing } from '@/constants/tokens';
import { SafePoint } from '@/types';
import {
  Hourglass,
  Navigation,
  Phone,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react-native';

interface EvacuationBottomSheetProps {
  safePoint: SafePoint | null;
  mode: 'EVACUATE' | 'NAVIGATE';
  arrivalWindowText?: string;
  onStartRoute?: () => void;
  onCallShelter?: () => void;
  onTriggerSos?: () => void;
}

export function EvacuationBottomSheet({
  safePoint,
  mode,
  arrivalWindowText = 'about 2 to 4 hours',
  onStartRoute,
  onCallShelter,
  onTriggerSos,
}: EvacuationBottomSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isNavigate = mode === 'NAVIGATE';

  const handleCall = () => {
    if (onCallShelter) {
      onCallShelter();
    } else if (safePoint?.contactPhone) {
      Linking.openURL(`tel:${safePoint.contactPhone}`).catch(() => {});
    }
  };

  return (
    <View style={styles.sheetContainer}>
      {/* Visual Drag Handle & Collapse Toggle */}
      <Pressable
        style={styles.handleContainer}
        onPress={() => setIsExpanded(!isExpanded)}>
        <View style={styles.dragHandle} />
      </Pressable>

      {/* Arrival Window / Velocity Buffer Banner */}
      {!isNavigate ? (
        <View style={styles.velocityBanner}>
          <View style={styles.velocityLeft}>
            <View style={styles.velocityIcon}>
              <Hourglass size={18} color="#FFFFFF" />
            </View>
            <View style={styles.velocityTextStack}>
              <Text style={styles.velocityLabel}>Lake Outflow Velocity</Text>
              <Text style={styles.velocityValue}>Flood wave buffer: {arrivalWindowText}</Text>
            </View>
          </View>
          <View style={styles.velocityPill}>
            <Text style={styles.velocityPillText}>Active Watch</Text>
          </View>
        </View>
      ) : (
        <View style={styles.navigateBanner}>
          <ShieldCheck size={18} color={Colors.cirqueTeal} />
          <View style={styles.navigateTextStack}>
            <Text style={styles.navigateTitle}>Hazard Avoidance Active</Text>
            <Text style={styles.navigateDesc}>
              Auto-routed via East Ridge to bypass GLOF flood surge corridor.
            </Text>
          </View>
        </View>
      )}

      {/* Nearest Safe Point Dossier Card */}
      <View style={styles.dossierCard}>
        <View style={styles.dossierHeader}>
          <View style={styles.dossierTitleStack}>
            <View style={styles.dossierBadgeRow}>
              <View style={styles.tealDot} />
              <Text style={styles.dossierTitle} numberOfLines={1}>
                {safePoint?.name || 'Namche Health Post'}
              </Text>
            </View>
            <Text style={styles.dossierSub}>
              High ground ridge (+{safePoint?.elevationGainM || 210}m) • Shelter Dossier
            </Text>
          </View>

          <View style={styles.dossierStatsCol}>
            <Text style={styles.walkTimeBig}>
              {safePoint?.walkingTimeMinutes || 42}
              <Text style={styles.walkTimeUnit}> min</Text>
            </Text>
            <Text style={styles.distanceText}>{safePoint?.distanceKm || 1.8} km uphill</Text>
          </View>
        </View>

        {/* Quick Metrics Ribbon (3 Columns) */}
        <View style={styles.metricsRibbon}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Capacity</Text>
            <Text style={[styles.metricValue, { color: Colors.cirqueTeal }]}>
              {safePoint?.capacityLabel || 'Normal (46%)'}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Elevation Gain</Text>
            <Text style={styles.metricValue}>+{safePoint?.elevationGainM || 210}m</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Gradient</Text>
            <Text style={styles.metricValue}>{safePoint?.gradientLabel || '14% Uphill'}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsStack}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={onStartRoute}>
            <Navigation size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Start Safe Ridge Guidance</Text>
          </Pressable>

          <View style={styles.secondaryButtonRow}>
            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              onPress={handleCall}>
              <Phone size={16} color={Colors.moraineInk} />
              <Text style={styles.secondaryButtonText}>Call Station</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.sosButton, pressed && styles.pressed]}
              onPress={onTriggerSos}>
              <AlertTriangle size={16} color={Colors.alarmRed} />
              <Text style={styles.sosButtonText}>Trigger SOS</Text>
            </Pressable>
          </View>
        </View>

        {/* Expandable Step-by-Step Directions */}
        <Pressable
          style={styles.expandHeader}
          onPress={() => setIsExpanded(!isExpanded)}>
          <Text style={styles.expandHeaderText}>Step-by-step ridge route guide</Text>
          {isExpanded ? (
            <ChevronUp size={16} color={Colors.slateFog} />
          ) : (
            <ChevronDown size={16} color={Colors.slateFog} />
          )}
        </Pressable>

        {isExpanded && (
          <View style={styles.directionsList}>
            <View style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>1</Text>
              </View>
              <Text style={styles.stepText}>
                Head 400m northeast along the marked teal cairn pathway away from the stream bed.
              </Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>2</Text>
              </View>
              <Text style={styles.stepText}>
                Ascend the western spur of Namche ridge (+140m). Maintain pace; trail is reinforced granite.
              </Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>3</Text>
              </View>
              <Text style={styles.stepText}>
                Check in at Namche Health Post solar shelter. Oxygen and satellite link operational.
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: Colors.glacierMist,
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
    ...Shadows.sheet,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(90, 110, 127, 0.35)',
  },
  velocityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(217, 98, 43, 0.12)',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(217, 98, 43, 0.25)',
  },
  velocityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  velocityIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  velocityTextStack: {
    flex: 1,
  },
  velocityLabel: {
    fontSize: 11,
    color: Colors.slateFog,
    fontWeight: '500',
  },
  velocityValue: {
    fontSize: 13,
    color: Colors.moraineInk,
    fontWeight: '700',
    marginTop: 2,
  },
  velocityPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: 'rgba(217, 98, 43, 0.3)',
  },
  velocityPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.warning,
  },
  navigateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(18, 165, 155, 0.12)',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(18, 165, 155, 0.25)',
  },
  navigateTextStack: {
    flex: 1,
  },
  navigateTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.cirqueTeal,
  },
  navigateDesc: {
    fontSize: 11,
    color: Colors.moraineInk,
    marginTop: 1,
  },
  dossierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.card,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  dossierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dossierTitleStack: {
    flex: 1,
    marginRight: 12,
  },
  dossierBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tealDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.cirqueTeal,
  },
  dossierTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.moraineInk,
  },
  dossierSub: {
    fontSize: 12,
    color: Colors.slateFog,
    marginTop: 2,
  },
  dossierStatsCol: {
    alignItems: 'flex-end',
  },
  walkTimeBig: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.cirqueTeal,
    lineHeight: 26,
  },
  walkTimeUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.slateFog,
  },
  distanceText: {
    fontVariant: ['tabular-nums'],
    fontSize: 11,
    color: Colors.slateFog,
    marginTop: 1,
  },
  metricsRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.firn,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.slateFog,
    fontWeight: '500',
  },
  metricValue: {
    fontVariant: ['tabular-nums'],
    fontSize: 12,
    fontWeight: '700',
    color: Colors.moraineInk,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.borderSubtle,
  },
  actionsStack: {
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    height: 52,
    backgroundColor: Colors.cirqueTeal,
    borderRadius: Radii.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadows.subtle,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: Radii.button,
    backgroundColor: Colors.glacierMist,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.moraineInk,
  },
  sosButton: {
    flex: 1,
    height: 46,
    borderRadius: Radii.button,
    backgroundColor: Colors.alarmRedLight,
    borderWidth: 1,
    borderColor: 'rgba(209, 48, 58, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sosButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.alarmRed,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  expandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    marginTop: 4,
  },
  expandHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.slateFog,
  },
  directionsList: {
    gap: 10,
    paddingTop: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.cirqueTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: Colors.moraineInk,
    lineHeight: 18,
  },
});
