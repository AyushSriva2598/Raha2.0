import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import {
  Colors,
  Typography,
  RiskColors,
  RiskLevel,
  Radii,
} from '@/constants/theme';
import { Pill } from '@/components/common/Pill';

export interface RiskScaleProps {
  currentLevel: RiskLevel;
  showLabels?: boolean;
  style?: StyleProp<ViewStyle>;
}

const LEVELS: RiskLevel[] = [
  'NORMAL',
  'WATCH',
  'ADVISORY',
  'WARNING',
  'EVACUATE',
];

export function RiskScale({
  currentLevel,
  showLabels = true,
  style,
}: RiskScaleProps) {
  const currentIndex = LEVELS.indexOf(currentLevel);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.barContainer}>
        {LEVELS.map((level, idx) => {
          const isActive = idx === currentIndex;
          const isPast = idx <= currentIndex;
          const color = RiskColors[level];

          return (
            <View key={level} style={styles.segmentWrapper}>
              <View
                style={[
                  styles.segment,
                  {
                    backgroundColor: isPast ? color : Colors.border,
                    height: isActive ? 8 : 6,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>

      {showLabels && (
        <View style={styles.labelRow}>
          <Text style={styles.scaleStart}>Normal</Text>
          <Pill
            label={`Risk: ${currentLevel}`}
            variant={
              currentLevel === 'NORMAL'
                ? 'safe'
                : currentLevel === 'WATCH' || currentLevel === 'ADVISORY'
                  ? 'watch'
                  : 'danger'
            }
            size="sm"
          />
          <Text style={styles.scaleEnd}>Evacuate</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 4,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  segmentWrapper: {
    flex: 1,
  },
  segment: {
    borderRadius: Radii.chip,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  scaleStart: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.text3,
  },
  scaleEnd: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.caption,
    color: Colors.dangerDark,
  },
});
