import { useShallow } from 'zustand/react/shallow';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radii, Shadows, Spacing } from '@/constants/tokens';
import { useAppStore } from '@/store/useAppStore';
import { router } from 'expo-router';
import {
  Compass,
  Phone,
  ShieldCheck,
  MapPin,
  Users,
  Bell,
  ArrowRight,
  Check,
} from 'lucide-react-native';

export default function OnboardingScreen() {
  const { setLanguage, language } = useAppStore(useShallow((s) => ({ setLanguage: s.setLanguage, language: s.language })));
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('+977 9841-582910');
  const otp = ['4', '8', '2', '0', '1', '9'];
  const selectedZone = 'Chungthang, North Sikkim (1,790m)';

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Progress Step Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Compass size={22} color={Colors.meltwater} />
            <Text style={styles.brandTitle}>Avalon</Text>
          </View>
          <View style={styles.stepIndicator}>
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.stepDot,
                  step >= i && styles.stepDotActive,
                  step === i && styles.stepDotCurrent,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Step 1: Phone & OTP Sign-In */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepHeading}>High-Altitude Resident Sign-In</Text>
            <Text style={styles.stepSub}>
              Enter your mobile number to get alerts about glacial lake floods.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mobile / Terminal Number</Text>
              <View style={styles.phoneInputRow}>
                <Phone size={18} color={Colors.slateFog} />
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Verification OTP Code</Text>
              <View style={styles.otpBoxesRow}>
                {otp.map((digit, idx) => (
                  <View key={idx} style={styles.otpBox}>
                    <Text style={styles.otpDigit}>{digit}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.otpHelper}>
                Auto-synced with low-bandwidth SMS network
              </Text>
            </View>
          </View>
        )}

        {/* Step 2: Language & Region Selection */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepHeading}>Preferred Broadcast Language</Text>
            <Text style={styles.stepSub}>
              Urgent life-safety evacuation alerts will be transmitted in your selected language.
            </Text>

            <View style={styles.languagesColumn}>
              {[
                { code: 'en', name: 'English', sub: 'Standard International' },
                { code: 'hi', name: 'हिन्दी (Hindi)', sub: 'उत्तर भारत एवं सीमावर्ती' },
                { code: 'ne', name: 'नेपाली (Nepali)', sub: 'उत्तर सिक्किम र तिस्ता उपत्यका' },
              ].map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <Pressable
                    key={lang.code}
                    style={[
                      styles.langOptionCard,
                      isSelected && styles.langOptionCardSelected,
                    ]}
                    onPress={() => setLanguage(lang.code as any)}>
                    <View>
                      <Text
                        style={[
                          styles.langOptionTitle,
                          isSelected && styles.langOptionTitleSelected,
                        ]}>
                        {lang.name}
                      </Text>
                      <Text style={styles.langOptionSub}>{lang.sub}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkCircle}>
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Step 3: Home Basin Location Confirmation */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepHeading}>Confirm Home Valley Zone</Text>
            <Text style={styles.stepSub}>
              Coarse zone pairing allows the early warning pipeline to compute flood wave travel arrival times.
            </Text>

            <View style={styles.zoneSelectionCard}>
              <MapPin size={24} color={Colors.cirqueTeal} />
              <View style={styles.zoneTextStack}>
                <Text style={styles.zoneTitle}>{selectedZone}</Text>
                <Text style={styles.zoneSub}>
                  Teesta River Basin • downstream of South Lhonak Lake
                </Text>
              </View>
            </View>

            <View style={styles.privacyCallout}>
              <ShieldCheck size={16} color={Colors.cirqueTeal} />
              <Text style={styles.privacyCalloutText}>
                Privacy first: Precise location is never stored permanently. Compliant with DPDP Act 2023.
              </Text>
            </View>
          </View>
        )}

        {/* Step 4: Permissions & SOS Kin Setup */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepHeading}>Emergency Permissions</Text>
            <Text style={styles.stepSub}>
              Avalon requires push alerts and location access to deliver evacuation orders during flash flood threats.
            </Text>

            <View style={styles.permissionCard}>
              <View style={styles.permissionIconBox}>
                <Bell size={20} color={Colors.warning} />
              </View>
              <View style={styles.permissionTextStack}>
                <Text style={styles.permissionTitle}>Critical Hazard Push Alerts</Text>
                <Text style={styles.permissionSub}>
                  Bypasses Do Not Disturb mode during Evacuate status.
                </Text>
              </View>
              <View style={styles.checkPill}>
                <Text style={styles.checkPillText}>Granted</Text>
              </View>
            </View>

            <View style={styles.permissionCard}>
              <View style={styles.permissionIconBox}>
                <Users size={20} color={Colors.cirqueTeal} />
              </View>
              <View style={styles.permissionTextStack}>
                <Text style={styles.permissionTitle}>SOS Kin Dispatch</Text>
                <Text style={styles.permissionSub}>
                  2 Emergency Contacts linked (Pema Bhutia, Sonam Lepcha).
                </Text>
              </View>
              <View style={styles.checkPill}>
                <Text style={styles.checkPillText}>Active</Text>
              </View>
            </View>
          </View>
        )}

        {/* Bottom CTA Button */}
        <View style={styles.bottomCta}>
          <Pressable
            style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
            onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {step === 4 ? 'Enter Glacial Monitor' : 'Continue'}
            </Text>
            <ArrowRight size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Colors.firn,
  },
  scrollContent: {
    padding: Spacing.marginMobile,
    paddingBottom: 40,
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.moraineInk,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderSubtle,
  },
  stepDotActive: {
    backgroundColor: Colors.meltwater,
  },
  stepDotCurrent: {
    width: 20,
    backgroundColor: Colors.meltwater,
  },
  stepContainer: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  stepHeading: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.moraineInk,
    lineHeight: 32,
  },
  stepSub: {
    fontSize: 14,
    color: Colors.slateFog,
    lineHeight: 20,
  },
  inputGroup: {
    gap: 8,
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.moraineInk,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.glacierMist,
    borderRadius: Radii.pill,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  phoneInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.moraineInk,
    fontWeight: '600',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  otpBox: {
    flex: 1,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.moraineInk,
  },
  otpHelper: {
    fontSize: 11,
    color: Colors.slateFog,
    marginTop: 4,
  },
  languagesColumn: {
    gap: 10,
    marginTop: 8,
  },
  langOptionCard: {
    backgroundColor: Colors.glacierMist,
    padding: Spacing.lg,
    borderRadius: Radii.card, borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: Colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langOptionCardSelected: {
    backgroundColor: '#FEEAE6',
    borderColor: Colors.meltwater,
  },
  langOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.moraineInk,
  },
  langOptionTitleSelected: {
    fontWeight: '700',
    color: Colors.meltwater,
  },
  langOptionSub: {
    fontSize: 12,
    color: Colors.slateFog,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.meltwater,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneSelectionCard: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.lg,
    borderRadius: Radii.card, borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: Colors.cirqueTeal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
    ...Shadows.subtle,
  },
  zoneTextStack: {
    flex: 1,
  },
  zoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.moraineInk,
  },
  zoneSub: {
    fontSize: 12,
    color: Colors.slateFog,
    marginTop: 2,
    lineHeight: 16,
  },
  privacyCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(18, 165, 155, 0.08)',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(18, 165, 155, 0.2)',
  },
  privacyCalloutText: {
    flex: 1,
    fontSize: 11,
    color: Colors.moraineInk,
    lineHeight: 15,
  },
  permissionCard: {
    backgroundColor: Colors.glacierMist,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  permissionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTextStack: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.moraineInk,
  },
  permissionSub: {
    fontSize: 11,
    color: Colors.slateFog,
    marginTop: 1,
  },
  checkPill: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  checkPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.meltwater,
  },
  bottomCta: {
    marginTop: Spacing.xxl,
  },
  nextButton: {
    height: 56,
    backgroundColor: Colors.meltwater,
    borderRadius: Radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadows.card,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.995 }],
  },
});
