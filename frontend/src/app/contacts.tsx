import { useShallow } from 'zustand/react/shallow';
import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Phone, Trash2 } from 'lucide-react-native';
import { Colors, Radii, Typography } from '@/constants/theme';
import { SearchField } from '@/components/common/SearchField';
import { Pill } from '@/components/common/Pill';
import { HeroCard } from '@/components/common/HeroCard';
import { AddEmergencyContactModal } from '@/components/add-contact-modal';
import { useAppStore } from '@/store/useAppStore';

type Tab = 'book' | 'helpline';

const initialsOf = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const { userProfile, toggleContact, removeContact, openAddContactModal } = useAppStore(useShallow((s) => ({ userProfile: s.userProfile, toggleContact: s.toggleContact, removeContact: s.removeContact, openAddContactModal: s.openAddContactModal })));
  const [tab, setTab] = useState<Tab>('book');
  const [query, setQuery] = useState('');

  const alertCount = (userProfile?.contacts ?? []).filter((c) => c.isActive).length;

  const contacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = userProfile?.contacts ?? [];
    return q
      ? all.filter((c) => c.name.toLowerCase().includes(q) || c.relation.toLowerCase().includes(q))
      : all;
  }, [userProfile, query]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 24) + 8, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <ArrowLeft size={22} color={Colors.ink} />
          </Pressable>
          <Text style={styles.title} accessibilityRole="header" textBreakStrategy="balanced">
            Contacts
          </Text>
        </View>

        <HeroCard
          eyebrow="SOS CONTACTS"
          title="Your emergency circle"
          subtitle={
            alertCount === 0
              ? 'Nobody will get your SOS yet. Add someone you trust.'
              : `${alertCount} ${alertCount === 1 ? 'person gets' : 'people get'} a text when you press SOS.`
          }
          actionLabel="Add contact"
          onAction={() => openAddContactModal(true)}
        />

        <SearchField value={query} onChangeText={setQuery} placeholder="Search contacts" />

        <View style={styles.tabs}>
          <Pill label="Phone book" variant="coral" size="lg" selected={tab === 'book'} onPress={() => setTab('book')} />
          <Pill label="Helpline" variant="coral" size="lg" selected={tab === 'helpline'} onPress={() => setTab('helpline')} />
        </View>

        {tab === 'book' ? (
          <>
            {contacts.length === 0 && (
              <Text style={styles.empty}>
                {query ? 'No contacts match your search.' : 'No emergency contacts yet. Add someone who should be alerted.'}
              </Text>
            )}
            {contacts.map((c) => (
              <View key={c.contactId} style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initialsOf(c.name)}</Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.name}>{c.name}</Text>
                  <Text style={styles.meta}>
                    {c.relation} • {c.phone}
                  </Text>
                  <View style={styles.alertRow}>
                    <Switch
                      value={c.isActive}
                      onValueChange={() => toggleContact(c.contactId)}
                      trackColor={{ false: Colors.border, true: Colors.coral }}
                      thumbColor="#FFFFFF"
                      accessibilityLabel={`Alert ${c.name} on SOS`}
                    />
                    <Text style={styles.meta}>{c.isActive ? 'Gets SOS alerts' : 'Alerts off'}</Text>
                    <Pressable
                      onPress={() => removeContact(c.contactId)}
                      style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${c.name}`}>
                      <Trash2 size={18} color={Colors.text2} />
                    </Pressable>
                  </View>
                </View>
                <Pressable
                  onPress={() => Linking.openURL(`tel:${c.phone.replace(/\s/g, '')}`)}
                  style={({ pressed }) => [styles.call, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${c.name}`}>
                  <Phone size={20} color={Colors.onCoral} />
                </Pressable>
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.empty}>
            No helpline numbers have been verified for your valley yet. Add the numbers you trust to your phone book.
          </Text>
        )}
      </ScrollView>
      <AddEmergencyContactModal />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: 20, gap: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  back: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.hero, color: Colors.ink },
  tabs: { flexDirection: 'row', gap: 10 },
  empty: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.body,
    lineHeight: 23,
    color: Colors.text2,
    paddingVertical: 20,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: Radii.card, borderCurve: 'continuous',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.coralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: Typography.family.bold, fontSize: 16, color: Colors.coralDeep },
  rowText: { flex: 1, gap: 2 },
  name: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.bodyLarge, color: Colors.ink },
  meta: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, color: Colors.text2 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  remove: { width: 48, height: 48, marginLeft: 'auto', alignItems: 'center', justifyContent: 'center' },
  call: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
});
