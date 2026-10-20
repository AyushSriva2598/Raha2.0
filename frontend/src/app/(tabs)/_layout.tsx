import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '@/components/common/TabBar';
import { EmergencySosModal } from '@/components/sos-modal';

export default function TabsLayout() {
  return (
    <>
      <Tabs
        tabBar={() => <TabBar />}
        screenOptions={{
          headerShown: false,
        }}>
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="map" options={{ title: 'Map' }} />
        <Tabs.Screen name="safety" options={{ title: 'Safety' }} />
        <Tabs.Screen name="activity" options={{ title: 'Activity', href: null }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
      <EmergencySosModal />
    </>
  );
}
