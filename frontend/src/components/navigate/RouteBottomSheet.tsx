import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
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

    const googleMapsNativeUrl = `google.navigation:q=${lat},${lng}&mode=w`;
    const googleMapsWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
    const appleMapsUrl = `maps:0,0?q=${encodeURIComponent(destinationName)}@${lat},${lng}&dirflg=w`;

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

  const safestRoute = routes.find((r) => r.type === 'safest');

  return (
    <>
      <View style={styles.panel}>
        <View style={styles.dragIndicator} />
        <View style={styles.headerRow}>
          <Text style={styles.sheetTitle}>Safe routes to {destinationName}</Text>
          {noHazardsOnAnyRoute && (
            <View style={styles.calmPill}>
              <ShieldCheck size={14} color={Colors.safe} />
              <Text style={styles.calmText}>No flood zones</Text>
            </View>
          )}
        </View>

        {isSameLocation && (
          <View style={styles.edgeStateBox}>
            <Text style={styles.edgeStateTitle}>Origin equals destination</Text>
            <Text style={styles.edgeStateSubtitle}>Choose a different place to compute routes.</Text>
          </View>
        )}

        {!isSameLocation && routes.length === 0 && (
          <View style={styles.edgeStateBox}>
            <Text style={styles.edgeStateTitle}>No walking routes found</Text>
            <Text style={styles.edgeStateSubtitle}>
              Could not compute a passable trail between these places.
            </Text>
          </View>
        )}

        {!isSameLocation && routes.length > 0 && (
          <>
            <ScrollView style={styles.routesScroll} showsVerticalScrollIndicator={false}>
              {routes.map((route) => (
                <RouteRow
                  key={route.id}
                  route={route}
                  isSelected={route.id === selectedRouteId}
                  onSelect={() => onSelectRoute(route.id)}
                />
              ))}
            </ScrollView>
            <View style={styles.actionBar}>
              <PrimaryButton
                title="Change"
                variant="outlineCoral"
                onPress={onChange}
                height={52}
                style={styles.changeButton}
              />
              <PrimaryButton
                title={getButtonTitle()}
                variant="filled"
                icon={<Navigation size={18} color="#FFFFFF" />}
                onPress={handleStartTripHandoff}
                height={52}
                style={styles.startButton}
              />
            </View>
          </>
        )}
      </View>

      {/* Warning Confirmation Modal Sheet */}
      <Modal visible={isWarningConfirmOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <AlertTriangle size={32} color={Colors.danger} />
            </View>
            <Text style={styles.modalTitle}>Flood Hazard Warning</Text>
            <Text style={styles.modalBody}>
              This route enters an active glacial lake outburst flood zone. Proceeding along the
              valley bed exposes you to high-velocity flood debris waves.
            </Text>

            <View style={styles.modalActions}>
              {/* Default Primary Action: Switch to Safest Route */}
              <PrimaryButton
                title="Switch to Safest Route"
                variant="filled"
                onPress={() => {
                  if (safestRoute) {
                    onSelectRoute(safestRoute.id);
                  }
                  setIsWarningConfirmOpen(false);
                }}
                height={52}
                style={{ width: '100%', marginBottom: 10 }}
              />

              {/* Secondary Action: Proceed Anyway */}
              <PrimaryButton
                title="Continue Anyway (High Risk)"
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
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
    paddingHorizontal: Spacing.sidePadding,
    paddingBottom: 12,
    maxHeight: '48%',
    ...Shadows.sheet,
  },
  routesScroll: { flexGrow: 0 },
  actionBar: { flexDirection: 'row', gap: 10, marginTop: 6 },
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
