import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Colors, Radii, Typography } from '@/constants/tokens';
import { MapPin, Activity, Asterisk } from 'lucide-react-native';
import { usePathname, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function StitchBottomBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isTelemetry = pathname === '/' || pathname === '/index' || pathname === '';
  const isMap = pathname.includes('/map');
  const isSos = pathname.includes('/profile') || pathname.includes('/sos');

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 4);

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <View style={styles.content}>
        {/* Tab 1: Evac Map */}
        <Pressable
          style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]}
          android_ripple={{ color: 'transparent' }}
          onPress={() => router.replace('/map' as any)}>
          <View style={[styles.iconWrapper, isMap && styles.iconWrapperActive]}>
            <MapPin
              size={20}
              color={isMap ? Colors.emergencyRed : Colors.slateFog}
              strokeWidth={isMap ? 2.5 : 2}
            />
          </View>
          <Text style={[styles.tabLabel, isMap && styles.tabLabelActive]}>
            Evac Map
          </Text>
        </Pressable>

        {/* Tab 2: Telemetry (Breach Dynamics & Sensors) */}
        <Pressable
          style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]}
          android_ripple={{ color: 'transparent' }}
          onPress={() => router.replace('/' as any)}>
          <View style={[styles.iconWrapper, isTelemetry && styles.iconWrapperActive]}>
            <Activity
              size={20}
              color={isTelemetry ? Colors.emergencyRed : Colors.slateFog}
              strokeWidth={isTelemetry ? 2.5 : 2}
            />
          </View>
          <Text style={[styles.tabLabel, isTelemetry && styles.tabLabelActive]}>
            Telemetry
          </Text>
        </Pressable>

        {/* Tab 3: SOS / Kin (Satellite Dispatch) */}
        <Pressable
          style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]}
          android_ripple={{ color: 'transparent' }}
          onPress={() => router.replace('/profile' as any)}>
          <View style={[styles.iconWrapper, isSos && styles.iconWrapperActive]}>
            <Asterisk
              size={22}
              color={isSos ? Colors.emergencyRed : Colors.slateFog}
              strokeWidth={isSos ? 2.8 : 2}
            />
          </View>
          <Text style={[styles.tabLabel, isSos && styles.tabLabelActive]}>
            SOS / Kin
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBgLight,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    shadowColor: Colors.moraineInk,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
  },
  iconWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperActive: {
    backgroundColor: Colors.emergencyRedLight,
  },
  tabLabel: {
    fontFamily: Typography.sansMedium,
    fontSize: 11,
    color: Colors.slateFog,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    fontFamily: Typography.sansBold,
    color: Colors.emergencyRed,
  },
  pressed: {
    opacity: 0.7,
  },
});
