/// <reference types="@types/google.maps" />

declare global {
  interface Window {
    google?: typeof google;
  }
}

// Utility to dynamically load Google Maps JavaScript API SDK on Web
let googleMapsPromise: Promise<typeof google.maps> | null = null;

export const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  'AIzaSyCRy8UnT02ssQj7PSOtlp7RK4swXZWO9GU';

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only be loaded in a browser environment'));
  }

  if (window.google?.maps?.Map && (window.google.maps as any).marker?.AdvancedMarkerElement) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    // If maps is already fully loaded with marker library
    if (window.google?.maps?.Map && (window.google.maps as any).marker?.AdvancedMarkerElement) {
      resolve(window.google.maps);
      return;
    }

    const callbackName = '__gmaps_async_cb_' + Math.random().toString(36).substring(2, 9);

    // Global callback triggered by Google Maps script
    (window as any)[callbackName] = async () => {
      try {
        delete (window as any)[callbackName];
        if (window.google?.maps) {
          if (typeof window.google.maps.importLibrary === 'function') {
            const [, markerLib] = await Promise.all([
              window.google.maps.importLibrary('maps'),
              window.google.maps.importLibrary('marker'),
              window.google.maps.importLibrary('geometry'),
            ]);
            if (markerLib) {
              (window.google.maps as any).marker = {
                ...((window.google.maps as any).marker || {}),
                ...markerLib,
              };
            }
          }
          resolve(window.google.maps);
        } else {
          reject(new Error('Google Maps script loaded but window.google.maps is undefined'));
        }
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      existingScript.addEventListener('load', async () => {
        if (window.google?.maps) {
          if (typeof window.google.maps.importLibrary === 'function') {
            const markerLib = await window.google.maps.importLibrary('marker');
            if (markerLib) {
              (window.google.maps as any).marker = {
                ...((window.google.maps as any).marker || {}),
                ...markerLib,
              };
            }
          }
          resolve(window.google.maps);
        }
      });
      existingScript.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    // Using loading=async and callback per Google Maps JavaScript API best-practice guidelines
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&loading=async&libraries=geometry,places,marker&callback=${callbackName}`;
    script.async = true;
    script.defer = true;

    script.onerror = (err) => {
      delete (window as any)[callbackName];
      reject(new Error(`Failed to load Google Maps script: ${err}`));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
