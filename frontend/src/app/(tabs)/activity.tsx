import { useShallow } from 'zustand/react/shallow';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { CloudRain, Activity as Pulse, Newspaper, ChevronDown, ExternalLink, WifiOff } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { Pill } from '@/components/common/Pill';
import { useFeedStore, formatAgo } from '@/services/feedStore';
import { Skeleton, useDelayedFlag } from '@/components/common/Skeleton';
import { useRevalidate } from '@/hooks/use-revalidate';
import type { FeedCategory, FeedItem } from '@/types';

type Filter = 'all' | FeedCategory;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'weather', label: 'Weather' },
  { id: 'quake', label: 'Quakes' },
  { id: 'news', label: 'News' },
];

const CATEGORY_META = {
  weather: { Icon: CloudRain, color: Colors.you, bg: '#E8EEF9', label: 'Weather' },
  quake: { Icon: Pulse, color: Colors.watchTextAlt, bg: '#FFF3D6', label: 'Earthquake' },
  news: { Icon: Newspaper, color: Colors.coralDeep, bg: Colors.coralSoft, label: 'News' },
} as const;

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(d)) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'This week';
  return 'Earlier';
}

// With no item it draws the same card as gray blocks, so the list does not jump when data arrives.
function FeedCard({ item, expanded, onToggle }: { item: FeedItem | null; expanded: boolean; onToggle: () => void }) {
  if (!item) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Skeleton width={40} height={40} radius={20} />
          <View style={styles.cardText}>
            <Skeleton height={16} width="92%" />
            <Skeleton height={16} width="64%" />
            <Skeleton height={12} width="40%" />
          </View>
        </View>
      </View>
    );
  }
  const meta = CATEGORY_META[item.category];
  const Icon = meta.Icon;
  return (
    <View style={styles.card}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.cardHeader, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={item.title}>
        <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
          <Icon size={20} color={meta.color} strokeWidth={2.2} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.title} numberOfLines={expanded ? undefined : 3}>
            {item.title}
          </Text>
          <Text style={styles.metaLine} numberOfLines={1}>
            {item.source.name.split(' (')[0]} • {formatAgo(item.publishedAt)}
          </Text>
          {!expanded && item.summary ? (
            <Text style={styles.summary} numberOfLines={2}>
              {item.summary}
            </Text>
          ) : null}
        </View>
        <ChevronDown
          size={20}
          color={Colors.text3}
          style={expanded ? styles.chevronOpen : undefined}
        />
      </Pressable>

      {expanded && (
        <View style={styles.article}>
          {item.body.map((p, i) => (
            <Text key={i} style={styles.paragraph}>
              {p}
            </Text>
          ))}

          {item.facts && item.facts.length > 0 && (
            <View style={styles.facts}>
              {item.facts.map((f) => (
                <View key={f.label} style={styles.factRow}>
                  <Text style={styles.factLabel}>{f.label}</Text>
                  <Text style={styles.factValue}>{f.value}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.citation}>
            <Text style={styles.citationHeading}>Source</Text>
            <Text style={styles.citationText}>{item.source.name}</Text>
            <Text style={styles.citationMeta}>
              {meta.label} • published {new Date(item.publishedAt).toLocaleString()} • retrieved{' '}
              {new Date(item.retrievedAt).toLocaleString()}
            </Text>
            <Pressable
              onPress={() => WebBrowser.openBrowserAsync(item.source.url).catch(() => {})}
              style={({ pressed }) => [styles.sourceButton, pressed && styles.pressed]}
              accessibilityRole="link"
              accessibilityLabel={`Open source: ${item.source.name}`}>
              <ExternalLink size={16} color={Colors.coralDeep} />
              <Text style={styles.sourceButtonText}>Open source</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export default function ActivityScreen() {
  const { items, status, generatedAt, sources, hydrate, refresh } = useFeedStore(useShallow((s) => ({ items: s.items, status: s.status, generatedAt: s.generatedAt, sources: s.sources, hydrate: s.hydrate, refresh: s.refresh })));
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    hydrate().then(() => refresh());
  }, [hydrate, refresh]);

  useRevalidate(() => void refresh(), status === 'offline');

  const showSkeleton = useDelayedFlag(status === 'loading' && items.length === 0);

  const onRefresh = useCallback(() => refresh(true), [refresh]);

  const groups = useMemo(() => {
    const visible = items.filter((i) => filter === 'all' || i.category === filter);
    const map = new Map<string, FeedItem[]>();
    for (const it of visible) {
      const key = dayLabel(it.publishedAt);
      map.set(key, [...(map.get(key) ?? []), it]);
    }
    return [...map.entries()];
  }, [items, filter]);

  const failed = sources.filter((s) => !s.ok);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header" textBreakStrategy="balanced">
          Activity
        </Text>
        <Text style={styles.headerSub}>
          Live public data for North Sikkim. Weather, earthquakes and news, each with its source.
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pill
            key={f.id}
            label={f.label}
            variant="coral"
            size="md"
            selected={filter === f.id}
            onPress={() => setFilter(f.id)}
          />
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={status === 'loading'} onRefresh={onRefresh} tintColor={Colors.coral} />}>
        {status === 'offline' && (
          <View style={styles.banner}>
            <WifiOff size={16} color={Colors.text2} />
            <Text style={styles.bannerText}>
              Can&apos;t reach the server.{' '}
              {generatedAt ? `Showing saved items from ${new Date(generatedAt).toLocaleString()}.` : 'Nothing saved yet.'}
            </Text>
          </View>
        )}
        {status === 'ok' && generatedAt && (
          <Text style={styles.updated}>Updated {formatAgo(generatedAt)}. Pull down to refresh.</Text>
        )}
        {failed.length > 0 && status === 'ok' && (
          <Text style={styles.updated}>Unavailable right now: {failed.map((s) => s.name).join(', ')}.</Text>
        )}

        {groups.map(([label, list]) => (
          <View key={label} style={styles.section}>
            <Text style={styles.sectionHeader}>{label}</Text>
            {list.map((item) => (
              <FeedCard
                key={item.id}
                item={item}
                expanded={openId === item.id}
                onToggle={() => setOpenId(openId === item.id ? null : item.id)}
              />
            ))}
          </View>
        ))}

        {showSkeleton && (
          <View style={styles.section} accessibilityLabel="Loading updates">
            {[0, 1, 2, 3].map((i) => (
              <FeedCard key={i} item={null} expanded={false} onToggle={() => {}} />
            ))}
          </View>
        )}

        {groups.length === 0 && status !== 'loading' && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nothing to show for this filter yet.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: Spacing.sidePadding, paddingTop: 12, paddingBottom: 4, gap: 4 },
  headerTitle: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.hero, color: Colors.ink },
  headerSub: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, lineHeight: 20, color: Colors.text2 },
  filterRow: { paddingHorizontal: Spacing.sidePadding, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  listContent: { paddingHorizontal: Spacing.sidePadding, paddingTop: 4, paddingBottom: 120 },
  banner: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    padding: 12,
    borderRadius: Radii.tile, borderCurve: 'continuous',
    backgroundColor: Colors.coralTint,
    marginBottom: 12,
  },
  bannerText: { flex: 1, fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, color: Colors.text2 },
  updated: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.caption, color: Colors.text3, marginBottom: 8 },
  section: { marginBottom: 12 },
  sectionHeader: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.caption,
    color: Colors.text3,
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card, borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    ...Shadows.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  pressed: { opacity: 0.8 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, gap: 4 },
  title: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.bodyLarge, lineHeight: 23, color: Colors.ink },
  metaLine: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.caption, color: Colors.text3 },
  summary: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, lineHeight: 20, color: Colors.text2 },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  article: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  paragraph: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.body, lineHeight: 25, color: Colors.ink },
  facts: { borderRadius: Radii.tile, borderCurve: 'continuous', backgroundColor: Colors.bg, padding: 12, gap: 6 },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  factLabel: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, color: Colors.text2 },
  factValue: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.meta, color: Colors.ink },
  citation: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, gap: 4 },
  citationHeading: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.caption,
    color: Colors.text3,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  citationText: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.meta, color: Colors.ink },
  citationMeta: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.caption, lineHeight: 18, color: Colors.text3 },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  sourceButtonText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.body,
    color: Colors.coralDeep,
    textDecorationLine: 'underline',
  },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.body, color: Colors.text2 },
});
