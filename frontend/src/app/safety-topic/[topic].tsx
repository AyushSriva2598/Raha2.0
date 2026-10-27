import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Colors, Radii, Typography } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { SAFETY_SCREEN_COPY, SAFETY_TOPICS } from '@/constants/safetyTips';

export default function SafetyTopicScreen() {
  const { topic: topicId } = useLocalSearchParams<{ topic: string }>();
  const insets = useSafeAreaInsets();
  const language = useAppStore((s) => s.language);
  const topic = SAFETY_TOPICS[language].find((t) => t.id === topicId);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 24) + 8, paddingBottom: insets.bottom + 40 },
        ]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <ArrowLeft size={22} color={Colors.ink} />
        </Pressable>

        {topic ? (
          <>
            <Text style={styles.title} accessibilityRole="header">
              {topic.title}
            </Text>
            <Text style={styles.summary}>{topic.summary}</Text>
            {topic.tips.map((tip, i) => (
              <View key={i} style={styles.tip}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{i + 1}</Text>
                </View>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
            <Text style={styles.draft}>{SAFETY_SCREEN_COPY[language].draftNotice}</Text>
          </>
        ) : (
          <Text style={styles.summary}>{SAFETY_SCREEN_COPY[language].noResults}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: 20, gap: 14 },
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
  title: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.hero,
    color: Colors.ink,
    marginTop: 8,
  },
  summary: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.body,
    lineHeight: 23,
    color: Colors.text2,
  },
  tip: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: Radii.card, borderCurve: 'continuous',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: Typography.family.bold, fontSize: 15, color: Colors.onCoral },
  tipText: {
    flex: 1,
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.bodyLarge,
    lineHeight: 24,
    color: Colors.ink,
  },
  draft: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.text3,
    textAlign: 'center',
    marginTop: 8,
  },
});
