import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Colors, Typography } from '@/constants/theme';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import type { GlofLakeData } from '@/types';
import { TERRAIN_HTML } from './terrainHtml';
import { TERRAIN_PACKS } from '../../assets/terrain';

export interface TerrainLayers {
  satellite: boolean;
  history: boolean;
  baseline: boolean;
}

interface TerrainViewProps {
  data: GlofLakeData | null;
  frameIndex: number;
  layers: TerrainLayers;
  rotate: boolean;
  /** Increment to re-centre the camera on the lake. */
  resetKey: number;
  /** Pixels at the bottom covered by the info card; the lake is framed above it. */
  bottomInset: number;
  onRotateStopped: () => void;
}

const SOURCE = { html: TERRAIN_HTML, baseUrl: 'https://raha.local/' };

export function TerrainView({ data, frameIndex, layers, rotate, resetKey, bottomInset, onRotateStopped }: TerrainViewProps) {
  const ref = useRef<WebView>(null);
  const reduceMotion = useReducedMotion();
  const [pageLoaded, setPageLoaded] = useState(false);
  // The scene is ready when the page reports ready for the lake/data currently shown.
  const [readyKey, setReadyKey] = useState('');
  const sceneKey = data ? data.lake.id : '';
  const latestKey = useRef(sceneKey);
  const mapReady = sceneKey !== '' && readyKey === sceneKey;
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const send = useCallback((msg: object) => {
    ref.current?.injectJavaScript(`window.rx(${JSON.stringify(msg)});true;`);
  }, []);

  // (Re)build the scene whenever the page is up and a different lake or fresh data arrives.
  useEffect(() => {
    latestKey.current = sceneKey;
  }, [sceneKey]);

  useEffect(() => {
    if (!pageLoaded || !data) return;
    // Offline tile pack for this lake, sent in chunks so no single message is huge.
    const pack = TERRAIN_PACKS[data.lake.id]?.();
    if (pack) {
      send({ type: 'pack', reset: true, bounds: pack.bounds, dem: {}, sat: {} });
      for (const layer of ['dem', 'sat'] as const) {
        let chunk: Record<string, string> = {};
        let size = 0;
        for (const [key, b64] of Object.entries(pack[layer].tiles)) {
          chunk[key] = b64;
          size += b64.length;
          if (size > 250000) {
            send({ type: 'pack', dem: layer === 'dem' ? chunk : {}, sat: layer === 'sat' ? chunk : {} });
            chunk = {};
            size = 0;
          }
        }
        if (size > 0) send({ type: 'pack', dem: layer === 'dem' ? chunk : {}, sat: layer === 'sat' ? chunk : {} });
      }
      send({ type: 'pack', done: true, dem: {}, sat: {} });
    }
    send({ type: 'init', lake: data.lake, frames: data.frames, index: frameIndex, layers, inset: bottomInset, usePack: !!pack, reduceMotion });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageLoaded, data?.lake.id, send]);

  // Fresh data for the same lake updates the outlines only; it must never move the camera.
  useEffect(() => {
    if (pageLoaded && mapReady && data) send({ type: 'frames', frames: data.frames });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.retrievedAt]);

  useEffect(() => {
    if (pageLoaded && mapReady) send({ type: 'frame', index: frameIndex });
  }, [frameIndex, pageLoaded, mapReady, send]);

  useEffect(() => {
    if (pageLoaded) send({ type: 'layers', layers });
  }, [layers, pageLoaded, send]);

  useEffect(() => {
    if (pageLoaded) send({ type: 'rotate', value: rotate });
  }, [rotate, pageLoaded, send]);

  useEffect(() => {
    if (pageLoaded && resetKey > 0) send({ type: 'reset' });
  }, [resetKey, pageLoaded, send]);

  useEffect(() => {
    if (pageLoaded) send({ type: 'inset', value: bottomInset });
  }, [bottomInset, pageLoaded, send]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const m = JSON.parse(e.nativeEvent.data) as { type: string; message?: string; value?: boolean };
      if (m.type === 'loaded') setPageLoaded(true);
      else if (m.type === 'ready') setReadyKey(latestKey.current);
      else if (m.type === 'rotate' && m.value === false) onRotateStopped();
      else if (m.type === 'error') setError(m.message ?? 'The 3D view failed to load.');
    } catch {
      // ignore malformed messages
    }
  };

  const retry = () => {
    setError(null);
    setPageLoaded(false);
    setReadyKey('');
    setReloadKey((k) => k + 1);
  };

  return (
    <View style={styles.fill}>
      <WebView
        key={reloadKey}
        ref={ref}
        source={SOURCE}
        originWhitelist={['*']}
        onMessage={onMessage}
        onError={() => setError('Could not start the 3D view.')}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        androidLayerType="hardware"
        overScrollMode="never"
        scrollEnabled={false}
        bounces={false}
        setBuiltInZoomControls={false}
        style={styles.web}
        containerStyle={styles.web}
        accessibilityLabel="3D terrain view of the glacial lake. Drag to rotate, pinch to zoom."
      />
      {!mapReady && !error && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color={Colors.coral} size="large" />
          <Text style={styles.overlayText}>{data ? 'Loading terrain…' : 'Loading lake data…'}</Text>
        </View>
      )}
      {error && (
        <View style={styles.overlay}>
          <Text style={styles.errorTitle}>3D view unavailable</Text>
          <Text style={styles.overlayText}>{error}</Text>
          <PrimaryButton title="Try again" onPress={retry} height={48} style={styles.retry} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, backgroundColor: '#0b0e12' },
  web: { flex: 1, backgroundColor: '#0b0e12' },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0b0e12',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  overlayText: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.body, color: '#D9DDE2', textAlign: 'center' },
  errorTitle: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.title, color: '#FFFFFF' },
  retry: { alignSelf: 'stretch', marginTop: 8 },
});
