import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react-native';
import { Colors, Typography } from '@/constants/theme';
import { Pill } from '@/components/common/Pill';

export interface RouteOptionData {
  id: string;
  type: 'safest' | 'balanced' | 'shortest';
  name: string;
  distanceKm: number;
  durationMin: number;
  floodZonesCrossed: number;
  floodZonesClipped?: number;
  isRecommended?: boolean;
}

export interface RouteRowProps {
  route: RouteOptionData;
  isSelected: boolean;
  onSelect: () => void;
  style?: StyleProp<ViewStyle>;
}

export function RouteRow({
  route,
  isSelected,
  onSelect,
  style,
}: RouteRowProps) {
  const getIcon = () => {
    switch (route.type) {
      case 'safest':
        return <ShieldCheck size={20} color={Colors.safe} />;
      case 'balanced':
        return <ShieldAlert size={20} color={Colors.watchTextAlt} />;
      case 'shortest':
        return <AlertTriangle size={20} color={Colors.dangerDark} />;
    }
  };

  const getMeta = () => {
    if (route.type === 'safest') {
      return {
        text: `${route.distanceKm.toFixed(0)} km · Avoids all ${route.floodZonesCrossed === 0 ? 'hazard' : route.floodZonesCrossed} flood zones`,
        color: Colors.safe,
      };
    }
    if (route.type === 'balanced') {
      const clipped = route.floodZonesClipped ?? 1;
      return {
        text: `${route.distanceKm.toFixed(0)} km · Clips ${clipped} flood zone edge`,
        color: Colors.watchTextAlt,
      };
    }
    return {
      text: `${route.distanceKm.toFixed(0)} km · Crosses ${route.floodZonesCrossed} flood zones`,
      color: Colors.dangerDark,
    };
  };

  const meta = getMeta();

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.container,
        isSelected && styles.containerSelected,
        pressed && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${route.name}, ${route.durationMin} minutes, ${meta.text}`}>
      {/* Icon Circle */}
      <View
        style={[
          styles.iconCircle,
          route.type === 'safest' && styles.iconSafe,
          route.type === 'balanced' && styles.iconBalanced,
          route.type === 'shortest' && styles.iconShortest,
        ]}>
        {getIcon()}
      </View>

      {/* Middle info */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{route.name}</Text>
          {route.isRecommended && (
            <Pill
              label="Recommended"
              variant="safe"
              size="sm"
              style={styles.recommendedPill}
            />
          )}
        </View>
        <Text style={[styles.metaText, { color: meta.color }]} numberOfLines={1}>
          {meta.text}
        </Text>
      </View>

      {/* Right Duration */}
      <View style={styles.durationCol}>
        <Text style={styles.durationText}>{route.durationMin}</Text>
        <Text style={styles.durationUnit}>min</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  containerSelected: {
    borderColor: Colors.safe,
    backgroundColor: Colors.safeTintAlt,
  },
  pressed: {
    opacity: 0.9,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconSafe: {
    backgroundColor: Colors.safeTint,
  },
  iconBalanced: {
    backgroundColor: '#FEF3C7',
  },
  iconShortest: {
    backgroundColor: Colors.dangerTint,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.body,
    color: Colors.ink,
  },
  recommendedPill: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    minHeight: 20,
  },
  metaText: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    marginTop: 2,
  },
  durationCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  durationText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.title,
    color: Colors.ink,
    lineHeight: 22,
  },
  durationUnit: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.text3,
  },
});
