import { requireOptionalNativeModule } from 'expo';

export interface Position {
  latitude: number;
  longitude: number;
}

// The person's real position for an SOS, or null. Nothing is ever guessed: with no permission, no
// fix, or a dev build made before expo-location was added, the SOS simply goes without a location.
export async function getRealPosition(timeoutMs = 4000): Promise<Position | null> {
  if (!requireOptionalNativeModule('ExpoLocation')) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Location = require('expo-location') as typeof import('expo-location');
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const fresh = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    const fix = fresh ?? (await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 }));
    return fix ? { latitude: fix.coords.latitude, longitude: fix.coords.longitude } : null;
  } catch {
    return null;
  }
}
