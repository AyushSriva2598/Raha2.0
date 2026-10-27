import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MapPin, CircleDot } from 'lucide-react-native';
import { Colors, Typography, Radii, Shadows } from '@/constants/theme';

export interface RouteSearchCardProps {
  originName: string;
  /** null until the user picks where to go */
  destinationName: string | null;
  onPressOrigin: () => void;
  onPressDestination: () => void;
}

// Compact two-row bar shown before a route is planned. Map stays visible behind it.
export function RouteSearchCard({
  originName,
  destinationName,
  onPressOrigin,
  onPressDestination,
}: RouteSearchCardProps) {
  return (
    <View style={styles.card}>
      <Pressable
        onPress={onPressOrigin}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`From: ${originName}`}>
        <CircleDot size={16} color={Colors.you} strokeWidth={2.4} />
        <Text style={styles.fixedLabel}>From</Text>
        <Text style={styles.value} numberOfLines={1}>
          {originName}
        </Text>
      </Pressable>
      <View style={styles.hairline} />
      <Pressable
        onPress={onPressDestination}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={destinationName ? `To: ${destinationName}` : 'Choose a safe place to go'}>
        <MapPin size={16} color={Colors.coral} strokeWidth={2.4} />
        <Text style={styles.fixedLabel}>To</Text>
        <Text style={[styles.value, !destinationName && styles.placeholder]} numberOfLines={1}>
          {destinationName ?? 'Where to? Choose a safe place'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card, borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    ...Shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  fixedLabel: {
    width: 36,
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.caption,
    color: Colors.text3,
  },
  value: {
    flex: 1,
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.body,
    color: Colors.ink,
  },
  placeholder: {
    fontFamily: Typography.family.regular,
    color: Colors.text2,
  },
  hairline: { height: 1, backgroundColor: Colors.border, marginLeft: 26 },
  pressed: { opacity: 0.7 },
});
