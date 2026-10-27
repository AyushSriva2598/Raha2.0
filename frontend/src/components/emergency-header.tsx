import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
} from 'react-native';
import { Colors, Radii, Shadows, Spacing, Typography } from '@/constants/tokens';
import { useAppStore } from '@/store/useAppStore';
import { LakeId, LAKES_REGISTRY } from '@/constants/lakes';
import { AlertTriangle, ChevronDown, Check, Radio } from 'lucide-react-native';

interface EmergencyHeaderProps {
  showBreachBanner?: boolean;
  bannerText?: string;
  onSosPress?: () => void;
}

export const EmergencyHeader: React.FC<EmergencyHeaderProps> = ({
  showBreachBanner = true,
  bannerText,
  onSosPress,
}) => {
  const {
    activeLakeId,
    activeLake,
    setActiveLakeId,
    surgeMinutesRemaining,
    openSosModal,
  } = useAppStore();

  const [isLakePickerOpen, setIsLakePickerOpen] = useState(false);

  const handleSos = () => {
    if (onSosPress) {
      onSosPress();
    } else {
      openSosModal(true);
    }
  };

  const currentBannerText =
    bannerText ||
    `BREACH SURGE ALERT — ${surgeMinutesRemaining} MIN TO REACH HIGH GROUND`;

  return (
    <View style={styles.container}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        {/* Brand Mark */}
        <View style={styles.brandContainer}>
          <View style={styles.logoDiamond}>
            <View style={styles.logoInnerDot} />
          </View>
          <Text style={styles.brandTitle}>Raha</Text>
        </View>

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
          <ChevronDown size={14} color={Colors.slateFog} />
        </Pressable>

        {/* Quick SOS Red Action Button */}
        <Pressable
          style={({ pressed }) => [
            styles.sosButton,
            pressed && styles.pressed,
          ]}
          onPress={handleSos}>
          <Radio size={14} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={styles.sosButtonText}>SOS</Text>
        </Pressable>
      </View>

      {/* Breach Surge Warning Banner */}
      {showBreachBanner && (
        <View style={styles.bannerContainer}>
          <AlertTriangle size={15} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={styles.bannerText} numberOfLines={1}>
            {currentBannerText}
          </Text>
        </View>
      )}

      {/* Lake Switcher Modal */}
      <Modal
        visible={isLakePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLakePickerOpen(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsLakePickerOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>Select Glacial Lake Basin</Text>
            <Text style={styles.modalSubheading}>
              Switch telemetry, 3D terrain examination, and downstream flood routing:
            </Text>

            {(Object.keys(LAKES_REGISTRY) as LakeId[]).map((lakeKey) => {
              const lake = LAKES_REGISTRY[lakeKey];
              const isSelected = activeLakeId === lakeKey;

              return (
                <Pressable
                  key={lakeKey}
                  style={[
                    styles.lakeOptionCard,
                    isSelected && styles.lakeOptionCardSelected,
                  ]}
                  onPress={() => {
                    setActiveLakeId(lakeKey);
                    setIsLakePickerOpen(false);
                  }}>
                  <View style={styles.lakeOptionInfo}>
                    <View style={styles.lakeNameRow}>
                      <Text style={styles.lakeOptionName}>{lake.name}</Text>
                      <View style={styles.elevationBadge}>
                        <Text style={styles.elevationBadgeText}>{lake.elevationM}m</Text>
                      </View>
                    </View>
                    <Text style={styles.lakeOptionRegion}>
                      {lake.region} • {lake.riverBasin}
                    </Text>
                    <Text style={styles.lakeOptionSettlement}>
                      Primary Monitoring: {lake.primarySettlement.name} ({lake.primarySettlement.elevationM}m)
                    </Text>
                  </View>

                  {isSelected && (
                    <View style={styles.checkCircle}>
                      <Check size={16} color="#FFFFFF" strokeWidth={2.6} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBgLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    zIndex: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoDiamond: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.emergencyRed,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  brandTitle: {
    fontFamily: Typography.sansBold,
    fontSize: 20,
    color: Colors.emergencyRed,
    letterSpacing: -0.5,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.pillBg,
    borderWidth: 1,
    borderColor: Colors.pillBorder,
    borderRadius: Radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    maxWidth: 190,
  },
  locationDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.highGroundBlue,
  },
  locationText: {
    fontFamily: Typography.sansMedium,
    fontSize: 13,
    color: Colors.moraineInk,
    flexShrink: 1,
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.emergencyRed,
    borderRadius: Radii.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
    ...Shadows.subtle,
  },
  sosButtonText: {
    fontFamily: Typography.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bannerContainer: {
    backgroundColor: Colors.emergencyRed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  bannerText: {
    fontFamily: Typography.sansBold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 14, 18, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.cardBgLight,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    ...Shadows.card,
  },
  modalHeading: {
    fontFamily: Typography.sansBold,
    fontSize: 18,
    color: Colors.moraineInk,
    marginBottom: 4,
  },
  modalSubheading: {
    fontFamily: Typography.sansRegular,
    fontSize: 13,
    color: Colors.slateFog,
    marginBottom: Spacing.md,
  },
  lakeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.canvasBgLight,
  },
  lakeOptionCardSelected: {
    borderColor: Colors.emergencyRed,
    backgroundColor: Colors.emergencyRedLight,
  },
  lakeOptionInfo: {
    flex: 1,
    gap: 2,
  },
  lakeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lakeOptionName: {
    fontFamily: Typography.sansBold,
    fontSize: 16,
    color: Colors.moraineInk,
  },
  elevationBadge: {
    backgroundColor: Colors.highGroundBlueLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radii.sm,
  },
  elevationBadgeText: {
    fontVariant: ['tabular-nums'],
    fontFamily: Typography.sansMedium,
    fontSize: 11,
    color: Colors.highGroundBlue,
  },
  lakeOptionRegion: {
    fontFamily: Typography.sansRegular,
    fontSize: 12,
    color: Colors.slateFog,
  },
  lakeOptionSettlement: {
    fontFamily: Typography.sansMedium,
    fontSize: 12,
    color: Colors.bedrockGreen,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.emergencyRed,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});
