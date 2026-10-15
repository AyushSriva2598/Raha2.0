import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Colors, Radii } from '@/constants/tokens';
import { useAppStore } from '@/store/useAppStore';
import { Home, Compass, User } from 'lucide-react-native';
import { usePathname, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function StitchBottomBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { alertLevel, t } = useAppStore();
  const strings = t();

  const isHome = pathname === '/' || pathname === '/index' || pathname === '';
  const isMap = pathname.includes('/map');
  const isProfile = pathname.includes('/profile');

  // Dynamic alert badge color on Map tab
  const getMapBadgeColor = () => {
    if (alertLevel === 'EVACUATE') return Colors.alarmRed;
    if (alertLevel === 'WARNING') return Colors.warning;
    if (alertLevel === 'WATCH') return Colors.watch;
    return null;
  };

  const badgeColor = getMapBadgeColor();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 4);

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <View style={styles.content}>
        {/* Tab 1: Home */}
        <Pressable
          style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]}
          android_ripple={{ color: 'transparent' }}
          onPress={() => router.replace('/' as any)}>
          <View style={[styles.pill, isHome && styles.pillActive]}>
            <Home
              size={22}
              color={isHome ? Colors.meltwater : Colors.slateFog}
              strokeWidth={isHome ? 2.5 : 1.8}
            />
          </View>
          <Text style={[styles.tabLabel, isHome && styles.tabLabelActive]}>
            {strings.tabs.home}
          </Text>
        </Pressable>

        {/* Tab 2: Map */}
        <Pressable
          style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]}
          android_ripple={{ color: 'transparent' }}
          onPress={() => router.replace('/map' as any)}>
          <View style={[styles.pill, isMap && styles.pillActive]}>
            <Compass
              size={22}
              color={isMap ? Colors.meltwater : Colors.slateFog}
              strokeWidth={isMap ? 2.5 : 1.8}
            />
            {badgeColor && (
              <View style={[styles.badgeDot, { backgroundColor: badgeColor }]} />
            )}
          </View>
          <Text style={[styles.tabLabel, isMap && styles.tabLabelActive]}>
            {strings.tabs.map}
          </Text>
        </Pressable>

        {/* Tab 3: Profile */}
        <Pressable
          style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]}
          android_ripple={{ color: 'transparent' }}
          onPress={() => router.replace('/profile' as any)}>
          <View style={[styles.pill, isProfile && styles.pillActive]}>
            <User
              size={22}
              color={isProfile ? Colors.meltwater : Colors.slateFog}
              strokeWidth={isProfile ? 2.5 : 1.8}
            />
          </View>
          <Text style={[styles.tabLabel, isProfile && styles.tabLabelActive]}>
            {strings.tabs.profile}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.firn,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    shadowColor: Colors.moraineInk,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  content: {
    height: 60,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    height: '100%',
    backgroundColor: 'transparent',
    gap: 2,
  },
  pill: {
    width: 52,
    height: 30,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  pillActive: {
    backgroundColor: Colors.secondaryContainer,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.slateFog,
  },
  tabLabelActive: {
    color: Colors.meltwater,
    fontWeight: '700',
  },
  badgeDot: {
    position: 'absolute',
    top: 3,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  pressed: {
    opacity: 0.8,
  },
});
