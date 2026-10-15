import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_700Bold,
} from '@expo-google-fonts/atkinson-hyperlegible';
import {
  Hind_400Regular,
  Hind_500Medium,
  Hind_600SemiBold,
  Hind_700Bold,
} from '@expo-google-fonts/hind';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreenOverlay } from '@/components/splash-screen';
import { useAppStore } from '@/store/useAppStore';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 2, // 2 minutes
    },
  },
});

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const { init } = useAppStore();

  const [fontsLoaded, fontError] = useFonts({
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
    Hind_400Regular,
    Hind_500Medium,
    Hind_600SemiBold,
    Hind_700Bold,
    InstrumentSerif_400Regular,
  });

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="onboarding"
            options={{ presentation: 'modal', headerShown: false }}
          />
        </Stack>
        {showSplash && (
          <SplashScreenOverlay onFinish={() => setShowSplash(false)} />
        )}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
