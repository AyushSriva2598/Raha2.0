import React, { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

// True only after `active` has stayed true for `delayMs`. Quick loads never flash a skeleton.
export function useDelayedFlag(active: boolean, delayMs = 300) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setShown(true), delayMs);
    return () => {
      clearTimeout(id);
      setShown(false);
    };
  }, [active, delayMs]);
  return active && shown;
}

interface SkeletonProps {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

// A gray block that stands in for text or an icon. It pulses softly; with reduce motion it stays still.
export function Skeleton({ width = '100%', height, radius = 8, style }: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(withTiming(0.55, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(pulse);
  }, [reduceMotion, pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.block, { width, height, borderRadius: radius }, animated, style]}
    />
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: Colors.border },
});
