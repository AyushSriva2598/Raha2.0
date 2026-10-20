import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, type AccessibilityActionEvent } from 'react-native';
import { Colors, Typography } from '@/constants/theme';
import { GLOF_LEVEL_COLOR, GLOF_LEVEL_LABEL, GLOF_NO_LEVEL_COLOR } from '@/constants/glof';
import type { GlofFrame } from '@/types';

interface TimelineSliderProps {
  frames: GlofFrame[];
  index: number;
  onChange: (index: number) => void;
  /** Dated events drawn as ticks on the track, e.g. the 2023 outburst flood. */
  events?: { date: string; label: string }[];
}

const TRACK_H = 10;
const THUMB = 26;

const ts = (d: string) => new Date(`${d}T00:00:00Z`).getTime();

// Scrubber positioned by real time (not by frame count), coloured by alert level per segment.
export function TimelineSlider({ frames, index, onChange, events = [] }: TimelineSliderProps) {
  const [width, setWidth] = useState(0);
  const trackRef = useRef<View>(null);
  const pageX = useRef(0);
  const live = useRef({ frames, width, onChange });
  useEffect(() => {
    live.current = { frames, width, onChange };
  });

  const { t0, span } = useMemo(() => {
    const a = ts(frames[0].date);
    const b = ts(frames[frames.length - 1].date);
    return { t0: a, span: Math.max(1, b - a) };
  }, [frames]);

  const xOf = (date: string) => ((ts(date) - t0) / span) * width;

  // Reads the latest frames from the ref so the long-lived gesture handlers never go stale.
  const nearestIndex = (x: number) => {
    const { frames: f, width: w } = live.current;
    const a = ts(f[0].date);
    const range = Math.max(1, ts(f[f.length - 1].date) - a);
    const t = a + (Math.min(Math.max(x, 0), w) / Math.max(1, w)) * range;
    let best = 0;
    for (let i = 1; i < f.length; i++) if (Math.abs(ts(f[i].date) - t) < Math.abs(ts(f[best].date) - t)) best = i;
    return best;
  };

  // Handlers only touch refs from inside gesture callbacks, never while rendering.
  /* eslint-disable react-hooks/refs */
  const [pan] = useState(() =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (_e, g) => {
          // Window coordinates are reliable even when the touch lands on the thumb.
          trackRef.current?.measureInWindow((x) => {
            pageX.current = x;
            live.current.onChange(nearestIndex(g.x0 - x));
          });
        },
        onPanResponderMove: (_e, g) => live.current.onChange(nearestIndex(g.moveX - pageX.current)),
      })
  );
  /* eslint-enable react-hooks/refs */

  const current = frames[index];
  const years = useMemo(() => {
    const out: { year: number; x: number }[] = [];
    const first = new Date(t0).getUTCFullYear();
    const last = new Date(t0 + span).getUTCFullYear();
    for (let y = first + 1; y <= last; y += 2) out.push({ year: y, x: ((Date.UTC(y, 0, 1) - t0) / span) * width });
    return out;
  }, [t0, span, width]);

  const onA11y = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') onChange(Math.min(frames.length - 1, index + 1));
    if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(0, index - 1));
  };

  const thumbX = width ? xOf(current.date) : 0;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Satellite image date"
      accessibilityValue={{ text: `${current.date}, ${current.level ? GLOF_LEVEL_LABEL[current.level] : 'no level'}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onA11y}>
      <View style={styles.touch} {...pan.panHandlers}>
        <View ref={trackRef} style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 &&
            frames.map((f, i) => {
              const x0 = xOf(f.date);
              const x1 = i < frames.length - 1 ? xOf(frames[i + 1].date) : width;
              return (
                <View
                  key={f.date}
                  style={{
                    position: 'absolute',
                    left: x0,
                    width: Math.max(1, x1 - x0),
                    height: TRACK_H,
                    backgroundColor: f.level ? GLOF_LEVEL_COLOR[f.level] : GLOF_NO_LEVEL_COLOR,
                  }}
                />
              );
            })}
          {width > 0 &&
            events.map((ev) => (
              <View key={ev.date} style={[styles.event, { left: xOf(ev.date) - 1 }]} />
            ))}
          {width > 0 && (
            <View style={[styles.thumb, { left: thumbX - THUMB / 2 }]}>
              <View style={styles.thumbDot} />
            </View>
          )}
        </View>
      </View>
      <View style={styles.axis}>
        {years.map((y) => (
          <Text key={y.year} style={[styles.year, { left: y.x - 16 }]}>
            {y.year}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  touch: { height: 44, justifyContent: 'center' },
  track: { height: TRACK_H, borderRadius: TRACK_H / 2, overflow: 'visible', backgroundColor: '#EAD9D4', justifyContent: 'center' },
  event: { position: 'absolute', top: -5, width: 2, height: TRACK_H + 10, backgroundColor: Colors.ink, borderRadius: 1 },
  thumb: {
    position: 'absolute',
    top: -(THUMB - TRACK_H) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7A2A22',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  thumbDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.coral },
  axis: { height: 16, marginTop: -2 },
  year: {
    position: 'absolute',
    width: 32,
    textAlign: 'center',
    fontFamily: Typography.family.regular,
    fontSize: 11,
    color: Colors.text3,
  },
});
