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

export type RadioStatus = 'idle' | 'connecting' | 'playing' | 'paused' | 'error';

interface RadioState {
  station: RadioStation | null;
  status: RadioStatus;
  error: string | null;
  /** True once the web player is needed (builds without native audio); the root layout mounts it. */
  needsWebEngine: boolean;
  /** 'native' plays in the background and on the lock screen; 'web' plays while the app is open. */
  engine: 'native' | 'web';
  play: (station: RadioStation) => void;
  toggle: () => void;
  stop: () => void;
}

const CONNECT_TIMEOUT_MS = 15000;

// Two engines behind one shape. Native expo-audio is used when the build has it; otherwise a hidden
// web view with hls.js plays the same streams (see components/radio/RadioWebEngine).
interface Engine {
  play: (station: RadioStation) => void;
  pause: () => void;
  stop: () => void;
}

type AudioLib = typeof import('expo-audio');
type Player = ReturnType<AudioLib['createAudioPlayer']>;
let lib: AudioLib | null | undefined;
let nativePlayer: Player | null = null;
let connectTimer: ReturnType<typeof setTimeout> | null = null;

function audio(): AudioLib | null {
  if (lib !== undefined) return lib;
  if (!requireOptionalNativeModule('ExpoAudio')) return (lib = null);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  lib = require('expo-audio') as AudioLib;
  lib.setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
  return lib;
}

const nativeEngine: Engine = {
  play: (station) => {
    const a = audio();
    if (!a) return;
    if (nativePlayer) {
      nativePlayer.clearLockScreenControls();
      nativePlayer.remove();
    }
    nativePlayer = a.createAudioPlayer({ uri: station.url });
    nativePlayer.addListener('playbackStatusUpdate', (st) => {
      if (st.playing && !st.isBuffering) radioEvent(station.id, 'playing');
      else if (st.playing && st.isBuffering) radioEvent(station.id, 'buffering');
    });
    nativePlayer.setActiveForLockScreen(true, { title: station.name, artist: 'Raha radio' });
    nativePlayer.play();
  },
  pause: () => nativePlayer?.pause(),
  stop: () => {
    if (!nativePlayer) return;
    nativePlayer.clearLockScreenControls();
    nativePlayer.remove();
    nativePlayer = null;
  },
};

// The web engine is a message channel to the hidden web view, which may not exist yet: commands sent
// before it is ready are held and the last one is delivered when it says it is ready.
let webSend: ((msg: object) => void) | null = null;
let pendingWeb: object | null = null;
const toWeb = (msg: object) => (webSend ? webSend(msg) : (pendingWeb = msg));
const webEngine: Engine = {
  play: (station) => toWeb({ type: 'play', url: station.url, id: station.id }),
  pause: () => toWeb({ type: 'pause' }),
  stop: () => toWeb({ type: 'stop' }),
};

/** Called by RadioWebEngine when its page is ready (or unmounted, with null). */
export function attachWebEngine(send: ((msg: object) => void) | null) {
  webSend = send;
  if (send && pendingWeb) {
    send(pendingWeb);
    pendingWeb = null;
  }
}

const clearConnectTimer = () => {
  if (connectTimer) clearTimeout(connectTimer);
  connectTimer = null;
};

const engine = (): Engine => (audio() ? nativeEngine : webEngine);

/** Playback events from either engine, for the station that is current. */
export function radioEvent(stationId: string | undefined, type: 'playing' | 'buffering' | 'paused' | 'error', message?: string) {
  const st = useRadioStore.getState();
  if (!st.station || (stationId && stationId !== st.station.id)) return;
  if (type === 'playing') {
    clearConnectTimer();
    if (st.status !== 'playing') useRadioStore.setState({ status: 'playing', error: null });
  } else if (type === 'buffering') {
    if (st.status === 'playing') useRadioStore.setState({ status: 'connecting' });
  } else if (type === 'error') {
    clearConnectTimer();
    useRadioStore.setState({ status: 'error', error: `${st.station.name} could not be played${message ? ` (${message})` : ''}. Try again or pick another station.` });
  }
}

export const useRadioStore = create<RadioState>((set, get) => ({
  station: null,
  status: 'idle',
  error: null,
  needsWebEngine: false,
  engine: audio() ? 'native' : 'web',

  play: (station) => {
    clearConnectTimer();
    if (!audio() && !get().needsWebEngine) set({ needsWebEngine: true });
    set({ station, status: 'connecting', error: null });
    engine().play(station);
    connectTimer = setTimeout(() => {
      if (get().station?.id === station.id && get().status === 'connecting') {
        engine().pause();
        set({ status: 'error', error: `${station.name} is not responding. Try again or pick another station.` });
      }
    }, CONNECT_TIMEOUT_MS);
  },

  toggle: () => {
    const { station, status } = get();
    if (!station) return;
    if (status === 'playing' || status === 'connecting') {
      clearConnectTimer();
      engine().pause();
      set({ status: 'paused' });
    } else {
      // A live stream resumed after a pause should be live again, so reconnect.
      get().play(station);
    }
  },

  stop: () => {
    clearConnectTimer();
    engine().stop();
    set({ station: null, status: 'idle', error: null });
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
