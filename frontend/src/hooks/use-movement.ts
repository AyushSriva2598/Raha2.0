import { useCallback, useEffect, useRef, useState } from 'react';
import { requireOptionalNativeModule } from 'expo';
import type { Position } from '@/services/location';

export type LocationAccess = 'unknown' | 'granted' | 'denied' | 'unavailable';

// Above ~11 km/h you are in a car or on a bike; below ~5 km/h you have stopped. The gap between the
// two stops the screen flipping back and forth at walking pace or in slow traffic.
const MOVING_MPS = 3;
const STOPPED_MPS = 1.4;

/**
 * Your real position and whether you are travelling, for adapting the map to speed. It never asks
 * for permission on its own: it only starts if location was already allowed, or after `request()`.
 * On a build without expo-location it reports 'unavailable' and nothing else changes.
 */
export function useMovement() {
  const [access, setAccess] = useState<LocationAccess>(() =>
    requireOptionalNativeModule('ExpoLocation') ? 'unknown' : 'unavailable'
  );
  const [position, setPosition] = useState<Position | null>(null);
  const [moving, setMoving] = useState(false);
  const last = useRef<{ p: Position; t: number } | null>(null);
  const movingRef = useRef(false);

  const lib = useCallback(() => {
    if (!requireOptionalNativeModule('ExpoLocation')) return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-location') as typeof import('expo-location');
  }, []);

  useEffect(() => {
    const Location = lib();
    if (!Location) return;
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    (async () => {
      const perm = await Location.getForegroundPermissionsAsync();
      if (cancelled) return;
      setAccess(perm.granted ? 'granted' : perm.canAskAgain ? 'unknown' : 'denied');
      if (!perm.granted) return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 4000, distanceInterval: 15 },
        (loc) => {
          const p = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          const now = loc.timestamp;
          let speed = loc.coords.speed ?? -1;
          if (speed < 0 && last.current) {
            // No speed from the GPS: work it out from the last fix.
            const dt = (now - last.current.t) / 1000;
            const dLat = (p.latitude - last.current.p.latitude) * 111320;
            const dLon = (p.longitude - last.current.p.longitude) * 111320 * Math.cos((p.latitude * Math.PI) / 180);
            speed = dt > 0 ? Math.hypot(dLat, dLon) / dt : 0;
          }
          last.current = { p, t: now };
          setPosition(p);
          const next = movingRef.current ? speed > STOPPED_MPS : speed > MOVING_MPS;
          if (next !== movingRef.current) {
            movingRef.current = next;
            setMoving(next);
          }
        }
      );
      if (cancelled) sub.remove();
    })().catch(() => setAccess('unavailable'));
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [lib, access === 'granted']); // eslint-disable-line react-hooks/exhaustive-deps

  /** Ask for location; resolves true when allowed. */
  const request = useCallback(async () => {
    const Location = lib();
    if (!Location) return false;
    const perm = await Location.requestForegroundPermissionsAsync();
    setAccess(perm.granted ? 'granted' : perm.canAskAgain ? 'unknown' : 'denied');
    return perm.granted;
  }, [lib]);

  return { access, position, moving, request };
}
