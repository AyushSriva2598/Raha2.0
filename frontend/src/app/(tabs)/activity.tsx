import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { Pill } from '@/components/common/Pill';
import {
  ActivityItem,
  ActivityItemData,
} from '@/components/common/ActivityItem';

type FilterType = 'All' | 'Alerts' | 'News' | 'Reports';

const MOCK_ACTIVITIES: ActivityItemData[] = [
  {
    id: 'act-1',
    type: 'alert',
    title: 'Imja Tsho Water Level Surge',
    meta: 'Level raised +0.8m above normal threshold',
    timestamp: '12m ago',
    unread: true,
  },
  {
    id: 'act-2',
    type: 'trip',
    title: 'Evacuation Route to Dingboche High Ground',
    meta: 'Safe route 4.2 km completed without incidents',
    timestamp: '2h ago',
    unread: false,
  },
  {
    id: 'act-3',
    type: 'report',
    title: 'Community Hazard Report: Debris on trail',
    meta: 'Reported by local ranger near reach #2',
    timestamp: '4h ago',
    unread: false,
  },
  {
    id: 'act-4',
    type: 'news',
    title: 'DHM Monsoon & Glacial Outburst Bulletin',
    meta: 'Department of Hydrology and Meteorology advisory',
    timestamp: 'Yesterday',
    unread: false,
  },
  {
    id: 'act-5',
    type: 'system',
    title: 'Offline Emergency Cache Synchronized',
    meta: 'Khumbu Basin satellite map & shelters cached',
    timestamp: 'Yesterday',
    unread: false,
  },
];

export default function ActivityScreen() {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('All');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const filteredItems = MOCK_ACTIVITIES.filter((item) => {
    if (selectedFilter === 'All') return true;
    if (selectedFilter === 'Alerts') return item.type === 'alert';
    if (selectedFilter === 'News') return item.type === 'news';
    if (selectedFilter === 'Reports') return item.type === 'report';
    return true;
  });

  const todayItems = filteredItems.filter((i) => !i.timestamp.includes('Yesterday'));
  const yesterdayItems = filteredItems.filter((i) => i.timestamp.includes('Yesterday'));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Activity</Text>
        </View>

        {/* Filter Chips Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {(['All', 'Alerts', 'News', 'Reports'] as FilterType[]).map((filter) => {
            const isSelected = selectedFilter === filter;
            return (
              <Pill
                key={filter}
                label={filter}
                variant={isSelected ? 'active' : 'neutral'}
                size="md"
                onPress={() => setSelectedFilter(filter)}
                style={styles.filterChip}
              />
            );
          })}
        </ScrollView>

        {/* Activity List */}
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.ink}
            />
          }>
          {todayItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>TODAY</Text>
              {todayItems.map((item) => (
                <ActivityItem key={item.id} item={item} />
              ))}
            </View>
          )}

          {yesterdayItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>YESTERDAY</Text>
              {yesterdayItems.map((item) => (
                <ActivityItem key={item.id} item={item} />
              ))}
            </View>
          )}

          {filteredItems.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No activity found for {selectedFilter}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: Spacing.sidePadding,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.hero, // 30 bold
    color: Colors.ink,
  },
  filterRow: {
    paddingHorizontal: Spacing.sidePadding,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    minWidth: 64,
  },
  listContent: {
    paddingHorizontal: Spacing.sidePadding,
    paddingTop: 8,
    paddingBottom: 100, // Clear bottom tab bar
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.caption,
    color: Colors.text3,
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.body,
    color: Colors.text2,
  },
});
