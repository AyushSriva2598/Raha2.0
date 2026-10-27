import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ArrowRight } from 'lucide-react-native';
import { Colors, Radii, Typography } from '@/constants/theme';

interface HeroCardProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Extra content between the text and the action, such as a row of avatars or code boxes. */
  children?: React.ReactNode;
}

// A coral gradient card with two soft circles, used for the one thing a screen wants you to do next.
// Text is white on a dark enough coral for contrast; the action is a full-height white pill.
export function HeroCard({ title, subtitle, eyebrow, actionLabel, onAction, children }: HeroCardProps) {
  return (
    <View style={styles.card}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
        <Defs>
          <LinearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={Colors.coral} />
            <Stop offset="1" stopColor="#B8362D" />
          </LinearGradient>
        </Defs>
        <Rect width="100" height="100" fill="url(#heroGrad)" />
      </Svg>
      <View pointerEvents="none" style={[styles.circle, styles.circleBig]} />
      <View pointerEvents="none" style={[styles.circle, styles.circleSmall]} />

      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title} accessibilityRole="header" textBreakStrategy="balanced">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          accessibilityRole="button">
          <Text style={styles.actionText}>{actionLabel}</Text>
          <ArrowRight size={18} color={Colors.coralDeep} strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    padding: 22,
    gap: 8,
    borderRadius: Radii.cardLarge,
    borderCurve: 'continuous',
    backgroundColor: Colors.coral,
  },
  circle: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' },
  circleBig: { width: 220, height: 220, top: -80, right: -70 },
  circleSmall: { width: 130, height: 130, bottom: -60, right: 70 },
  eyebrow: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.caption,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.9)',
  },
  title: { fontFamily: Typography.family.bold, fontSize: 26, lineHeight: 32, color: Colors.onCoral },
  subtitle: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.body, lineHeight: 23, color: 'rgba(255,255,255,0.95)' },
  action: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    marginTop: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: Colors.onCoral,
  },
  actionText: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.body, color: Colors.coralDeep },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
