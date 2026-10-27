import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Box, Bell, Layers } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

export interface HomeFabsProps {
  mapType: 'standard' | 'satellite' | 'terrain';
  onToggleLayers: () => void;
}

// Round floating map controls stacked on the right edge, each a full 48dp target.
export function HomeFabs({ mapType, onToggleLayers }: HomeFabsProps) {
  const insets = useSafeAreaInsets();
  const strings = useAppStore((s) => s.t)();
  const satellite = mapType === 'satellite';

  return (
    <View pointerEvents="box-none" style={[styles.stack, { top: Math.max(insets.top, 12) + 128 }]}>
      <Fab label={`${strings.home.lake3d}`} onPress={() => router.push('/terrain' as any)} primary>
        <Box size={21} color={Colors.onCoral} strokeWidth={2.2} />
      </Fab>
      <Fab label={`${strings.home.mapLayers}, ${mapType}`} onPress={onToggleLayers} active={satellite}>
        <Layers size={21} color={satellite ? Colors.onCoral : Colors.coral} strokeWidth={2.2} />
      </Fab>
      <Fab label={strings.home.activityUpdates} onPress={() => router.push('/activity' as any)}>
        <Bell size={21} color={Colors.coral} strokeWidth={2.2} />
      </Fab>
    </View>
  );
}

function Fab({
  children,
  label,
  onPress,
  primary,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onPress: () => void;
  primary?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.fab, (primary || active) && styles.fabFilled, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { position: 'absolute', right: 12, gap: 12, zIndex: 15, alignItems: 'center' },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  fabFilled: { backgroundColor: Colors.coral, borderColor: Colors.coral },
  pressed: { opacity: 0.8, transform: [{ scale: 0.95 }] },
});
