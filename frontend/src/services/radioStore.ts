import { requireOptionalNativeModule } from 'expo';
import { create } from 'zustand';

// One app-wide internet radio player: it keeps playing while you move around the app, in the
// background and on the lock screen. Stations are public broadcasters' own streams.

export interface RadioStation {
  id: string;
  name: string;
  /** City, language or network, shown under the name. */
  detail: string;
  url: string;
}

/** Streams checked to deliver audio (AAC over HLS). All India Radio carries official bulletins. */
export const BUILT_IN_STATIONS: RadioStation[] = [
  {
    id: 'air-fm-gold-kolkata',
    name: 'AIR FM Gold Kolkata',
    detail: 'All India Radio · news bulletins and music',
    url: 'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio057/hlspbaudio05764kbps.m3u8',
  },
  {
    id: 'air-fm-rainbow-kolkata',
    name: 'AIR FM Rainbow Kolkata',
    detail: 'All India Radio · music and programmes',
    url: 'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio058/hlspbaudio05864kbps.m3u8',
  },
];

export type RadioStatus = 'idle' | 'connecting' | 'playing' | 'paused' | 'error' | 'unavailable';

interface RadioState {
  station: RadioStation | null;
  status: RadioStatus;
  error: string | null;
  play: (station: RadioStation) => void;
  toggle: () => void;
  stop: () => void;
}

const CONNECT_TIMEOUT_MS = 15000;

type AudioLib = typeof import('expo-audio');
type Player = ReturnType<AudioLib['createAudioPlayer']>;
let lib: AudioLib | null | undefined;
let player: Player | null = null;
let connectTimer: ReturnType<typeof setTimeout> | null = null;

function audio(): AudioLib | null {
  if (lib !== undefined) return lib;
  // expo-audio is native: a dev build made before it was added cannot play, so check first.
  if (!requireOptionalNativeModule('ExpoAudio')) return (lib = null);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  lib = require('expo-audio') as AudioLib;
  lib.setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
  return lib;
}

const clearConnectTimer = () => {
  if (connectTimer) clearTimeout(connectTimer);
  connectTimer = null;
};

export const useRadioStore = create<RadioState>((set, get) => ({
  station: null,
  status: audio() ? 'idle' : 'unavailable',
  error: null,

  play: (station) => {
    const a = audio();
    if (!a) {
      set({ status: 'unavailable' });
      return;
    }
    clearConnectTimer();
    if (player) {
      player.clearLockScreenControls();
      player.remove();
    }
    player = a.createAudioPlayer({ uri: station.url });
    set({ station, status: 'connecting', error: null });

    player.addListener('playbackStatusUpdate', (s) => {
      if (get().station?.id !== station.id) return;
      if (s.playing && !s.isBuffering) {
        clearConnectTimer();
        if (get().status !== 'playing') set({ status: 'playing', error: null });
      } else if (s.playing && s.isBuffering) {
        if (get().status === 'playing') set({ status: 'connecting' });
      }
    });

    connectTimer = setTimeout(() => {
      if (get().station?.id === station.id && get().status === 'connecting') {
        player?.pause();
        set({ status: 'error', error: `${station.name} is not responding. Try again or pick another station.` });
      }
    }, CONNECT_TIMEOUT_MS);

    player.setActiveForLockScreen(true, { title: station.name, artist: 'Raha radio' });
    player.play();
  },

  toggle: () => {
    const { station, status } = get();
    if (!station) return;
    if (status === 'playing' || status === 'connecting') {
      clearConnectTimer();
      player?.pause();
      set({ status: 'paused' });
    } else {
      // A live stream resumed after a pause should be live again, so reconnect.
      get().play(station);
    }
  },

  stop: () => {
    clearConnectTimer();
    if (player) {
      player.clearLockScreenControls();
      player.remove();
      player = null;
    }
    set({ station: null, status: audio() ? 'idle' : 'unavailable', error: null });
  },
}));

/** Public stations from the Radio Browser directory (India and Nepal), for "find more". */
export async function searchStations(query: string, signal?: AbortSignal): Promise<RadioStation[]> {
  const q = encodeURIComponent(query.trim());
  const base = 'https://de1.api.radio-browser.info/json/stations/search';
  const params = `name=${q}&hidebroken=true&order=votes&reverse=true&limit=15`;
  const lists = await Promise.all(
    ['IN', 'NP'].map((cc) =>
      fetch(`${base}?${params}&countrycode=${cc}`, { signal, headers: { 'User-Agent': 'Raha/1.0' } })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [])
    )
  );
  return (lists.flat() as { stationuuid: string; name: string; state: string; language: string; country: string; url_resolved: string }[])
    .filter((s) => s.url_resolved?.startsWith('https://'))
    .map((s) => ({
      id: s.stationuuid,
      name: s.name.trim(),
      detail: [s.state || s.country, s.language].filter(Boolean).join(' · '),
      url: s.url_resolved,
    }));
}
