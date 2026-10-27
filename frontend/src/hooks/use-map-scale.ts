import { useCallback, useEffect, useRef, useState } from 'react';
import type { Region } from 'react-native-maps';

/**
 * Marker scale for a zoom level. Markers never shrink below 1.15 so they stay readable when the map
 * is zoomed out, and grow to 1.6 when zoomed in close.
 */
export function scaleForLatDelta(latDelta: number): number {
  const s = 1.3 - Math.log2(Math.max(latDelta, 0.0005) / 0.02) * 0.1;
  return Math.min(1.6, Math.max(1.15, Math.round(s * 20) / 20));
}

/** Metres covered by one screen pixel for a visible latitude span and the map's height in pixels. */
export function metersPerPixel(latDelta: number, mapHeightPx: number): number {
  return (latDelta * 111320) / Math.max(mapHeightPx, 1);
}

/**
 * Tracks the map zoom and returns a marker scale. Custom marker views are bitmaps on Android, so
 * `tracksViewChanges` stays on briefly after each change and then turns off again to save battery.
 */
export function useMapScale(initialLatDelta: number) {
  const [scale, setScale] = useState(scaleForLatDelta(initialLatDelta));
  const [latDelta, setLatDelta] = useState(initialLatDelta);
  const latDeltaRef = useRef(initialLatDelta);
  const scaleRef = useRef(scale);
  const [tracksViewChanges, setTracks] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settle = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTracks(false), 600);
  }, []);

  useEffect(() => {
    settle();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [settle]);

  const onRegionChangeComplete = useCallback(
    (region: Region) => {
      // Zone beacons depend on the exact span, so track it whenever it changes by more than 8%.
      if (Math.abs(region.latitudeDelta / latDeltaRef.current - 1) > 0.08) {
        latDeltaRef.current = region.latitudeDelta;
        setLatDelta(region.latitudeDelta);
      }
      const next = scaleForLatDelta(region.latitudeDelta);
      if (Math.abs(scaleRef.current - next) < 0.05) return;
      scaleRef.current = next;
      setScale(next);
      setTracks(true);
      settle();
    },
    [settle]
  );

  return { scale, latDelta, tracksViewChanges, onRegionChangeComplete };
}
