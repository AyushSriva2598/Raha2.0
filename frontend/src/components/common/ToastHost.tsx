import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radii, Typography } from '@/constants/theme';
import { useToastStore } from '@/services/toastStore';

// Reanimated entering/exiting animations follow the system "reduce motion" setting by default.
export function ToastHost() {
  const toast = useToastStore((s) => s.toast);
  const runAction = useToastStore((s) => s.runAction);
  const insets = useSafeAreaInsets();
  if (!toast) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 92 }]}>
      <Animated.View
        key={toast.id}
        entering={FadeInDown.duration(180)}
        exiting={FadeOutDown.duration(140)}
        role="status"
        accessibilityLiveRegion="polite"
        style={[styles.toast, toast.tone === 'error' && styles.error]}>
        <Text style={styles.message}>{toast.message}</Text>
        {toast.actionLabel ? (
          <Pressable
            onPress={runAction}
            hitSlop={8}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            accessibilityRole="button">
            <Text style={styles.actionText}>{toast.actionLabel}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 1000 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: Radii.card,
    borderCurve: 'continuous',
    backgroundColor: Colors.ink,
    maxWidth: 520,
    width: '100%',
  },
  error: { backgroundColor: Colors.dangerDark },
  message: { flex: 1, fontFamily: Typography.family.regular, fontSize: Typography.sizes.body, color: '#FFFFFF' },
  action: { minHeight: 44, minWidth: 64, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.body, color: Colors.coralSoft },
  pressed: { opacity: 0.7 },
});
