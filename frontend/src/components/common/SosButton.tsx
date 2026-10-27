import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { safeHaptics } from '@/utils/safeHaptics';
import { Colors, Typography, Radii, Shadows } from '@/constants/theme';

export interface SosButtonProps {
  onTrigger?: () => void;
  mode?: 'raised' | 'inline';
  size?: number;
  style?: StyleProp<ViewStyle>;
  label?: string;
}

const HOLD_DURATION_MS = 3000;
const TICK_INTERVAL_MS = 50;

export function SosButton({
  onTrigger,
  mode = 'raised',
  size = 66,
  style,
  label,
}: SosButtonProps) {
  const [progressPct, setProgressPct] = useState(0); // 0 to 1
  const [isHolding, setIsHolding] = useState(false);

  const holdStartRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickSecondRef = useRef<number>(0);

  const clearHold = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    holdStartRef.current = null;
    lastTickSecondRef.current = 0;
    setProgressPct(0);
    setIsHolding(false);
  }, []);

  const handlePressIn = () => {
    setIsHolding(true);
    holdStartRef.current = Date.now();
    lastTickSecondRef.current = 0;

    // Initial tactile tap
    safeHaptics.tap();

    timerRef.current = setInterval(() => {
      if (!holdStartRef.current) return;

      const elapsed = Date.now() - holdStartRef.current;
      const currentSecond = Math.floor(elapsed / 1000);

      // Tactile tick every second
      if (currentSecond > lastTickSecondRef.current && currentSecond < 3) {
        lastTickSecondRef.current = currentSecond;
        safeHaptics.tick();
      }

      const currentProgress = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setProgressPct(currentProgress);

      if (elapsed >= HOLD_DURATION_MS) {
        // Complete!
        clearHold();
        safeHaptics.success();
        if (onTrigger) {
          onTrigger();
        }
      }
    }, TICK_INTERVAL_MS);
  };

  const handlePressOut = () => {
    if (isHolding) {
      clearHold();
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  if (mode === 'inline') {
    return (
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.inlineContainer,
          isHolding && styles.inlineHolding,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Emergency SOS button. Hold for 3 seconds to send help request.">
        {/* Fill progress background */}
        <View
          style={[
            styles.inlineProgressFill,
            { width: `${Math.round(progressPct * 100)}%` },
          ]}
        />
        <View style={styles.inlineContent}>
          <Text style={styles.inlineTitle}>SOS</Text>
          <Text style={styles.inlineSub}>
            {isHolding
              ? `${Math.max(1, 3 - Math.floor(progressPct * 3))}s`
              : label || 'Hold 3s'}
          </Text>
        </View>
      </Pressable>
    );
  }

  // Raised Circular Button Mode (Tab Bar Center)
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressPct);

  return (
    <View style={[styles.raisedWrapper, style]}>
      {/* Soft halo outer ring */}
      <View
        style={[
          styles.haloRing,
          {
            width: size + 16,
            height: size + 16,
            borderRadius: (size + 16) / 2,
          },
          isHolding && styles.haloRingActive,
        ]}
      />

      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.raisedButton,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          Shadows.sos,
          pressed && styles.raisedPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="SOS emergency button. Hold 3 seconds to trigger help request.">
        {/* SVG Progress Ring */}
        <Svg
          width={size}
          height={size}
          style={StyleSheet.absoluteFill}
          pointerEvents="none">
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {progressPct > 0 && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#FFFFFF"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          )}
        </Svg>

        <View style={styles.raisedCenter}>
          <Text style={styles.raisedText}>SOS</Text>
          {isHolding && (
            <Text style={styles.raisedCountdown}>
              {Math.max(1, 3 - Math.floor(progressPct * 3))}s
            </Text>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  raisedWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 82,
    height: 82,
  },
  haloRing: {
    position: 'absolute',
    backgroundColor: 'rgba(198, 40, 40, 0.12)',
  },
  haloRingActive: {
    backgroundColor: 'rgba(198, 40, 40, 0.24)',
    transform: [{ scale: 1.08 }],
  },
  raisedButton: {
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  raisedPressed: {
    transform: [{ scale: 0.96 }],
  },
  raisedCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  raisedText: {
    fontFamily: Typography.family.bold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  raisedCountdown: {
    fontFamily: Typography.family.bold,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: -2,
  },

  // Inline action row mode
  inlineContainer: {
    height: 56,
    width: 96,
    borderRadius: Radii.button, borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: Colors.danger,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineHolding: {
    borderColor: Colors.dangerDark,
  },
  inlineProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.dangerTint,
  },
  inlineContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineTitle: {
    fontFamily: Typography.family.bold,
    fontSize: 16,
    color: Colors.danger,
    letterSpacing: 0.5,
  },
  inlineSub: {
    fontFamily: Typography.family.regular,
    fontSize: 11,
    color: Colors.dangerDark,
    marginTop: -1,
  },
});
