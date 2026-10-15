import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors, Typography, Radii, Spacing } from '@/constants/theme';

export interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  icon?: React.ReactNode;
  accent?: 'danger' | 'safe' | 'watch' | 'neutral';
  style?: StyleProp<ViewStyle>;
}

export function StatTile({
  label,
  value,
  unit,
  subtext,
  icon,
  accent = 'neutral',
  style,
}: StatTileProps) {
  const getAccentColor = () => {
    switch (accent) {
      case 'danger':
        return Colors.dangerDark;
      case 'safe':
        return Colors.safeDark;
      case 'watch':
        return Colors.watchText;
      case 'neutral':
      default:
        return Colors.ink;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {icon && <View style={styles.icon}>{icon}</View>}
      </View>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: getAccentColor() }]}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.tile,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'space-between',
    minHeight: 84,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  label: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.text3,
    flex: 1,
  },
  icon: {
    marginLeft: Spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.heading,
  },
  unit: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.meta,
    color: Colors.text2,
    marginLeft: 4,
  },
  subtext: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.text2,
    marginTop: 2,
  },
});
