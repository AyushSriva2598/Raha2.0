import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, Stop, Circle as SvgCircle } from 'react-native-svg';
import { Flag } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

// Map markers drawn as views: a coral-ringed "you" marker with a soft halo, and a coral flag pin
// with a small tail. Wrap each in a Marker with tracksViewChanges handled by the caller.

export function YouPin({ scale = 1 }: { scale?: number }) {
  return (
    <View style={[styles.halo, scale !== 1 && { transform: [{ scale }], margin: 22 * (scale - 1) }]}>
      <View style={styles.ring}>
        <View style={styles.core} />
      </View>
    </View>
  );
}

function shade(hex: string, amount: number): string {
  // amount > 0 mixes toward white, < 0 toward black
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/**
 * A pin drop that reads as a solid object: gradient body lit from the top left, a glossy highlight,
 * a white inner disc and a soft ground shadow under the tip. Colour carries the risk level (the
 * caller also shows a text label, so colour is never the only signal). The tip is the bottom centre,
 * so anchor the Marker at { x: 0.5, y: 1 }.
 */
export function PinDrop({ color, children, scale = 1 }: { color: string; children?: React.ReactNode; scale?: number }) {
  const light = shade(color, 0.38);
  const dark = shade(color, -0.28);
  const id = `pin${color.slice(1)}`;
  return (
    <View style={{ width: 44 * scale, height: 58 * scale }}>
      <Svg width={44 * scale} height={58 * scale} viewBox="0 0 44 58">
        <Defs>
          <LinearGradient id={id} x1="0.1" y1="0" x2="0.9" y2="1">
            <Stop offset="0" stopColor={light} />
            <Stop offset="0.55" stopColor={color} />
            <Stop offset="1" stopColor={dark} />
          </LinearGradient>
        </Defs>
        <Ellipse cx="22" cy="54.5" rx="9" ry="3" fill="rgba(42,27,26,0.28)" />
        <Path
          d="M22 54 C22 54 4 33 4 20 A18 18 0 1 1 40 20 C40 33 22 54 22 54 Z"
          fill={`url(#${id})`}
          stroke="#FFFFFF"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <Ellipse cx="14.5" cy="12.5" rx="5.5" ry="3.4" fill="rgba(255,255,255,0.42)" rotation={-28} origin="14.5, 12.5" />
        <SvgCircle cx="22" cy="20" r="8.5" fill="#FFFFFF" />
        <SvgCircle cx="22" cy="20" r="4.2" fill={dark} opacity={children ? 0 : 1} />
      </Svg>
      {children ? <View style={[styles.pinIcon, { top: 12 * scale, width: 44 * scale }]}>{children}</View> : null}
    </View>
  );
}

export function DestinationPin({ scale = 1 }: { scale?: number }) {
  return (
    <PinDrop color={Colors.coral} scale={scale}>
      <Flag size={Math.round(13 * scale)} color={Colors.coralDeep} strokeWidth={2.8} />
    </PinDrop>
  );
}

const styles = StyleSheet.create({
  halo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(214, 69, 58, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: Colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7A2A22',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  core: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.coral },
  pinIcon: { position: 'absolute', left: 0, alignItems: 'center' },
});
