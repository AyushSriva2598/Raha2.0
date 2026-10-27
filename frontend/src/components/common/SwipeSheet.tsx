import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleProp, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Colors, Radii } from '@/constants/theme';

// A bottom sheet in a Modal that follows the finger and closes on distance or a quick flick.
// Drag from the grab bar at the top (so scrolling and typing inside the sheet are never fought).
// Callers keep their own close button; the backdrop and the Android back button close it too.
// Motion is springs that turn around from the current position and speed, and they jump straight to
// the end when the system asks for reduced motion.

const CLOSE_DISTANCE = 120;
const CLOSE_VELOCITY = 800;
const SPRING = { damping: 28, stiffness: 320, mass: 0.9, reduceMotion: ReduceMotion.System } as const;

interface SwipeSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
  closeLabel?: string;
}

export function SwipeSheet({ visible, onClose, children, sheetStyle, closeLabel = 'Close' }: SwipeSheetProps) {
  const { height } = useWindowDimensions();
  const y = useSharedValue(height);

  // Stay mounted while the closing animation plays (state adjusted during render, not in an effect).
  const [prevVisible, setPrevVisible] = useState(visible);
  const [exiting, setExiting] = useState(false);
  if (prevVisible !== visible) {
    setPrevVisible(visible);
    setExiting(!visible);
  }

  useEffect(() => {
    if (visible) {
      y.set(withSpring(0, SPRING));
    } else {
      y.set(
        withTiming(height, { duration: 200, reduceMotion: ReduceMotion.System }, (finished) => {
          if (finished) scheduleOnRN(setExiting, false);
        })
      );
    }
  }, [visible, height, y]);

  const pan = Gesture.Pan()
    .activeOffsetY(10)
    .onUpdate((e) => {
      y.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > CLOSE_DISTANCE || e.velocityY > CLOSE_VELOCITY) {
        scheduleOnRN(onClose);
      } else {
        y.set(withSpring(0, { ...SPRING, velocity: e.velocityY }));
      }
    });

  const sheetAnimated = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const backdropAnimated = useAnimatedStyle(() => ({
    opacity: interpolate(y.get(), [0, height * 0.6], [1, 0], Extrapolation.CLAMP),
  }));

  if (!visible && !exiting) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnimated]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel} />
        </Animated.View>
        <Animated.View style={[styles.sheet, sheetStyle, sheetAnimated]}>
          <GestureDetector gesture={pan}>
            <View style={styles.grabZone} accessible accessibilityRole="adjustable" accessibilityLabel="Drag down to close">
              <View style={styles.grabBar} />
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(42, 27, 26, 0.5)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
    borderCurve: 'continuous',
    maxHeight: '92%',
  },
  // A tall, full-width target so the drag is easy to start; the visible bar stays small.
  grabZone: { height: 36, alignItems: 'center', justifyContent: 'center' },
  grabBar: { width: 44, height: 5, borderRadius: 3, backgroundColor: Colors.border },
});
