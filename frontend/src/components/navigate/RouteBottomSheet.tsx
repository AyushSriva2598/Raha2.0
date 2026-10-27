import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Platform,
  Modal,
} from 'react-native';
import BottomSheet, {
  BottomSheetFooter,
  BottomSheetScrollView,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { Navigation, AlertTriangle, ShieldCheck } from 'lucide-react-native';
import { Colors, Typography, Radii, Shadows, Spacing } from '@/constants/theme';
import { RouteRow } from '@/components/common/RouteRow';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { ComputedRoute, RouteCoordinate } from '@/services/routeCalculator';

export interface RouteBottomSheetProps {
  routes: ComputedRoute[];
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
  destinationCoordinate: RouteCoordinate;
  destinationName: string;
  isSameLocation: boolean;
  noHazardsOnAnyRoute: boolean;
  /** Called by the Change button to pick another destination. */
  onChange: () => void;
}

export function RouteBottomSheet({
  routes,
  selectedRouteId,
  onSelectRoute,
  destinationCoordinate,
  destinationName,
  isSameLocation,
  noHazardsOnAnyRoute,
  onChange,
}: RouteBottomSheetProps) {
  const [isWarningConfirmOpen, setIsWarningConfirmOpen] = useState(false);

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  // Start navigation button label follows selected route
  const getButtonTitle = () => {
    return selectedRoute ? 'Start' : 'Start route';
  };

  const handleStartTripHandoff = async () => {
    // If route enters an active warning flood zone, prompt confirmation first
    if (selectedRoute?.hasWarningZoneCrossing && !isWarningConfirmOpen) {
      setIsWarningConfirmOpen(true);
      return;
    }

    executeGoogleMapsNavigation();
  };

  const executeGoogleMapsNavigation = async () => {
    const lat = destinationCoordinate.latitude;
    const lng = destinationCoordinate.longitude;

    const googleMapsNativeUrl = `google.navigation:q=${lat},${lng}&mode=d`;
    const googleMapsWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    const appleMapsUrl = `maps:0,0?q=${encodeURIComponent(destinationName)}@${lat},${lng}&dirflg=d`;

    try {
      if (Platform.OS === 'android') {
        const canOpen = await Linking.canOpenURL(googleMapsNativeUrl);
        if (canOpen) {
          await Linking.openURL(googleMapsNativeUrl);
          return;
        }
      } else if (Platform.OS === 'ios') {
        const canOpenApple = await Linking.canOpenURL(appleMapsUrl);
        if (canOpenApple) {
          await Linking.openURL(appleMapsUrl);
          return;
        }
      }
      // Fallback web URL
      await Linking.openURL(googleMapsWebUrl);
    } catch {
      Linking.openURL(googleMapsWebUrl).catch(() => {});
    }
  };

  // A road that does not cross a warning zone, offered if the chosen one does.
  const saferRoute = routes.find((r) => !r.hasWarningZoneCrossing && r.id !== selectedRoute?.id);

  // A real sheet: drag between a compact view and the full list. Start and Change stay pinned to the
  // bottom so they are always reachable, and lift clear of the raised SOS button.
  const snapPoints = useMemo(() => ['36%', '64%'], []);
  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props}>
        <View style={styles.footer}>
          <PrimaryButton title="Change" variant="outlineCoral" onPress={onChange} height={52} style={styles.changeButton} />
          <PrimaryButton
            title={getButtonTitle()}
            variant="filled"
            icon={<Navigation size={18} color="#FFFFFF" />}
            onPress={handleStartTripHandoff}
            height={52}
            style={styles.startButton}
          />
        </View>
      </BottomSheetFooter>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, selectedRoute?.id, isWarningConfirmOpen]
  );

  return (
    <>
      <BottomSheet
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        footerComponent={routes.length > 0 ? renderFooter : undefined}
        handleIndicatorStyle={styles.dragIndicator}
        backgroundStyle={styles.sheetBackground}
        style={Shadows.sheet}>
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Text style={styles.sheetTitle} textBreakStrategy="balanced">
              Roads to {destinationName}
            </Text>
            {noHazardsOnAnyRoute && (
              <View style={styles.calmPill}>
                <ShieldCheck size={14} color={Colors.safe} />
                <Text style={styles.calmText}>No flood zones</Text>
              </View>
            )}
          </View>

          {isSameLocation && (
            <View style={styles.edgeStateBox}>
              <Text style={styles.edgeStateTitle}>You are already there</Text>
              <Text style={styles.edgeStateSubtitle}>Choose a different place to get a route.</Text>
            </View>
          )}

          {!isSameLocation && routes.length === 0 && (
            <View style={styles.edgeStateBox}>
              <Text style={styles.edgeStateTitle}>No road route found</Text>
              <Text style={styles.edgeStateSubtitle}>No driving road connects these two places.</Text>
            </View>
          )}

          {!isSameLocation &&
            routes.map((route) => (
              <RouteRow
                key={route.id}
                route={route}
                isSelected={route.id === selectedRouteId}
                onSelect={() => onSelectRoute(route.id)}
              />
            ))}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Warning Confirmation Modal Sheet */}
      <Modal visible={isWarningConfirmOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <AlertTriangle size={32} color={Colors.danger} />
            </View>
            <Text style={styles.modalTitle} textBreakStrategy="balanced">
              This road crosses a flood warning zone
            </Text>
            <Text style={styles.modalBody}>
              {saferRoute
                ? 'Another road avoids it. Take that one if you can.'
                : 'Every road found crosses a warning zone. If you can, choose a place that keeps you away from the river.'}
            </Text>

            <View style={styles.modalActions}>
              {/* Default Primary Action: Switch to Safest Route */}
              <PrimaryButton
                title={saferRoute ? 'Use the safer road' : 'Choose another place'}
                variant="filled"
                onPress={() => {
                  setIsWarningConfirmOpen(false);
                  if (saferRoute) onSelectRoute(saferRoute.id);
                  else onChange();
                }}
                height={52}
                style={{ width: '100%', marginBottom: 10 }}
              />

              {/* Secondary Action: Proceed Anyway */}
              <PrimaryButton
                title="Go this way anyway"
                variant="danger"
                onPress={() => {
                  setIsWarningConfirmOpen(false);
                  executeGoogleMapsNavigation();
                }}
                height={50}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sheetBackground: { backgroundColor: Colors.surface, borderTopLeftRadius: Radii.sheet, borderTopRightRadius: Radii.sheet },
  sheetContent: { paddingHorizontal: Spacing.sidePadding, paddingBottom: 120 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.sidePadding,
    paddingTop: 10,
    paddingBottom: 34,
    backgroundColor: Colors.surface,
  },
  changeButton: { width: 110 },
  dragIndicator: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.coral,
    alignSelf: 'center',
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: {
    flex: 1,
    marginRight: 8,
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.ink,
  },
  calmPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.safeTint,
    borderRadius: Radii.chip,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  calmText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.caption,
    color: Colors.safeDark,
  },
  routesList: {
    gap: 8,
  },
  routeRowSpacing: {
    marginBottom: 8,
  },
  startButton: {
    flex: 1,
  },
  edgeStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: Colors.bg,
    borderRadius: Radii.card, borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
  },
  edgeStateTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.body,
    color: Colors.ink,
    marginBottom: 4,
  },
  edgeStateSubtitle: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.text2,
    textAlign: 'center',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 33, 61, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radii.cardLarge, borderCurve: 'continuous',
    padding: 24,
    alignItems: 'center',
    ...Shadows.sheet,
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dangerTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.title,
    color: Colors.dangerDark,
    textAlign: 'center',
    marginBottom: 10,
  },
  modalBody: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.body,
    color: Colors.text2,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalActions: {
    width: '100%',
  },
});
