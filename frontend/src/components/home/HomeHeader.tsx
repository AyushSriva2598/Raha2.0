import { useShallow } from 'zustand/react/shallow';
import React from 'react';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import {
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { ChevronDown, MapPin, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Typography, Shadows } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import type { AlertLevel } from '@/types';

export interface HomeHeaderProps {
  onToggleMenu?: () => void;
  /** Animated opacity and pointer-events from the screen, run on the UI thread. */
  fadeStyle?: AnimatedStyle<StyleProp<ViewStyle>>;
  fadeProps?: Partial<ViewProps>;
}

const LEVEL_COLOR: Record<AlertLevel, string> = {
  CLEAR: Colors.safe,
  WATCH: Colors.watch,
  WARNING: Colors.danger,
  EVACUATE: Colors.danger,
};

export function HomeHeader({ onToggleMenu, fadeStyle, fadeProps }: HomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const { userProfile, activeLake, alertLevel, t } = useAppStore(useShallow((s) => ({ userProfile: s.userProfile, activeLake: s.activeLake, alertLevel: s.alertLevel, t: s.t })));
  useAppStore((s) => s.language); // re-render when the language changes, since t() reads it
  const strings = t();

  const firstName = userProfile?.name?.trim().split(/\s+/)[0] ?? '';
  const userInitials = userProfile?.name
    ? userProfile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? strings.home.greetingMorning : hour < 18 ? strings.home.greetingAfternoon : strings.home.greetingEvening;
  const levelLabel = strings.alertLevels[alertLevel.toLowerCase() as keyof typeof strings.alertLevels] ?? alertLevel;
  const haven = activeLake.primarySafeHaven;

  return (
    <Animated.View
      animatedProps={fadeProps}
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingTop: Math.max(insets.top, 12) + 4 }, fadeStyle]}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={onToggleMenu}
          style={({ pressed }) => [styles.statusCard, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${greeting} ${firstName}. ${activeLake.name}, ${levelLabel}. Open lake menu`}>
          <View style={[styles.dot, { backgroundColor: LEVEL_COLOR[alertLevel] }]} />
          <View style={styles.statusText}>
            <Text style={styles.greeting} numberOfLines={1}>
              {firstName ? `${greeting}, ${firstName}` : greeting}
            </Text>
            <Text style={styles.statusLine} numberOfLines={1}>
              {activeLake.name} · {levelLabel}
            </Text>
          </View>
          <ChevronDown size={18} color={Colors.text3} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/profile' as any)}
          hitSlop={4}
          style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Open profile">
          {userInitials ? <Text style={styles.avatarText}>{userInitials}</Text> : <User size={18} color={Colors.coralDeep} />}
        </Pressable>
      </View>

      <View style={styles.pill} accessibilityLabel={`${strings.home.safeGround}: ${haven.name}`}>
        <MapPin size={16} color={Colors.safe} strokeWidth={2.4} />
        <Text style={styles.pillText} numberOfLines={1}>
          {strings.home.safeGround} <Text style={styles.pillStrong}>{haven.name}</Text> · {haven.distanceKm} km · {haven.walkTimeMinutes} min
        </Text>
      </View>
    </Animated.View>
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
    gap: 10,
  },
  statusCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { flex: 1 },
  greeting: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.body, color: Colors.ink },
  statusLine: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.caption, color: Colors.text2 },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '86%',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  pillText: { flexShrink: 1, fontFamily: Typography.family.regular, fontSize: Typography.sizes.caption, color: Colors.text2, fontVariant: ['tabular-nums'] },
  pillStrong: { fontFamily: Typography.family.bold, color: Colors.ink },
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
    width: 48,
    height: 48,
    borderRadius: 24,
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
