import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radii, Spacing } from '@/constants/tokens';
import { getResolvedApiUrl } from '@/services/api';

type CheckState = 'idle' | 'checking' | 'ok' | 'fail';

// Dev diagnostic: pings the backend /health endpoint and shows what happened.
export function BackendCheck() {
  const [state, setState] = useState<CheckState>('idle');
  const [lines, setLines] = useState<string[]>([]);

  const run = async () => {
    const base = getResolvedApiUrl().replace(/\/+$/, '');
    const url = `${base}/health`;
    const log: string[] = [`URL: ${url}`];
    setState('checking');
    setLines(log);
    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      const ms = Date.now() - started;
      const body = await res.text();
      log.push(`HTTP ${res.status} in ${ms} ms`, body);
      setState(res.ok ? 'ok' : 'fail');
    } catch (e) {
      const err = e as Error;
      log.push(
        `Failed after ${Date.now() - started} ms`,
        err.name === 'AbortError' ? 'Timed out (5s)' : err.message,
        'Hint: run "adb reverse tcp:4000 tcp:4000" and start the backend.'
      );
      setState('fail');
    } finally {
      clearTimeout(timeout);
      console.log('[BackendCheck]', log.join(' | '));
      setLines([...log]);
    }
  };

  const color = state === 'ok' ? Colors.cirqueTeal : state === 'fail' ? Colors.warning : Colors.slateFog;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={run}
        disabled={state === 'checking'}
        accessibilityRole="button"
        style={styles.button}
      >
        {state === 'checking' ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Test backend connection</Text>
        )}
      </Pressable>
      {state !== 'idle' && (
        <View style={styles.log}>
          <Text style={[styles.status, { color }]}>
            {state === 'ok' ? 'Backend reachable' : state === 'fail' ? 'Backend unreachable' : 'Checking…'}
          </Text>
          {lines.map((l, i) => (
            <Text key={i} style={styles.line} selectable>
              {l}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceLowest,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  button: {
    minHeight: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.meltwater,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  log: { gap: Spacing.xs },
  status: { fontWeight: '700', fontSize: 15 },
  line: { color: Colors.moraineInk, fontSize: 13, fontFamily: 'monospace' },
});
