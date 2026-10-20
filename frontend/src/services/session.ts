import * as SecureStore from 'expo-secure-store';
import type { UserProfile } from '@/types';

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
    token = await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    token = null;
  }
  return token;
}

export async function saveToken(value: string): Promise<void> {
  token = value;
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, value);
  } catch {
    // keep the in-memory session even if the keychain is unavailable
  }
}

export async function clearToken(): Promise<void> {
  token = null;
  currentUser = null;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // nothing to delete
  }
}
