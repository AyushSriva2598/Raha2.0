import { create } from 'zustand';
import type { UserProfile } from '@/types';
import { apiClient, getResolvedApiUrl } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import {
  authHeaders,
  clearToken,
  loadSavedToken,
  saveToken,
  setCurrentUser,
  setUnauthorizedHandler,
} from '@/services/session';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

/** What went wrong, so the screen can show a message in the user's language. */
export type AuthErrorKind = 'network' | 'invalidPhone' | 'wrong' | 'expired' | 'locked' | 'wait' | 'limit' | 'sms' | 'generic';

export class AuthError extends Error {
  constructor(public kind: AuthErrorKind, public retryAfterSec?: number) {
    super(kind);
  }
}

interface AuthState {
  status: AuthStatus;
  user: UserProfile | null;
  restore: () => Promise<void>;
  requestCode: (phone: string) => Promise<{ resendAfterSec: number; debugCode?: string }>;
  verifyCode: (phone: string, code: string) => Promise<{ isNewUser: boolean }>;
  signOut: () => Promise<void>;
}

async function call<T>(path: string, init: RequestInit = {}, timeoutMs = 15000): Promise<{ status: number; body: T }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${getResolvedApiUrl().replace(/\/+$/, '')}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(init.headers ?? {}) },
    });
    let body = {} as T;
    try {
      body = (await res.json()) as T;
    } catch {
      // empty body
    }
    return { status: res.status, body };
  } catch {
    throw new AuthError('network');
  } finally {
    clearTimeout(timer);
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,

  // Restores a saved session on launch. A server "no" signs out; being offline does not.
  restore: async () => {
    setUnauthorizedHandler(() => {
      get().signOut();
    });
    const saved = await loadSavedToken();
    if (!saved) {
      set({ status: 'signedOut' });
      return;
    }
    try {
      const { status, body } = await call<UserProfile>('/api/auth/me', {}, 5000);
      if (status === 401) {
        await clearToken();
        set({ status: 'signedOut', user: null });
        return;
      }
      if (status === 200) {
        setCurrentUser(body);
        set({ status: 'signedIn', user: body });
        return;
      }
    } catch {
      // offline: stay signed in with the saved session; data loads from the local cache
    }
    set({ status: 'signedIn' });
  },

  requestCode: async (phone) => {
    const { status, body } = await call<{ resendAfterSec?: number; debugCode?: string; retryAfterSec?: number }>('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
    if (status === 200) return { resendAfterSec: body.resendAfterSec ?? 30, debugCode: body.debugCode };
    if (status === 400) throw new AuthError('invalidPhone');
    if (status === 503) throw new AuthError('sms');
    if (status === 429) throw new AuthError((body.retryAfterSec ?? 0) > 60 ? 'limit' : 'wait', body.retryAfterSec);
    throw new AuthError('generic');
  },

  verifyCode: async (phone, code) => {
    const { status, body } = await call<{ token?: string; isNewUser?: boolean; profile?: UserProfile; reason?: string }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
    if (status === 200 && body.token && body.profile) {
      apiClient.resetUserData();
      await saveToken(body.token);
      setCurrentUser(body.profile);
      set({ status: 'signedIn', user: body.profile });
      return { isNewUser: !!body.isNewUser };
    }
    if (body.reason === 'expired') throw new AuthError('expired');
    if (body.reason === 'locked') throw new AuthError('locked');
    if (status === 401) throw new AuthError('wrong');
    throw new AuthError('generic');
  },

  signOut: async () => {
    await clearToken();
    apiClient.resetUserData();
    useAppStore.setState({ userProfile: null });
    set({ status: 'signedOut', user: null });
  },
}));
