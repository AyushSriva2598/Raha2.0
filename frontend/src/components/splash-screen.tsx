import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors, Radii } from '@/constants/tokens';

interface SplashScreenOverlayProps {
  onFinish?: () => void;
}

export function SplashScreenOverlay({ onFinish }: SplashScreenOverlayProps) {
  const [progress, setProgress] = useState(25);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer1 = setTimeout(() => setProgress(65), 400);
    const timer2 = setTimeout(() => setProgress(94), 900);
    const timer3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setIsVisible(false);
        onFinish?.();
      }, 400);
    }, 1400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onFinish]);

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      {/* Crystalline Peak & Waterline Crest Mark */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Svg width={72} height={72} viewBox="0 0 40 40">
            <Defs>
              <LinearGradient id="crestGrad" x1="6" y1="14" x2="34" y2="28" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={Colors.meltwater} />
                <Stop offset="0.5" stopColor={Colors.cirqueTeal} />
                <Stop offset="1" stopColor="#4FA3D9" />
              </LinearGradient>
            </Defs>

            {/* Himalayan Mountain Crest */}
            <Path
              d="M 6 28 L 18 10 L 26 21 L 29 17 L 36 28 Z"
              fill="none"
              stroke={Colors.moraineInk}
              strokeWidth={2.4}
              strokeLinejoin="round"
            />
            {/* Waterline Curve */}
            <Path
              d="M 4 28 Q 14 24 22 29 T 38 27"
              fill="none"
              stroke="url(#crestGrad)"
              strokeWidth={3}
              strokeLinecap="round"
            />
          </Svg>
        </View>

        {/* Brand Name */}
        <Text style={styles.title}>Avalon</Text>
        <Text style={styles.subtitle}>Glacial Threat Early Warning</Text>

        {/* Sync Progress Bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>

        {/* Telemetry Status text */}
        <Text style={styles.statusText}>
          {progress < 70
            ? 'Connecting Himalayan telemetry stations...'
            : progress < 100
            ? 'Validating Sentinel radar passes...'
            : 'Offline terrain & safe routes cached.'}
        </Text>
      </View>

      {/* Footer Build Tag */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>High-Altitude Node SOL-09 • IMJA BASIN</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.firn,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: Radii.card, borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.moraineInk,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.moraineInk,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.slateFog,
    marginTop: 4,
    fontWeight: '500',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.borderSubtle,
    borderRadius: 2,
    marginTop: 32,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.meltwater,
    borderRadius: 2,
  },
  statusText: {
    fontSize: 12,
    color: Colors.slateFog,
    marginTop: 12,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 36,
  },
  footerText: {
    fontSize: 10,
    color: Colors.slateFog,
    letterSpacing: 0.8,
    fontWeight: '600',
  },
});
