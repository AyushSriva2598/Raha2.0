import type { UserProfile } from '@/types';

type SecureStoreModule = typeof import('expo-secure-store');

// expo-secure-store is a native module: it only exists in a dev build made after it was installed.
// Loading it must never crash the app, so it is required lazily and the session falls back to memory
// (signing in works, but the session is lost when the app restarts) until the build includes it.
let secureStore: SecureStoreModule | null | undefined;
function keychain(): SecureStoreModule | null {
  if (secureStore !== undefined) return secureStore;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    secureStore = require('expo-secure-store') as SecureStoreModule;
  } catch {
    secureStore = null;
    console.log('[session] expo-secure-store is not in this build; the session is kept in memory only.');
  }
  return secureStore;
}

// The session token lives in the platform keychain (expo-secure-store), never in plain storage.
const TOKEN_KEY = 'raha.session.token';

let token: string | null = null;
let currentUser: UserProfile | null = null;
let onUnauthorized: (() => void) | null = null;

export const getAuthToken = () => token;
export const getCurrentUser = () => currentUser;
export const setCurrentUser = (u: UserProfile | null) => {
  currentUser = u;
};

/** The api client calls this when the server rejects the saved session. */
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};
export const notifyUnauthorized = () => onUnauthorized?.();

export function authHeaders(): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function loadSavedToken(): Promise<string | null> {
  try {
    token = (await keychain()?.getItemAsync(TOKEN_KEY)) ?? null;
  } catch {
    token = null;
  }
  return token;
}

export async function saveToken(value: string): Promise<void> {
  token = value;
  try {
    await keychain()?.setItemAsync(TOKEN_KEY, value);
  } catch {
    // keep the in-memory session even if the keychain is unavailable
  }
}

export async function clearToken(): Promise<void> {
  token = null;
  currentUser = null;
  try {
    await keychain()?.deleteItemAsync(TOKEN_KEY);
  } catch {
    // nothing to delete
  }
}
