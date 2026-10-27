import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

const MIN_AGE_MS = 60_000;
const OFFLINE_RETRY_MS = 30_000;

// Stale-while-revalidate triggers: the screen already shows its saved copy; this refetches in the
// background when the app returns to the foreground, and keeps retrying while the last fetch failed
// (which is how the app notices the network is back). Do not use it for data where old values cost money.
export function useRevalidate(revalidate: () => void, offline: boolean) {
  const latest = useRef(revalidate);
  const lastRun = useRef(0);

  useEffect(() => {
    latest.current = revalidate;
  }, [revalidate]);

  useEffect(() => {
    lastRun.current = Date.now(); // the screen just fetched on mount
    const run = (minAge: number) => {
      if (Date.now() - lastRun.current < minAge) return;
      lastRun.current = Date.now();
      latest.current();
    };
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run(MIN_AGE_MS);
    });
    const retry = offline
      ? setInterval(() => {
          if (AppState.currentState === 'active') run(OFFLINE_RETRY_MS);
        }, OFFLINE_RETRY_MS)
      : null;
    return () => {
      sub.remove();
      if (retry) clearInterval(retry);
    };
  }, [offline]);
}
