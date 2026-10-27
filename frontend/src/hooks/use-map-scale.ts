import { useCallback, useEffect, useRef, useState } from 'react';
import type { Region } from 'react-native-maps';

/** Marker scale for a zoom level: 1 at ~2 km of visible latitude, smaller zoomed out, larger zoomed in. */
export function scaleForLatDelta(latDelta: number): number {
  const s = 1 - Math.log2(Math.max(latDelta, 0.0005) / 0.02) * 0.14;
  return Math.min(1.25, Math.max(0.55, Math.round(s * 20) / 20));
}

/**
 * Tracks the map zoom and returns a marker scale. Custom marker views are bitmaps on Android, so
 * `tracksViewChanges` stays on briefly after each change and then turns off again to save battery.
 */
export function useMapScale(initialLatDelta: number) {
  const [scale, setScale] = useState(scaleForLatDelta(initialLatDelta));
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
      const next = scaleForLatDelta(region.latitudeDelta);
      if (Math.abs(scaleRef.current - next) < 0.05) return;
      scaleRef.current = next;
      setScale(next);
      setTracks(true);
      settle();
    },
    [settle]
  );

  return { scale, tracksViewChanges, onRegionChangeComplete };
}
