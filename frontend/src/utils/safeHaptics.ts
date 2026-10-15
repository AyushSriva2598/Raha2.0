import { Vibration, Platform } from 'react-native';

/**
 * Safe Haptics & Vibration Utility
 * Provides instant tactile feedback across Android and iOS devices.
 * Uses React Native core Vibration engine to guarantee zero unhandled native promise rejections
 * even when third-party native modules are not precompiled into the dev client APK.
 */

export const safeHaptics = {
  /**
   * Light tactile tap on press in
   */
  tap: () => {
    if (Platform.OS === 'web') return;
    try {
      Vibration.vibrate(25);
    } catch {
      // Ignore vibration error on unsupported platforms
    }
  },

  /**
   * Medium tactile pulse for countdown second ticks
   */
  tick: () => {
    if (Platform.OS === 'web') return;
    try {
      Vibration.vibrate(55);
    } catch {
      // Ignore vibration error
    }
  },

  /**
   * Rhythmic pattern on SOS broadcast send completion
   */
  success: () => {
    if (Platform.OS === 'web') return;
    try {
      Vibration.vibrate([0, 80, 50, 140]);
    } catch {
      // Ignore vibration error
    }
  },
};
