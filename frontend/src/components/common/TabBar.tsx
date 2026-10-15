import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { usePathname, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  Navigation,
  Activity as ActivityIcon,
  User,
} from 'lucide-react-native';
import { Colors, Typography } from '@/constants/theme';
import { SosButton } from '@/components/common/SosButton';
import { useAppStore } from '@/store/useAppStore';

export function TabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { openSosModal } = useAppStore();

  const isHome = pathname === '/' || pathname === '/index' || pathname === '';
  const isMap = pathname.includes('/map');
  const isActivity = pathname.includes('/activity');
  const isProfile = pathname.includes('/profile');

  const handleSosTrigger = () => {
    openSosModal(true);
  };

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 4);

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomInset }]}>
      <View style={styles.container}>
        {/* Tab 1: Home */}
        <Pressable
          onPress={() => router.replace('/' as any)}
          style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}
          accessibilityRole="tab"
          accessibilityState={{ selected: isHome }}
          accessibilityLabel="Home tab">
          <Home
            size={22}
            color={isHome ? Colors.ink : Colors.text3}
            strokeWidth={isHome ? 2.5 : 1.8}
          />
          <Text style={[styles.tabLabel, isHome && styles.tabLabelActive]}>
            Home
          </Text>
        </Pressable>

        {/* Tab 2: Map / Navigate */}
        <Pressable
          onPress={() => router.replace('/map' as any)}
          style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}
          accessibilityRole="tab"
          accessibilityState={{ selected: isMap }}
          accessibilityLabel="Map tab">
          <Navigation
            size={22}
            color={isMap ? Colors.ink : Colors.text3}
            strokeWidth={isMap ? 2.5 : 1.8}
          />
          <Text style={[styles.tabLabel, isMap && styles.tabLabelActive]}>
            Map
          </Text>
        </Pressable>

        {/* Center: Raised SOS Button */}
        <View style={styles.centerSosSlot}>
          <SosButton
            mode="raised"
            size={66}
            onTrigger={handleSosTrigger}
          />
        </View>

        {/* Tab 4: Activity */}
        <Pressable
          onPress={() => router.replace('/activity' as any)}
          style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}
          accessibilityRole="tab"
          accessibilityState={{ selected: isActivity }}
          accessibilityLabel="Activity tab">
          <ActivityIcon
            size={22}
            color={isActivity ? Colors.ink : Colors.text3}
            strokeWidth={isActivity ? 2.5 : 1.8}
          />
          <Text style={[styles.tabLabel, isActivity && styles.tabLabelActive]}>
            Activity
          </Text>
        </Pressable>

        {/* Tab 5: Profile */}
        <Pressable
          onPress={() => router.replace('/profile' as any)}
          style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}
          accessibilityRole="tab"
          accessibilityState={{ selected: isProfile }}
          accessibilityLabel="Profile tab">
          <User
            size={22}
            color={isProfile ? Colors.ink : Colors.text3}
            strokeWidth={isProfile ? 2.5 : 1.8}
          />
          <Text style={[styles.tabLabel, isProfile && styles.tabLabelActive]}>
            Profile
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 100,
  },
  container: {
    height: 84, // Exact 84px specification
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    position: 'relative',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingVertical: 10,
    gap: 4,
  },
  tabLabel: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption, // 13
    color: Colors.text2,
  },
  tabLabelActive: {
    fontFamily: Typography.family.bold,
    color: Colors.ink, // Active tab ink and bold
  },
  centerSosSlot: {
    width: 78,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28, // Raised circle elevates above the 84px bar
  },
  pressed: {
    opacity: 0.75,
  },
});
