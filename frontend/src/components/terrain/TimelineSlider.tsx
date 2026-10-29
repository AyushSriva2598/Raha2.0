import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type AccessibilityActionEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
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

const TRACK_H = 12;
const THUMB = 32;
const SIDE = THUMB / 2 + 4; // room so the thumb is never clipped at either end

const ts = (d: string) => new Date(`${d}T00:00:00Z`).getTime();

// Scrubber positioned by real time (not by frame count), coloured by alert level per segment.
// The thumb follows the finger on the UI thread; the screen only hears about it when the chosen
// image actually changes, and on release the thumb springs onto that image's date.
const SNAP = { damping: 22, stiffness: 260, reduceMotion: ReduceMotion.System } as const;

export function TimelineSlider({ frames, index, onChange, events = [] }: TimelineSliderProps) {
  const [width, setWidth] = useState(0);

  const { t0, span } = useMemo(() => {
    const a = ts(frames[0].date);
    const b = ts(frames[frames.length - 1].date);
    return { t0: a, span: Math.max(1, b - a) };
  }, [frames]);

  const xOf = (date: string) => ((ts(date) - t0) / span) * width;
  const xs = useMemo(() => (width ? frames.map((f) => ((ts(f.date) - t0) / span) * width) : []), [frames, width, t0, span]);

  const thumb = useSharedValue(0);
  const dragging = useSharedValue(false);
  const chosen = useSharedValue(index);

  // Follow the index when it changes from outside (play, or a lake switch), unless a finger is on it.
  useEffect(() => {
    chosen.set(index);
    if (!dragging.get() && xs.length) thumb.set(withTiming(xs[Math.min(index, xs.length - 1)], { duration: 160, reduceMotion: ReduceMotion.System }));
  }, [index, xs, chosen, dragging, thumb]);

  const pick = (x: number) => {
    'worklet';
    const clamped = Math.min(Math.max(x, 0), width);
    thumb.set(clamped);
    let best = 0;
    for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - clamped) < Math.abs(xs[best] - clamped)) best = i;
    if (best !== chosen.get()) {
      chosen.set(best);
      scheduleOnRN(onChange, best);
    }
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .onBegin((e) => {
      dragging.set(true);
      pick(e.x - SIDE);
    })
    .onUpdate((e) => pick(e.x - SIDE))
    .onFinalize(() => {
      dragging.set(false);
      if (xs.length) thumb.set(withSpring(xs[chosen.get()], SNAP));
    });

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: thumb.get() - THUMB / 2 }] }));

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

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Satellite image date"
      accessibilityValue={{ text: `${current.date}, ${current.level ? GLOF_LEVEL_LABEL[current.level] : 'no level'}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onA11y}>
      {width > 0 &&
        events.slice(0, 1).map((ev) => (
          <Text
            key={ev.date}
            numberOfLines={1}
            pointerEvents="none"
            style={[styles.eventLabel, { left: SIDE + Math.min(Math.max(xOf(ev.date) - 60, 0), Math.max(0, width - 120)) }]}>
            {ev.label}
          </Text>
        ))}
      <GestureDetector gesture={pan}>
      <View style={styles.touch}>
        <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
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
            <Animated.View style={[styles.thumb, thumbStyle]}>
              <View style={styles.thumbDot} />
            </Animated.View>
          )}
        </View>
      </View>
      </GestureDetector>
      <View style={styles.axis}>
        {years.map((y) => (
          <Text key={y.year} style={[styles.year, { left: SIDE + y.x - 16 }]}>
            {y.year}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 8 },
  eventLabel: { position: 'absolute', top: 0, width: 120, textAlign: 'center', fontFamily: Typography.family.regular, fontSize: 11, color: Colors.dangerDark },
  // The whole zone is a swipe target (much taller and wider than the thin track).
  touch: { height: 72, justifyContent: 'center', paddingHorizontal: SIDE },
  track: { height: TRACK_H, borderRadius: TRACK_H / 2, overflow: 'visible', backgroundColor: '#EAD9D4', justifyContent: 'center' },
  event: { position: 'absolute', top: -5, width: 2, height: TRACK_H + 10, backgroundColor: Colors.ink, borderRadius: 1 },
  thumb: {
    position: 'absolute',
    left: 0,
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
  thumbDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.coral },
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
