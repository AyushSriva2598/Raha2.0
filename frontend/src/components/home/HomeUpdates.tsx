import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { CloudRain, ChevronRight } from 'lucide-react-native';
import { Colors, Typography, Radii } from '@/constants/theme';
import { useFeedStore, formatAgo } from '@/services/feedStore';

// Real conditions and latest public updates for the area, linked to the Activity articles.
export function HomeUpdates() {
  const { items, status, hydrate, refresh } = useFeedStore();

  useEffect(() => {
    hydrate().then(() => refresh());
  }, [hydrate, refresh]);

  const weather = items.find((i) => i.id === 'weather-chungthang');
  const news = items.filter((i) => i.category !== 'weather').slice(0, 3);
  const fact = (label: string) => weather?.facts?.find((f) => f.label === label)?.value;

  return (
    <View style={styles.wrap}>
      {weather ? (
        <Pressable
          onPress={() => router.push('/activity' as any)}
          style={({ pressed }) => [styles.weatherCard, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Open weather details in Activity">
          <CloudRain size={22} color={Colors.you} />
          <View style={styles.weatherText}>
            <Text style={styles.weatherTitle}>Conditions near Chungthang</Text>
            <Text style={styles.weatherMeta}>
              {fact('Temperature')} • rain next 24 h {fact('Rain, next 24 h')} • {formatAgo(weather.publishedAt)}
            </Text>
          </View>
          <ChevronRight size={18} color={Colors.text3} />
        </Pressable>
      ) : (
        <Text style={styles.muted}>
          {status === 'loading' ? 'Loading live conditions…' : 'Live conditions unavailable. Check your connection.'}
        </Text>
      )}

      {news.length > 0 && (
        <View style={styles.list}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Latest updates</Text>
            <Pressable onPress={() => router.push('/activity' as any)} accessibilityRole="link" style={styles.seeAll}>
              <Text style={styles.seeAllText}>See all</Text>
            </Pressable>
          </View>
          {news.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => router.push('/activity' as any)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              accessibilityRole="button">
              <Text style={styles.rowTitle} numberOfLines={2}>
                {n.title}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {n.source.name.split(' (')[0]} • {formatAgo(n.publishedAt)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 14, marginTop: 20 },
  pressed: { opacity: 0.8 },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radii.card, borderCurve: 'continuous',
    backgroundColor: Colors.coralTint,
    minHeight: 64,
  },
  weatherText: { flex: 1, gap: 2 },
  weatherTitle: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.body, color: Colors.ink },
  weatherMeta: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, color: Colors.text2 },
  muted: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, color: Colors.text2, textAlign: 'center' },
  list: { gap: 6 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listTitle: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.title, color: Colors.ink },
  seeAll: { minHeight: 44, justifyContent: 'center' },
  seeAllText: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.meta, color: Colors.coralDeep, textDecorationLine: 'underline' },
  row: {
    gap: 2,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rowTitle: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.body, lineHeight: 22, color: Colors.ink },
  rowMeta: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.caption, color: Colors.text3 },
});
