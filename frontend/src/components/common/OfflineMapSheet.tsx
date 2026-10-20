import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, MapPin, Route, ShieldCheck, Waves } from 'lucide-react-native';
import { Colors, Radii, Shadows, Typography } from '@/constants/theme';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { useOfflineStore } from '@/services/offlineCache';

interface OfflineMapSheetProps {
  visible: boolean;
  onClose: () => void;
}

const INCLUDED = [
  { Icon: Waves, label: 'Lakes' },
  { Icon: ShieldCheck, label: 'Shelters' },
  { Icon: Route, label: 'Safe routes' },
  { Icon: MapPin, label: 'Your valley' },
];

export function OfflineMapSheet({ visible, onClose }: OfflineMapSheetProps) {
  const insets = useSafeAreaInsets();
  const { status, lastUpdated, sizeKb, persistent, error, download } = useOfflineStore();

  const isDownloading = status === 'downloading';
  const isReady = status === 'ready';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.handle} />
        <Text style={styles.title} accessibilityRole="header">
          Download Offline Map
        </Text>
        <Text style={styles.body}>
          Save your valley&apos;s lakes, shelters and safe routes on this phone so they still open
          without internet. This does not store map tiles, so the background map needs a connection.
        </Text>

        <View style={styles.chips}>
          {INCLUDED.map(({ Icon, label }) => (
            <View key={label} style={styles.chip}>
              <Icon size={18} color={Colors.coralDeep} />
              <Text style={styles.chipText}>{label}</Text>
            </View>
          ))}
        </View>

        {isReady && lastUpdated && (
          <Text style={styles.status}>
            Saved {new Date(lastUpdated).toLocaleString()} • about {sizeKb} KB
            {persistent ? '' : ' (this build keeps it in memory only until the app is rebuilt)'}
          </Text>
        )}
        {status === 'error' && error && (
          <View style={styles.errorRow}>
            <AlertTriangle size={16} color={Colors.dangerDark} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <PrimaryButton
          title={isReady ? 'Update now' : 'Download now'}
          onPress={download}
          loading={isDownloading}
          disabled={isDownloading}
        />
        <PrimaryButton
          title={isReady ? 'Close' : "I'll download later"}
          variant="outlineCoral"
          onPress={onClose}
          disabled={isDownloading}
        />
        {isDownloading && <ActivityIndicator style={styles.spinner} color={Colors.coral} />}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(42, 27, 26, 0.45)' },
  sheet: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
    ...Shadows.sheet,
  },
  handle: {
    alignSelf: 'center',
    width: 56,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.coral,
    marginBottom: 6,
  },
  title: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.heading, color: Colors.ink },
  body: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.body,
    lineHeight: 23,
    color: Colors.text2,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 40,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.coral,
    backgroundColor: Colors.surface,
  },
  chipText: { fontFamily: Typography.family.bold, fontSize: Typography.sizes.meta, color: Colors.coralDeep },
  status: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.meta, color: Colors.text2 },
  errorRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  errorText: { flex: 1, fontFamily: Typography.family.bold, fontSize: Typography.sizes.meta, color: Colors.dangerDark },
  spinner: { position: 'absolute', top: 12, right: 20 },
});
