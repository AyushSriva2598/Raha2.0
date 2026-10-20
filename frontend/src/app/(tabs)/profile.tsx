import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Platform,
  Vibration,
} from 'react-native';
import { router } from 'expo-router';
import { OfflineMapSheet } from '@/components/common/OfflineMapSheet';
import { useOfflineStore } from '@/services/offlineCache';
import { useAuthStore } from '@/services/authStore';
import type { SosContact } from '@/types';
import { Colors, Radii, Shadows, Spacing } from '@/constants/tokens';
import { useAppStore } from '@/store/useAppStore';
import { AddEmergencyContactModal } from '@/components/add-contact-modal';
import { EmergencySosModal } from '@/components/sos-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Radio,
  RadioReceiver,
  UserPlus,
  DownloadCloud,
  CheckCircle2,
  Languages,
  Mic,
  ShieldAlert,
  Clock,
  MapPin,
  Signal,
} from 'lucide-react-native';
import { LanguageCode } from '@/i18n/translations';
import { BackendCheck } from '@/components/common/BackendCheck';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const {
    activeLake,
    userProfile,
    language,
    setLanguage,
    toggleContact,
    openAddContactModal,
    openSosModal,
    triggerEmergencySos,
    sosDelayMode,
    setSosDelayMode,
    t,
  } = useAppStore();
  const strings = t();
  const signOut = useAuthStore((st) => st.signOut);

  const [isOfflineSheetOpen, setIsOfflineSheetOpen] = useState(false);
  const offline = useOfflineStore();
  const [isHoldingSos, setIsHoldingSos] = useState(false);
  const [holdSecondsRemaining, setHoldSecondsRemaining] = useState(3);
  const [holdProgressPct, setHoldProgressPct] = useState(0);
  const holdStartTimeRef = useRef<number>(0);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 16);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  const handleTriggerSosBroadcast = async () => {
    if (Platform.OS !== 'web') {
      try {
        Vibration.vibrate([0, 150, 100, 200]);
      } catch {
        // Ignore vibration errors
      }
    }
    await triggerEmergencySos();
    openSosModal(true);
  };

  const handleSosPressIn = () => {
    if (sosDelayMode === 'instant') {
      handleTriggerSosBroadcast();
      return;
    }

    // 3-second hold countdown
    setIsHoldingSos(true);
    setHoldSecondsRemaining(3);
    setHoldProgressPct(0);
    holdStartTimeRef.current = Date.now();

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartTimeRef.current;
      const progress = Math.min(100, Math.round((elapsed / 3000) * 100));
      const remaining = Math.max(0, Math.ceil((3000 - elapsed) / 1000));
      setHoldProgressPct(progress);
      setHoldSecondsRemaining(remaining);

      if (elapsed >= 3000) {
        if (holdIntervalRef.current) {
          clearInterval(holdIntervalRef.current);
          holdIntervalRef.current = null;
        }
        setIsHoldingSos(false);
        setHoldProgressPct(0);
        handleTriggerSosBroadcast();
      }
    }, 50);
  };

  const handleSosPressOut = () => {
    if (sosDelayMode === 'instant') return;

    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setIsHoldingSos(false);
    setHoldProgressPct(0);
    setHoldSecondsRemaining(3);
  };

  const handleVhfBroadcast = () => {
    const channelName =
      'Channel 04 • Sikkim SAR (156.800 MHz)';
    Alert.alert(
      'VHF Radio Simplex Relay Active',
      `Tuned to ${channelName}.\nTransceiver mode: High-power simplex (5W).\nMonitoring emergency distress hailing frequency.`
    );
  };

  const handleUpdateMaps = () => setIsOfflineSheetOpen(true);

  const languages: { code: LanguageCode; native: string; english: string }[] = [
    { code: 'en', native: 'English', english: 'English' },
    { code: 'hi', native: 'हिन्दी', english: 'Hindi' },
    { code: 'ne', native: 'नेपाली', english: 'Nepali' },
  ];

  // Only the signed-in user's own contacts. Nothing is pre-filled.
  const primaryContacts = (userProfile?.contacts ?? []) as (SosContact & { statusBadge?: string; statusType?: string })[];

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPadding, paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* Top Status Bar: Satellite Connected & Location */}
        <View style={styles.topStatusBarRow}>
          <View style={styles.satelliteStatusPill}>
            <View style={styles.greenPulseDot} />
            <Signal size={13} color="#10B981" />
            <Text style={styles.satelliteStatusText}>SATELLITE CONNECTED</Text>
          </View>

          <View style={styles.locationPill}>
            <MapPin size={13} color="#6B544F" />
            <Text style={styles.locationPillText}>
              {activeLake.primarySettlement.name} • {activeLake.primarySettlement.elevationM.toLocaleString()}m
            </Text>
          </View>
        </View>

        {/* Emergency SAR Dispatch Banner */}
        <View style={styles.sarReadyBanner}>
          <ShieldAlert size={15} color="#DC2626" strokeWidth={2.4} />
          <Text style={styles.sarReadyText}>
            EMERGENCY SAR DISPATCH READY • IRIDIUM BEACON ARMED
          </Text>
        </View>

        {/* Hero Big Red SOS Card */}
        <View style={styles.heroSosCard}>
          <View style={styles.heroSosHeader}>
            <View style={styles.heroSosIconWrapper}>
              <Radio size={20} color="#FFFFFF" strokeWidth={2.4} />
            </View>
            <View style={styles.heroSosTitleStack}>
              <Text style={styles.heroSosTitle}>BROADCAST SATELLITE SOS</Text>
              <Text style={styles.heroSosSubtitle}>
                {sosDelayMode === '3s_delay'
                  ? 'Hold 3 sec to alert Sikkim SAR & Kin'
                  : 'Tap to immediately alert Sikkim SAR & Kin'}
              </Text>
            </View>
          </View>

          {/* Big Circular Pressable SOS Trigger Button */}
          <View style={styles.sosTriggerContainer}>
            <View pointerEvents="none" style={styles.sosRingOuter} />
            <View pointerEvents="none" style={styles.sosRingInner} />
            <Pressable
              style={({ pressed }) => [
                styles.sosBigCircle,
                isHoldingSos && styles.sosBigCircleHolding,
                pressed && sosDelayMode === 'instant' && styles.pressed,
              ]}
              onPressIn={handleSosPressIn}
              onPressOut={handleSosPressOut}>
              <View style={styles.sosInnerRing}>
                <Radio size={36} color="#FFFFFF" strokeWidth={2.8} />
                <Text style={styles.sosCircleText}>
                  {isHoldingSos ? `${holdSecondsRemaining}s` : 'SOS'}
                </Text>
                <Text style={styles.sosSubPrompt}>
                  {isHoldingSos
                    ? 'HOLDING...'
                    : sosDelayMode === '3s_delay'
                    ? 'HOLD 3 SEC'
                    : 'TAP TO BROADCAST'}
                </Text>
              </View>
            </Pressable>

            {/* Hold Progress Bar (visible when holding) */}
            {isHoldingSos && (
              <View style={styles.holdProgressTrack}>
                <View
                  style={[
                    styles.holdProgressFill,
                    { width: `${holdProgressPct}%` },
                  ]}
                />
              </View>
            )}
          </View>

          {/* Accidental Press Guard Toggle Pill */}
          <View style={styles.guardToggleSection}>
            <Text style={styles.guardLabel}>Accidental Press Guard:</Text>
            <View style={styles.guardSegment}>
              <Pressable
                style={[
                  styles.guardSegmentButton,
                  sosDelayMode === 'instant' && styles.guardSegmentActive,
                ]}
                onPress={() => setSosDelayMode('instant')}>
                <Text
                  style={[
                    styles.guardSegmentText,
                    sosDelayMode === 'instant' && styles.guardSegmentTextActive,
                  ]}>
                  Instant
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.guardSegmentButton,
                  sosDelayMode === '3s_delay' && styles.guardSegmentActive,
                ]}
                onPress={() => setSosDelayMode('3s_delay')}>
                <Clock size={12} color={sosDelayMode === '3s_delay' ? '#FFFFFF' : '#7A625E'} />
                <Text
                  style={[
                    styles.guardSegmentText,
                    sosDelayMode === '3s_delay' && styles.guardSegmentTextActive,
                  ]}>
                  3s Delay
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Emergency VHF Radio Card */}
        <View style={styles.vhfRadioCard}>
          <View style={styles.vhfCardHeaderRow}>
            <View style={styles.vhfTitleRow}>
              <RadioReceiver size={18} color={Colors.moraineInk} strokeWidth={2.2} />
              <Text style={styles.vhfCardTitle}>
                CHANNEL 04 • SIKKIM SAR (156.800 MHZ)
              </Text>
            </View>
            <View style={styles.activeBandBadge}>
              <Text style={styles.activeBandText}>Active Band</Text>
            </View>
          </View>

          <Text style={styles.vhfCardDesc}>
            Simplex tactical voice frequency for local emergency rescue, helicopter dispatch, and safe haven wardens.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.vhfActionButton, pressed && styles.pressed]}
            onPress={handleVhfBroadcast}>
            <Mic size={15} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.vhfActionText}>
              Listen / Broadcast on VHF 156.800 MHz
            </Text>
          </Pressable>
        </View>

        {/* Emergency Kin Status Section */}
        <View style={styles.kinSection}>
          <View style={styles.kinSectionHeaderRow}>
            <View>
              <Text style={styles.kinSectionTitle}>Emergency Kin Status</Text>
              <Text style={styles.kinSectionSubtitle}>
                Automated satellite SMS broadcast to family upon moraine breach.
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.addKinButton, pressed && styles.pressed]}
              onPress={() => openAddContactModal(true)}>
              <UserPlus size={14} color="#D6453A" />
              <Text style={styles.addKinButtonText}>+ Add Kin</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push('/contacts' as any)}
            style={({ pressed }) => [styles.allContactsLink, pressed && styles.pressed]}
            accessibilityRole="link">
            <Text style={styles.allContactsText}>View all contacts</Text>
          </Pressable>

          {/* Kin Cards List */}
          <View style={styles.kinList}>
            {primaryContacts.map((contact, idx) => {
              const initials = contact.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('');
              const isSafe = (contact as any).statusType === 'safe';
              const isReady = (contact as any).statusType === 'ready';

              return (
                <View key={contact.contactId || idx} style={styles.kinCard}>
                  <View style={styles.kinAvatarCircle}>
                    <Text style={styles.kinAvatarText}>{initials}</Text>
                  </View>

                  <View style={styles.kinInfoStack}>
                    <View style={styles.kinNameRow}>
                      <Text style={styles.kinName}>{contact.name}</Text>
                      <View
                        style={[
                          styles.kinStatusBadge,
                          isSafe && styles.kinStatusBadgeSafe,
                          isReady && styles.kinStatusBadgeReady,
                        ]}>
                        <Text
                          style={[
                            styles.kinStatusText,
                            isSafe && styles.kinStatusTextSafe,
                            isReady && styles.kinStatusTextReady,
                          ]}>
                          {(contact as any).statusBadge || (contact.isActive ? '• Armed' : '• Inactive')}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.kinRelation}>{contact.relation}</Text>
                    <Text style={styles.kinPhone}>{contact.phone}</Text>
                  </View>

                  <Switch
                    value={contact.isActive}
                    onValueChange={() => toggleContact(contact.contactId)}
                    trackColor={{
                      false: '#F3D9D3',
                      true: '#10B981',
                    }}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* Regional Language Selection */}
        <View style={styles.settingsSectionCard}>
          <View style={styles.settingsCardHeader}>
            <View style={styles.settingsTitleRow}>
              <Languages size={18} color="#D6453A" />
              <Text style={styles.settingsTitle}>Language & Voice Alerts</Text>
            </View>
            <Text style={styles.settingsSubtitle}>Choose regional alert dialect</Text>
          </View>

          <View style={styles.languageTabsContainer}>
            {languages.map((item) => {
              const isActive = language === item.code;
              return (
                <Pressable
                  key={item.code}
                  style={[styles.langTab, isActive && styles.langTabActive]}
                  onPress={() => setLanguage(item.code)}>
                  <Text style={[styles.langNative, isActive && styles.langTextActive]}>
                    {item.native}
                  </Text>
                  <Text style={[styles.langEnglish, isActive && styles.langTextActive]}>
                    {item.english}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Offline Vector Basin Map Cache */}
        <View style={styles.settingsSectionCard}>
          <View style={styles.prefItem}>
            <View style={styles.prefItemLeft}>
              <View style={styles.prefIconBox}>
                <DownloadCloud size={18} color="#D6453A" />
              </View>
              <View>
                <Text style={styles.prefTitle}>Offline valley data</Text>
                <View style={styles.offlineMetaRow}>
                  <CheckCircle2 size={12} color={offline.status === 'ready' ? '#10B981' : '#7A625E'} />
                  <Text style={styles.offlineMetaText}>
                    {offline.status === 'ready' && offline.lastUpdated
                      ? `Saved ${new Date(offline.lastUpdated).toLocaleDateString()} • ${offline.sizeKb} KB`
                      : 'Not downloaded yet'}
                  </Text>
                </View>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.prefActionBtn, pressed && styles.pressed]}
              onPress={handleUpdateMaps}>
              <Text style={styles.prefActionBtnText}>
                {offline.status === 'ready' ? 'Update' : 'Download'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* User Profile Card */}
        <View style={styles.profileMetaCard}>
          <View style={styles.profileMetaHeader}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {userProfile?.name?.charAt(0)?.toUpperCase() || '–'}
              </Text>
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>
                {userProfile?.name || userProfile?.phone || ''}
              </Text>
              <Text style={styles.profileSub}>
                {[userProfile?.homeLocationName, userProfile?.phone].filter(Boolean).join(' • ')}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => signOut()}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
          accessibilityRole="button">
          <Text style={styles.signOutText}>{strings.profile.signOut}</Text>
        </Pressable>

        {__DEV__ && <BackendCheck />}

      </ScrollView>

      {/* Global Modals */}
      <AddEmergencyContactModal />
      <OfflineMapSheet visible={isOfflineSheetOpen} onClose={() => setIsOfflineSheetOpen(false)} />
      <EmergencySosModal />
    </View>
  );
}

