import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Menu, Layers, Bell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Typography, Shadows } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

export interface HomeHeaderProps {
  onToggleMenu?: () => void;
  onToggleLayers?: () => void;
  mapType?: 'standard' | 'satellite' | 'terrain';
}

export function HomeHeader({
  onToggleMenu,
  onToggleLayers,
  mapType = 'terrain',
}: HomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const { userProfile } = useAppStore();

  const userInitials = userProfile?.name
    ? userProfile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'PS';

  return (
    <View style={[styles.wrapper, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
      <View style={styles.headerRow}>
        {/* Left: Menu button */}
        <Pressable
          onPress={onToggleMenu}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Open basin menu">
          <Menu size={20} color={Colors.ink} strokeWidth={2.4} />
        </Pressable>

        {/* Right side group: Layers toggle and Profile avatar */}
        <View style={styles.rightGroup}>
          <Pressable
            onPress={onToggleLayers}
            style={({ pressed }) => [
              styles.iconButton,
              mapType === 'satellite' && styles.layersActive,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Toggle map layer, currently ${mapType}`}>
            <Layers
              size={19}
              color={mapType === 'satellite' ? Colors.surface : Colors.ink}
              strokeWidth={2.2}
            />
          </Pressable>

          <Pressable
            onPress={() => router.push('/activity' as any)}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Open activity">
            <Bell size={19} color={Colors.ink} strokeWidth={2.2} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/profile' as any)}
            style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Open profile">
            <Text style={styles.avatarText}>{userInitials}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  fadeBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(253, 243, 240, 0.94)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(243, 217, 211, 0.8)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  layersActive: {
    backgroundColor: Colors.coral,
    borderColor: Colors.coral,
  },
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: Typography.family.bold,
    fontSize: 22,
    letterSpacing: 3,
    color: Colors.coralDeep,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.coralSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.coral,
    ...Shadows.card,
  },
  avatarText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.meta,
    color: Colors.coralDeep,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
});
