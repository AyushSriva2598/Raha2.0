import { create } from 'zustand';

// One toast at a time. The store owns the timer so an Undo window still closes (and its action
// commits) when the screen that started it is gone.

export type ToastTone = 'info' | 'error';

export interface ToastOptions {
  message: string;
  tone?: ToastTone;
  actionLabel?: string;
  /** Runs when the person taps the action (for example Undo). */
  onAction?: () => void;
  /** Runs when the toast goes away without the action being taken. */
  onExpire?: () => void;
  durationMs?: number;
}

interface Toast extends ToastOptions {
  id: number;
}

interface ToastState {
  toast: Toast | null;
  show: (options: ToastOptions) => void;
  runAction: () => void;
  dismiss: () => void;
}

const DEFAULT_MS = 7000;
let nextId = 1;
let timer: ReturnType<typeof setTimeout> | null = null;

function clearTimer() {
  if (timer) clearTimeout(timer);
  timer = null;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toast: null,

  show: (options) => {
    // A newer toast replaces the old one; the old one counts as expired, so its pending work commits.
    get().dismiss();
    const toast: Toast = { tone: 'info', ...options, id: nextId++ };
    set({ toast });
    timer = setTimeout(() => get().dismiss(), options.durationMs ?? DEFAULT_MS);
  },

  runAction: () => {
    const current = get().toast;
    if (!current) return;
    clearTimer();
    set({ toast: null });
    current.onAction?.();
  },

  dismiss: () => {
    const current = get().toast;
    clearTimer();
    if (!current) return;
    set({ toast: null });
    current.onExpire?.();
  },
}));

export const showToast = (options: ToastOptions) => useToastStore.getState().show(options);
