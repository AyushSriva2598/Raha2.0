import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle, Mountain } from 'lucide-react-native';
import { Colors, Radii, Shadows, Typography } from '@/constants/theme';
import { Pill } from '@/components/common/Pill';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { useAppStore } from '@/store/useAppStore';
import { apiClient } from '@/services/api';
import { AuthError, type AuthErrorKind, useAuthStore } from '@/services/authStore';
import type { LanguageCode } from '@/i18n/translations';

const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ne', label: 'नेपाली' },
];
const COUNTRIES = [
  { id: 'IN', dial: '+91', name: 'india' },
  { id: 'NP', dial: '+977', name: 'nepal' },
] as const;
const CODE_LENGTH = 6;

const ERROR_KEY: Record<AuthErrorKind, 'errNetwork' | 'errPhone' | 'errWrong' | 'errExpired' | 'errLocked' | 'errWait' | 'errLimit' | 'errSms' | 'errGeneric'> = {
  network: 'errNetwork',
  invalidPhone: 'errPhone',
  wrong: 'errWrong',
  expired: 'errExpired',
  locked: 'errLocked',
  wait: 'errWait',
  limit: 'errLimit',
  sms: 'errSms',
  generic: 'errGeneric',
};

export default function LoginScreen() {
  const { language, setLanguage, t } = useAppStore();
  const { requestCode, verifyCode } = useAuthStore();
  const s = t().auth;

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]>(COUNTRIES[0]);
  const [number, setNumber] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorKind | null>(null);
  const [resendLeft, setResendLeft] = useState(0);
  const [debugCode, setDebugCode] = useState<string | undefined>();
  const codeInput = useRef<TextInput>(null);

  const digits = number.replace(/\D/g, '').replace(/^0+/, '');
  const fullPhone = `${country.dial}${digits}`;
  const phoneValid = digits.length >= 7 && digits.length <= 12;

  // Count down until a new code may be requested.
  useEffect(() => {
    if (resendLeft <= 0) return;
    const timer = setTimeout(() => setResendLeft((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendLeft]);

  const send = useCallback(async () => {
    if (!phoneValid || busy) {
      if (!phoneValid) setError('invalidPhone');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const sent = await requestCode(fullPhone);
      setDebugCode(sent.debugCode);
      setResendLeft(sent.resendAfterSec);
      setCode('');
      setStep('code');
    } catch (e) {
      if (e instanceof AuthError && e.kind === 'wait' && step === 'code') setResendLeft(e.retryAfterSec ?? 30);
      setError(e instanceof AuthError ? e.kind : 'generic');
    } finally {
      setBusy(false);
    }
  }, [phoneValid, busy, requestCode, fullPhone, step]);

  const verify = useCallback(
    async (value: string) => {
      if (busy || value.length !== CODE_LENGTH) return;
      setBusy(true);
      setError(null);
      try {
        const { isNewUser } = await verifyCode(fullPhone, value);
        // A first-time user keeps the language they chose on this screen.
        if (isNewUser) apiClient.updateUserProfile({ language }).catch(() => {});
      } catch (e) {
        setError(e instanceof AuthError ? e.kind : 'generic');
        setCode('');
        codeInput.current?.focus();
      } finally {
        setBusy(false);
      }
    },
    [busy, verifyCode, fullPhone, language]
  );

  const onCodeChange = (text: string) => {
    const next = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(next);
    if (error) setError(null);
    if (next.length === CODE_LENGTH) verify(next);
  };

  const errorText = error ? s[ERROR_KEY[error]] : null;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Language first: people choose the language they can read before anything else */}
          <View style={styles.langRow} accessibilityRole="radiogroup" accessibilityLabel={s.languageLabel}>
            {LANGUAGES.map((l) => (
              <Pill key={l.code} label={l.label} variant="coral" size="md" selected={language === l.code} onPress={() => setLanguage(l.code)} />
            ))}
          </View>

          <View style={styles.brand}>
            <View style={styles.mark}>
              <Mountain size={34} color={Colors.onCoral} strokeWidth={2.2} />
            </View>
            <Text style={styles.title} accessibilityRole="header">
              {step === 'phone' ? s.title : s.codeTitle}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'phone' ? s.subtitle : `${s.codeSentTo} ${country.dial} ${digits}`}
            </Text>
          </View>

          {step === 'phone' ? (
            <View style={styles.form}>
              <Text style={styles.label}>{s.countryLabel}</Text>
              <View style={styles.countryRow}>
                {COUNTRIES.map((c) => (
                  <Pill
                    key={c.id}
                    label={`${s[c.name]} ${c.dial}`}
                    variant="coral"
                    size="lg"
                    selected={country.id === c.id}
                    onPress={() => setCountry(c)}
                  />
                ))}
              </View>

              <Text style={[styles.label, styles.labelGap]}>{s.phoneLabel}</Text>
              <View style={[styles.inputRow, error && styles.inputError]}>
                <Text style={styles.dial}>{country.dial}</Text>
                <TextInput
                  value={number}
                  onChangeText={(v) => {
                    setNumber(v.replace(/[^\d\s]/g, ''));
                    if (error) setError(null);
                  }}
                  style={styles.input}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  maxLength={16}
                  placeholder={s.phoneLabel}
                  placeholderTextColor={Colors.text3}
                  accessibilityLabel={s.phoneLabel}
                  returnKeyType="done"
                  onSubmitEditing={send}
                />
              </View>
              <Text style={styles.note}>{s.smsNote}</Text>
            </View>
          ) : (
            <View style={styles.form}>
              <Pressable onPress={() => codeInput.current?.focus()} style={styles.boxes} accessibilityLabel={s.codeTitle}>
                {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                  const active = i === Math.min(code.length, CODE_LENGTH - 1);
                  return (
                    <View key={i} style={[styles.box, active && styles.boxActive, error && styles.inputError]}>
                      <Text style={styles.boxText}>{code[i] ?? ''}</Text>
                    </View>
                  );
                })}
                <TextInput
                  ref={codeInput}
                  value={code}
                  onChangeText={onCodeChange}
                  style={styles.hiddenInput}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  maxLength={CODE_LENGTH}
                  autoFocus
                  caretHidden
                  accessibilityLabel={s.codeTitle}
                />
              </Pressable>

              {debugCode ? (
                <Pressable onPress={() => onCodeChange(debugCode)} style={styles.devChip} accessibilityRole="button">
                  <Text style={styles.devText}>
                    {s.devCode}: {debugCode}
                  </Text>
                </Pressable>
              ) : null}

              <View style={styles.links}>
                {resendLeft > 0 ? (
                  <Text style={styles.muted}>
                    {s.resendIn} {resendLeft}
                  </Text>
                ) : (
                  <Pressable onPress={send} disabled={busy} style={styles.link} accessibilityRole="button">
                    <Text style={styles.linkText}>{s.resend}</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => {
                    setStep('phone');
                    setError(null);
                    setCode('');
                  }}
                  style={styles.link}
                  accessibilityRole="button">
                  <Text style={styles.linkText}>{s.changeNumber}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {errorText ? (
            <View style={styles.errorRow} accessibilityLiveRegion="polite">
              <AlertCircle size={18} color={Colors.dangerDark} />
              <Text style={styles.errorText}>{errorText}</Text>
            </View>
          ) : null}

          {step === 'phone' ? (
            <PrimaryButton
              title={busy ? s.sending : s.sendCode}
              onPress={send}
              loading={busy}
              disabled={!phoneValid || busy}
              height={56}
              style={styles.cta}
            />
          ) : (
            <PrimaryButton
              title={busy ? s.verifying : s.verify}
              onPress={() => verify(code)}
              loading={busy}
              disabled={code.length !== CODE_LENGTH || busy}
              height={56}
              style={styles.cta}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 32, gap: 20 },
  langRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  brand: { alignItems: 'center', gap: 10, marginTop: 8 },
  mark: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.coral, alignItems: 'center', justifyContent: 'center', ...Shadows.card },
  title: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.hero, color: Colors.ink, textAlign: 'center' },
  subtitle: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.body, lineHeight: 23, color: Colors.text2, textAlign: 'center', maxWidth: 320 },
  form: { gap: 8 },
  label: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.meta, color: Colors.ink },
  labelGap: { marginTop: 14 },
  countryRow: { flexDirection: 'row', gap: 10 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    borderRadius: Radii.card,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    gap: 12,
  },
  inputError: { borderColor: Colors.dangerDark },
  dial: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.bodyLarge, color: Colors.ink },
  input: { flex: 1, fontFamily: Typography.family.regular, fontSize: Typography.sizes.bodyLarge, color: Colors.ink, paddingVertical: 12 },
  note: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, lineHeight: 20, color: Colors.text2 },
  boxes: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: {
    flex: 1,
    height: 64,
    borderRadius: Radii.tile,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: Colors.coral, borderWidth: 2 },
  boxText: { fontFamily: Typography.family.bold, fontSize: 28, color: Colors.ink },
  hiddenInput: { position: 'absolute', opacity: 0, width: '100%', height: '100%' },
  devChip: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: Radii.pill, borderWidth: 1.5, borderColor: Colors.coral, borderStyle: 'dashed' },
  devText: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.meta, color: Colors.coralDeep },
  links: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.body, color: Colors.coralDeep, textDecorationLine: 'underline' },
  muted: { fontVariant: ['tabular-nums'], fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, color: Colors.text2 },
  errorRow: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: Radii.tile, backgroundColor: Colors.dangerTint },
  errorText: { flex: 1, fontFamily: Typography.family.bold, fontSize: Typography.sizes.meta, lineHeight: 20, color: Colors.dangerDark },
  cta: { marginTop: 'auto' },
});