const styles = StyleSheet.create({
  signOutButton: {
    minHeight: 52,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.coralDeep,
  },
  allContactsLink: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  allContactsText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.coralDeep,
    textDecorationLine: 'underline',
  },
  outerContainer: {
    flex: 1,
    backgroundColor: '#FDF3F0',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },

  // Top Status Bar
  topStatusBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  satelliteStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3D9D3',
    borderRadius: Radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  satelliteStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2A1B1A',
    letterSpacing: 0.5,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3D9D3',
    borderRadius: Radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    flexShrink: 1,
  },
  locationPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E4A47',
  },

  // SAR Banner
  sarReadyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  sarReadyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C1C',
    letterSpacing: 0.4,
    flex: 1,
  },

  // Hero SOS Card
  heroSosCard: {
    backgroundColor: Colors.coralDeep,
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    ...Shadows.card,
  },
  heroSosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  heroSosIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSosTitleStack: {
    flex: 1,
  },
  heroSosTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  heroSosSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },

  // Circular SOS Trigger
  sosTriggerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    minHeight: 208,
  },
  sosRingOuter: {
    position: 'absolute',
    width: 208,
    height: 208,
    borderRadius: 104,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sosRingInner: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  sosBigCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: Colors.coral,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  sosBigCircleHolding: {
    backgroundColor: '#7F1D1D',
    borderColor: '#FEF08A',
    transform: [{ scale: 1.05 }],
  },
  sosInnerRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosCircleText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginTop: 4,
  },
  sosSubPrompt: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  holdProgressTrack: {
    width: 140,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginTop: 12,
    overflow: 'hidden',
  },
  holdProgressFill: {
    height: '100%',
    backgroundColor: '#FEF08A',
  },

  // Guard Toggle Section
  guardToggleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 12,
    marginTop: 8,
  },
  guardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  guardSegment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: Radii.full,
    padding: 3,
  },
  guardSegmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  guardSegmentActive: {
    backgroundColor: '#FFFFFF',
  },
  guardSegmentText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  guardSegmentTextActive: {
    color: Colors.emergencyRed,
  },

  // VHF Card
  vhfRadioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3D9D3',
    padding: 16,
    marginBottom: 14,
    ...Shadows.card,
  },
  vhfCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  vhfTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  vhfCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A1B1A',
  },
  activeBandBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  activeBandText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  vhfCardDesc: {
    fontSize: 12,
    color: '#6B544F',
    lineHeight: 17,
    marginBottom: 12,
  },
  vhfActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2A1B1A',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  vhfActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Kin Section
  kinSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3D9D3',
    padding: 16,
    marginBottom: 14,
    ...Shadows.card,
  },
  kinSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  kinSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A1B1A',
  },
  kinSectionSubtitle: {
    fontSize: 11,
    color: '#6B544F',
    marginTop: 2,
  },
  addKinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEEAE6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  addKinButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D6453A',
  },
  kinList: {
    gap: 10,
  },
  kinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF3F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3D9D3',
    padding: 12,
    gap: 12,
  },
  kinAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2A1B1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kinAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  kinInfoStack: {
    flex: 1,
  },
  kinNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  kinName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A1B1A',
  },
  kinStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.full,
    backgroundColor: '#F3D9D3',
  },
  kinStatusBadgeSafe: {
    backgroundColor: '#DCFCE7',
  },
  kinStatusBadgeReady: {
    backgroundColor: '#FEF3C7',
  },
  kinStatusText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#5E4A47',
  },
  kinStatusTextSafe: {
    color: '#15803D',
  },
  kinStatusTextReady: {
    color: '#B45309',
  },
  kinRelation: {
    fontSize: 11,
    color: '#6B544F',
    marginTop: 1,
  },
  kinPhone: {
    fontSize: 11,
    color: '#7A625E',
    marginTop: 1,
  },

  // Settings
  settingsSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3D9D3',
    padding: 16,
    marginBottom: 14,
    ...Shadows.card,
  },
  settingsCardHeader: {
    marginBottom: 12,
  },
  settingsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A1B1A',
  },
  settingsSubtitle: {
    fontSize: 11,
    color: '#6B544F',
    marginTop: 2,
  },
  languageTabsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  langTab: {
    flex: 1,
    backgroundColor: '#FDF3F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3D9D3',
    paddingVertical: 10,
    alignItems: 'center',
  },
  langTabActive: {
    backgroundColor: '#FEEAE6',
    borderColor: '#D6453A',
  },
  langNative: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A1B1A',
  },
  langEnglish: {
    fontSize: 11,
    color: '#6B544F',
    marginTop: 2,
  },
  langTextActive: {
    color: '#D6453A',
  },

  prefItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prefItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  prefIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FEEAE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A1B1A',
  },
  offlineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  offlineMetaText: {
    fontSize: 11,
    color: '#6B544F',
  },
  prefActionBtn: {
    backgroundColor: '#FEEAE6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radii.sm,
  },
  prefActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2A1B1A',
  },

  // Profile Meta Card
  profileMetaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3D9D3',
    padding: 14,
    marginBottom: 14,
    ...Shadows.card,
  },
  profileMetaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A1B1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A1B1A',
  },
  profileSub: {
    fontSize: 11,
    color: '#6B544F',
    marginTop: 2,
  },

  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
