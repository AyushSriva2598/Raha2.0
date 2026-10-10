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

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (window.google?.maps) {
          resolve(window.google.maps);
        } else {
          reject(new Error('Google Maps script loaded but window.google.maps is undefined'));
        }
      });
      existingScript.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry,places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps failed to initialize after script load'));
      }
    };

    script.onerror = (err) => {
      reject(new Error(`Failed to load Google Maps script: ${err}`));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
