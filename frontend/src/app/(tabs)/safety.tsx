import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, HandHeart, HeartPulse, LifeBuoy, Waves } from 'lucide-react-native';
import { Colors, Radii, Shadows, Typography } from '@/constants/theme';
import { SearchField } from '@/components/common/SearchField';
import { useAppStore } from '@/store/useAppStore';
import {
  SAFETY_SCREEN_COPY,
  SAFETY_TOPICS,
  type SafetyTopicId,
} from '@/constants/safetyTips';

const TOPIC_ICONS = {
  prepare: Waves,
  firstAid: HeartPulse,
  rescue: LifeBuoy,
  help: HandHeart,
} as const;

export default function SafetyScreen() {
  const insets = useSafeAreaInsets();
  const language = useAppStore((s) => s.language);
  const [query, setQuery] = useState('');
  const copy = SAFETY_SCREEN_COPY[language];

  const topics = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = SAFETY_TOPICS[language];
    if (!q) return all;
    return all.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.tips.some((tip) => tip.toLowerCase().includes(q))
    );
  }, [query, language]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 24) + 8 }]}
        keyboardShouldPersistTaps="handled">
        <SearchField value={query} onChangeText={setQuery} placeholder={copy.searchPlaceholder} />

        <Text style={styles.title} accessibilityRole="header">
          {copy.title}
        </Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>

        {topics.length === 0 && <Text style={styles.empty}>{copy.noResults}</Text>}

        {topics.map((topic) => {
          const Icon = TOPIC_ICONS[topic.id as SafetyTopicId];
          return (
            <Pressable
              key={topic.id}
              onPress={() => router.push({ pathname: '/safety-topic/[topic]', params: { topic: topic.id } })}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${topic.title}. ${topic.summary}`}>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{topic.title}</Text>
                <Text style={styles.cardSummary}>{topic.summary}</Text>
              </View>
              <View style={styles.iconWrap}>
                <Icon size={30} color={Colors.coralDeep} strokeWidth={2} />
              </View>
              <ChevronRight size={20} color={Colors.coralDeep} />
            </Pressable>
          );
        })}

        <Text style={styles.draft}>{copy.draftNotice}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 120, gap: 14 },
  title: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.hero,
    color: Colors.ink,
    marginTop: 12,
  },
  subtitle: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.body,
    lineHeight: 23,
    color: Colors.text2,
    marginBottom: 4,
  },
  empty: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.body,
    color: Colors.text2,
    paddingVertical: 24,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 104,
    padding: 18,
    borderRadius: Radii.cardLarge, borderCurve: 'continuous',
    backgroundColor: Colors.coralSoft,
    ...Shadows.card,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  cardText: { flex: 1, gap: 6 },
  cardTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.title,
    color: Colors.ink,
  },
  cardSummary: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.meta,
    lineHeight: 20,
    color: Colors.text2,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draft: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.text3,
    textAlign: 'center',
    marginTop: 8,
  },
});
