import { useShallow } from 'zustand/react/shallow';
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
import { ToastHost } from '@/components/common/ToastHost';
import { RadioWebEngine } from '@/components/radio/RadioWebEngine';
import { useRadioStore } from '@/services/radioStore';
import { SplashScreenOverlay } from '@/components/splash-screen';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/services/authStore';

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
  const { init } = useAppStore(useShallow((s) => ({ init: s.init })));

  const [fontsLoaded, fontError] = useFonts({
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
    Hind_400Regular,
    Hind_500Medium,
    Hind_600SemiBold,
    Hind_700Bold,
    InstrumentSerif_400Regular,
  });

  const authStatus = useAuthStore((s) => s.status);
  const needsWebRadio = useRadioStore((s) => s.needsWebEngine);
  const restore = useAuthStore((s) => s.restore);

  useEffect(() => {
    restore();
  }, [restore]);

  // Load the app's data only once there is a signed-in user.
  useEffect(() => {
    if (authStatus === 'signedIn') init();
  }, [authStatus, init]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if ((!fontsLoaded && !fontError) || authStatus === 'loading') {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={authStatus === 'signedIn'}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="terrain" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="contacts" options={{ headerShown: false }} />
            <Stack.Screen name="radio" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="safety-topic/[topic]" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ presentation: 'modal', headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={authStatus === 'signedOut'}>
            <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
          </Stack.Protected>
        </Stack>
        {needsWebRadio && <RadioWebEngine />}
        <ToastHost />
        {showSplash && (
          <SplashScreenOverlay onFinish={() => setShowSplash(false)} />
        )}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
