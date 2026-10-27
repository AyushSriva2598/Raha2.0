import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { Colors } from '@/constants/tokens';
import { useAppStore } from '@/store/useAppStore';
import { Radio, MapPin, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function EmergencySosModal() {
  const {
    isSosModalOpen,
    openSosModal,
    triggerEmergencySos,
    userProfile,
    alertLevel,
    sosBroadcastResult: result,
    t,
  } = useAppStore();

  const [countdown, setCountdown] = useState(5);
  const [isDispatched, setIsDispatched] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const strings = t();
  const insets = useSafeAreaInsets();

  // A second tap or the countdown firing together with a tap must not start a second request.
  const inFlight = React.useRef(false);
  const handleDispatch = React.useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsBroadcasting(true);
    try {
      await triggerEmergencySos();
      setIsDispatched(true);
    } finally {
      inFlight.current = false;
      setIsBroadcasting(false);
    }
  }, [triggerEmergencySos]);

  useEffect(() => {
    if (!isSosModalOpen || isDispatched || isBroadcasting) return;

    const timer = setTimeout(() => {
      if (countdown <= 1) {
        setCountdown(0);
        handleDispatch();
      } else {
        setCountdown((prev) => prev - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [isSosModalOpen, countdown, isDispatched, isBroadcasting, handleDispatch]);

  const handleClose = () => {
    openSosModal(false);
    setCountdown(5);
    setIsDispatched(false);
    setIsBroadcasting(false);
  };

  if (!isSosModalOpen) return null;

  // What the screen says comes from what the server reported, never from what we hoped happened.
  const delivered = result?.status === 'SENT' || result?.status === 'PARTIAL';
  const resultTitle =
    result?.status === 'SENT' || result?.status === 'PARTIAL'
      ? strings.sos.resultSentTitle
      : result?.status === 'RECORDED'
        ? strings.sos.resultRecordedTitle
        : strings.sos.resultFailedTitle;
  const resultText =
    result?.status === 'SENT' || result?.status === 'PARTIAL'
      ? strings.sos.resultSent.replace('{n}', String(result.smsCount)).replace('{total}', String(result.recipients))
      : result?.status === 'RECORDED'
        ? strings.sos.resultRecorded
        : strings.sos.resultFailed;

  const activeContacts = (userProfile?.contacts || []).filter((c) => c.isActive);
  const initials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  return (
    <Modal visible={isSosModalOpen} animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
      <View style={[styles.screen, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
        {!isDispatched ? (
          <>
            <Text style={styles.title} accessibilityRole="header">
              {isBroadcasting ? strings.sos.broadcastingTitle : strings.sos.dialogTitle}
            </Text>

            {/* Concentric rings with the countdown / radio at the centre */}
            <View style={styles.stage}>
              <View style={[styles.ring, styles.ringOuter]} />
              <View style={[styles.ring, styles.ringMid]} />
              <View style={styles.core} accessibilityLiveRegion="polite">
                {isBroadcasting ? (
                  <Radio size={64} color="#FFFFFF" strokeWidth={2} />
                ) : (
                  <Text style={styles.countdownNumber}>{countdown}</Text>
                )}
              </View>
              {isBroadcasting &&
                activeContacts.slice(0, 3).map((c, i) => (
                  <View key={c.contactId} style={[styles.avatar, AVATAR_POSITIONS[i]]}>
                    <Text style={styles.avatarText}>{initials(c.name)}</Text>
                  </View>
                ))}
            </View>

            <View style={styles.locationRow}>
              <MapPin size={16} color="#FFFFFF" />
              <Text style={styles.locationText}>
                Alert: {alertLevel}
              </Text>
            </View>
            <Text style={styles.quote}>{strings.sos.countdownSubtitle}</Text>

            <View style={styles.buttons}>
              {!isBroadcasting && (
                <Pressable
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                  onPress={handleDispatch}
                  accessibilityRole="button">
                  <Text style={styles.secondaryButtonText}>Send now</Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
                onPress={handleClose}
                accessibilityRole="button">
                <Text style={styles.cancelButtonText}>{strings.sos.cancelButton}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title} accessibilityRole="header">
              {resultTitle}
            </Text>
            <View style={styles.stage}>
              <View style={[styles.ring, styles.ringOuter]} />
              <View style={[styles.ring, styles.ringMid]} />
              <View style={styles.core}>
                {delivered ? (
                  <CheckCircle size={72} color="#FFFFFF" strokeWidth={2} />
                ) : (
                  <AlertTriangle size={72} color="#FFFFFF" strokeWidth={2} />
                )}
              </View>
            </View>
            <Text style={styles.quote} accessibilityLiveRegion="polite">
              {resultText}
            </Text>
            <View style={styles.buttons}>
              {result?.status === 'FAILED' && (
                <Pressable
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                  onPress={() => {
                    setIsDispatched(false);
                    handleDispatch();
                  }}
                  accessibilityRole="button">
                  <Text style={styles.secondaryButtonText}>{strings.sos.retry}</Text>
                </Pressable>
              )}
              {!delivered &&
                activeContacts.slice(0, 2).map((c) => (
                  <Pressable
                    key={c.contactId}
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                    onPress={() => Linking.openURL(`tel:${c.phone.replace(/\s/g, '')}`)}
                    accessibilityRole="button">
                    <Text style={styles.secondaryButtonText}>{strings.sos.callContact.replace('{name}', c.name)}</Text>
                  </Pressable>
                ))}
              <Pressable
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
                onPress={handleClose}
                accessibilityRole="button">
                <Text style={styles.cancelButtonText}>{strings.sos.doneButton}</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const AVATAR_POSITIONS = [
  { top: 10, right: 6 },
  { bottom: 30, left: 0 },
  { bottom: 6, right: 20 },
] as const;

const RING = 'rgba(255, 255, 255, 0.18)';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.coralDeep,
    alignItems: 'center',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'AtkinsonHyperlegible_700Bold',
    fontSize: 28,
    lineHeight: 36,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  stage: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: RING,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  ringOuter: { width: 300, height: 300 },
  ringMid: { width: 230, height: 230 },
  core: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    borderColor: '#FFFFFF',
    backgroundColor: Colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNumber: {
    fontVariant: ['tabular-nums'],
    fontFamily: 'AtkinsonHyperlegible_700Bold',
    fontSize: 88,
    lineHeight: 100,
    color: '#FFFFFF',
  },
  avatar: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'AtkinsonHyperlegible_700Bold',
    fontSize: 16,
    color: Colors.coralDeep,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontFamily: 'AtkinsonHyperlegible_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  quote: {
    fontFamily: 'AtkinsonHyperlegible_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    maxWidth: 340,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'AtkinsonHyperlegible_700Bold',
    fontSize: 17,
    color: '#FFFFFF',
  },
  cancelButton: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: 'AtkinsonHyperlegible_700Bold',
    fontSize: 18,
    color: Colors.moraineInk,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
