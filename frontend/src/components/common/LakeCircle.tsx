import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, LakeCircleColors, RiskLevel } from '@/constants/theme';

export interface LakeHazardZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  riskLevel: RiskLevel;
}

export function getLakeCircleStyle(riskLevel: RiskLevel) {
  const color = LakeCircleColors[riskLevel] || LakeCircleColors.NORMAL;

  return {
    fillColor: riskLevel === 'WARNING' || riskLevel === 'EVACUATE'
      ? 'rgba(198, 40, 40, 0.22)'
      : riskLevel === 'WATCH' || riskLevel === 'ADVISORY'
        ? 'rgba(240, 138, 36, 0.22)'
        : 'rgba(227, 181, 5, 0.20)',
    strokeColor: color,
    strokeWidth: 2,
    lineDashPattern: [8, 6], // Dashed stroke per requirements
  };
}

export function LakeMarkerPill({
  name,
  riskLevel,
}: {
  name: string;
  riskLevel: RiskLevel;
}) {
  const isHighRisk = riskLevel === 'WARNING' || riskLevel === 'EVACUATE';
  const isWatch = riskLevel === 'WATCH' || riskLevel === 'ADVISORY';

  return (
    <View
      style={[
        styles.markerContainer,
        isHighRisk && styles.markerDanger,
        isWatch && styles.markerWatch,
        !isHighRisk && !isWatch && styles.markerLow,
      ]}>
      <View
        style={[
          styles.markerDot,
          { backgroundColor: LakeCircleColors[riskLevel] || LakeCircleColors.NORMAL },
        ]}
      />
      <Text style={styles.markerText} numberOfLines={1}>
        {name} · {riskLevel.charAt(0) + riskLevel.slice(1).toLowerCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  markerDanger: {
    borderColor: Colors.danger,
  },
  markerWatch: {
    borderColor: Colors.watch,
  },
  markerLow: {
    borderColor: Colors.low,
  },
  markerDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 7,
  },
  markerText: {
    fontFamily: Typography.family.bold,
    fontSize: 14,
    color: Colors.ink,
  },
});
