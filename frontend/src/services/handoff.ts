import { Linking, Platform } from 'react-native';
import type { RouteCoordinate } from '@/services/routeCalculator';

/** Hands the trip to the phone's navigation app for turn-by-turn driving directions. */
export async function openNavigation(destination: RouteCoordinate, name: string, origin?: RouteCoordinate) {
  const { latitude: lat, longitude: lng } = destination;
  const web =
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving` +
    (origin ? `&origin=${origin.latitude},${origin.longitude}` : '');
  const native =
    Platform.OS === 'android'
      ? `google.navigation:q=${lat},${lng}&mode=d`
      : `maps:0,0?daddr=${lat},${lng}&q=${encodeURIComponent(name)}&dirflg=d`;
  try {
    if (await Linking.canOpenURL(native)) {
      await Linking.openURL(native);
      return;
    }
  } catch {
    // fall through to the web link
  }
  Linking.openURL(web).catch(() => {});
}

/** Google Maps directions in a browser or the app, for when Raha's own routing is unavailable. */
export function openGoogleDirections(origin: RouteCoordinate, destination: RouteCoordinate) {
  Linking.openURL(
    `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`
  ).catch(() => {});
}
