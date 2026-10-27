import { SwipeSheet } from '@/components/common/SwipeSheet';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import {
  X,
  Mountain,
  AlertOctagon,
  Radio,
  Package,
} from 'lucide-react-native';
import { Colors, Typography, Radii, Shadows } from '@/constants/theme';
import { PrimaryButton } from '@/components/common/PrimaryButton';

export interface WhatToDoModalProps {
  visible: boolean;
  onClose: () => void;
  settlementName?: string;
  safeHavenName?: string;
}

export function WhatToDoModal({
  visible,
  onClose,
  settlementName = 'Chungthang',
  safeHavenName = 'Nangkartshang Ridge Lookout',
}: WhatToDoModalProps) {
  return (
    <SwipeSheet visible={visible} onClose={onClose} sheetStyle={[styles.sheetCard, { paddingTop: 0 }]}>
      <>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>What to do right now</Text>
              <Text style={styles.subtitle}>
                Glacial Outburst Survival Protocol for {settlementName}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={6}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Close guidance">
              <X size={20} color={Colors.ink} strokeWidth={2.4} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            {/* Step 1 */}
            <View style={styles.stepCard}>
              <View style={[styles.stepIconCircle, styles.stepIconSafe]}>
                <Mountain size={20} color={Colors.safe} strokeWidth={2.4} />
              </View>
              <View style={styles.stepTextStack}>
                <Text style={styles.stepTitle}>1. Move to High Ground Immediately</Text>
                <Text style={styles.stepBody}>
                  Climb at least 50 meters vertical elevation above the valley floor.
                  Head towards {safeHavenName}. Do not wait to see the wave.
                </Text>
              </View>
            </View>

            {/* Step 2 */}
            <View style={styles.stepCard}>
              <View style={[styles.stepIconCircle, styles.stepIconDanger]}>
                <AlertOctagon size={20} color={Colors.dangerDark} strokeWidth={2.4} />
              </View>
              <View style={styles.stepTextStack}>
                <Text style={styles.stepTitle}>2. Avoid Riverbeds & Bridges</Text>
                <Text style={styles.stepBody}>
                  Never cross suspension footbridges or valley paths once a breach alert sounds.
                  Debris pulses carry boulders and destroy low crossings in seconds.
                </Text>
              </View>
            </View>

            {/* Step 3 */}
            <View style={styles.stepCard}>
              <View style={[styles.stepIconCircle, styles.stepIconWatch]}>
                <Radio size={20} color={Colors.watchTextAlt} strokeWidth={2.4} />
              </View>
              <View style={styles.stepTextStack}>
                <Text style={styles.stepTitle}>3. Keep Radios & Beacons Active</Text>
                <Text style={styles.stepBody}>
                  Monitor VHF Channel 07 (146.520 MHz) for mountain rescue updates.
                  Keep satellite phone or Iridium relay in an open sky pocket.
                </Text>
              </View>
            </View>

            {/* Step 4 */}
            <View style={styles.stepCard}>
              <View style={[styles.stepIconCircle, styles.stepIconNeutral]}>
                <Package size={20} color={Colors.ink} strokeWidth={2.4} />
              </View>
              <View style={styles.stepTextStack}>
                <Text style={styles.stepTitle}>4. Take Essentials Only</Text>
                <Text style={styles.stepBody}>
                  Grab your emergency medical kit, ID, warm layer, and water bottle.
                  Leave heavy baggage behind; speed is safety.
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <PrimaryButton
                title="Understood, I am on safe ground"
                variant="filled"
                onPress={onClose}
                height={54}
                style={{ width: '100%' }}
              />
            </View>
          </ScrollView>
      </>
    </SwipeSheet>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 33, 61, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '82%',
    ...Shadows.sheet,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.title,
    color: Colors.ink,
  },
  subtitle: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.text2,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  scrollContent: {
    paddingTop: 16,
    gap: 12,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.bg,
    borderRadius: Radii.card, borderCurve: 'continuous',
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  stepIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconSafe: {
    backgroundColor: Colors.safeTint,
  },
  stepIconDanger: {
    backgroundColor: Colors.dangerTint,
  },
  stepIconWatch: {
    backgroundColor: '#FEF3C7',
  },
  stepIconNeutral: {
    backgroundColor: '#E4E7EC',
  },
  stepTextStack: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.body,
    color: Colors.ink,
    marginBottom: 4,
  },
  stepBody: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.text2,
    lineHeight: 18,
  },
  actionRow: {
    marginTop: 8,
    marginBottom: 10,
  },
});
