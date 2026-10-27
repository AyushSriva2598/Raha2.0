import { SwipeSheet } from '@/components/common/SwipeSheet';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  Platform,
} from 'react-native';
import { Search, X, MapPin, Navigation } from 'lucide-react-native';
import { Colors, Typography, Radii, Spacing } from '@/constants/theme';
import { RouteCoordinate } from '@/services/routeCalculator';

export interface PlaceItem {
  id: string;
  name: string;
  region: string;
  coordinate: RouteCoordinate;
  elevationM: number;
}

// Case-study places along the Teesta valley, North Sikkim. Shelter entries are demo data.
export const SIKKIM_PLACES: PlaceItem[] = [
  {
    id: 'place-chungthang',
    name: 'Chungthang',
    region: 'Teesta valley floor • At-risk reach',
    coordinate: { latitude: 27.6026, longitude: 88.6446 },
    elevationM: 1790,
  },
  {
    id: 'place-chungthang-ridge',
    name: 'Chungthang Monastery Ridge',
    region: 'Demo safe haven • High ground',
    coordinate: { latitude: 27.6070, longitude: 88.6462 },
    elevationM: 2050,
  },
  {
    id: 'place-lachung',
    name: 'Lachung',
    region: 'Upstream town • Lachung Chu valley',
    coordinate: { latitude: 27.6894, longitude: 88.7458 },
    elevationM: 2700,
  },
  {
    id: 'place-lachen',
    name: 'Lachen',
    region: 'Upstream town • Lachen Chu valley',
    coordinate: { latitude: 27.7194, longitude: 88.5547 },
    elevationM: 2750,
  },
  {
    id: 'place-mangan',
    name: 'Mangan',
    region: 'District headquarters • Downstream',
    coordinate: { latitude: 27.5167, longitude: 88.5333 },
    elevationM: 1000,
  },
  {
    id: 'place-dikchu',
    name: 'Dikchu',
    region: 'Teesta downstream • At-risk reach',
    coordinate: { latitude: 27.4128, longitude: 88.5036 },
    elevationM: 600,
  },
  {
    id: 'place-gangtok',
    name: 'Gangtok',
    region: 'State capital • Outside the flood corridor',
    coordinate: { latitude: 27.3314, longitude: 88.6138 },
    elevationM: 1650,
  },
  {
    id: 'place-singtam',
    name: 'Singtam',
    region: 'Teesta downstream • At-risk reach',
    coordinate: { latitude: 27.2300, longitude: 88.5000 },
    elevationM: 300,
  },
];

/** Where the user starts by default: the active settlement. */
export const DEFAULT_ORIGIN = SIKKIM_PLACES[0];

export interface PlaceSearchModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSelectPlace: (place: PlaceItem) => void;
}

export function PlaceSearchModal({
  visible,
  title,
  onClose,
  onSelectPlace,
}: PlaceSearchModalProps) {
  const [query, setQuery] = useState('');

  const filteredPlaces = SIKKIM_PLACES.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.region.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <SwipeSheet visible={visible} onClose={onClose} sheetStyle={[styles.sheet, { paddingTop: 0 }]}>
      <>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={6}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}>
              <X size={20} color={Colors.ink} />
            </Pressable>
          </View>

          {/* Search Input */}
          <View style={styles.inputContainer}>
            <Search size={18} color={Colors.text3} />
            <TextInput
              style={styles.input}
              placeholder="Search Himalayan villages, safe camps..."
              placeholderTextColor={Colors.text3}
              value={query}
              onChangeText={setQuery}
              autoFocus
              clearButtonMode="while-editing"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')}>
                <X size={16} color={Colors.text3} />
              </Pressable>
            )}
          </View>

          {/* Location Presets List */}
          <Text style={styles.sectionHeader}>RECOMMENDED SAFE HAVENS & VILLAGES</Text>
          <FlatList
            data={filteredPlaces}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelectPlace(item);
                  onClose();
                }}
                style={({ pressed }) => [styles.placeItem, pressed && styles.pressed]}>
                <View style={styles.placeIconBox}>
                  {item.region.includes('Safe') || item.region.includes('Refuge') ? (
                    <Navigation size={18} color={Colors.safe} />
                  ) : (
                    <MapPin size={18} color={Colors.ink} />
                  )}
                </View>
                <View style={styles.placeTextStack}>
                  <Text style={styles.placeName}>{item.name}</Text>
                  <Text style={styles.placeRegion}>
                    {item.region} • {item.elevationM}m
                  </Text>
                </View>
              </Pressable>
            )}
          />
      </>
    </SwipeSheet>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 33, 61, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
    paddingTop: 16,
    paddingHorizontal: Spacing.sidePadding,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'android' ? 30 : 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.title,
    color: Colors.ink,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    borderRadius: Radii.card, borderCurve: 'continuous',
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.body,
    color: Colors.ink,
  },
  sectionHeader: {
    fontFamily: Typography.family.bold,
    fontSize: 11,
    color: Colors.text3,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  listContent: {
    paddingBottom: 20,
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  placeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeTextStack: {
    flex: 1,
  },
  placeName: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.body,
    color: Colors.ink,
  },
  placeRegion: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.text2,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
