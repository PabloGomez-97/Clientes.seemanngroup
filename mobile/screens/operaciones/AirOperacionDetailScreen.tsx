import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import {
  formatLocationName,
  formatOperacionCustomerReference,
  formatOperacionDate,
} from "../../../src/services/operacionesFiltersLogic";
import { DetailField, DetailSection } from "../../components/operaciones/DetailFields";
import { useOperaciones } from "../../hooks/useOperaciones";
import type { OperacionesStackParamList } from "../../navigation/OperacionesStack";
import { openTrackeosFromOperacion } from "../../navigation/openTrackeosFromOperacion";
import type { ClientTabParamList } from "../../navigation/ClientTabs";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

type RouteProps = RouteProp<OperacionesStackParamList, "AirOperacionDetail">;
type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<OperacionesStackParamList, "AirOperacionDetail">,
  BottomTabNavigationProp<ClientTabParamList>
>;

export default function AirOperacionDetailScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { shipment } = route.params;
  const { getAirTrackingStatus } = useOperaciones();
  const trackingStatus = getAirTrackingStatus(shipment);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroText}>
              <Text style={styles.heroNumber}>
                {formatOperacionCustomerReference(shipment.customerReference)}
              </Text>
              <Text style={styles.heroRoute}>
                {formatLocationName(shipment.executedAt ?? shipment.origin)} →{" "}
                {formatLocationName(shipment.destination)}
              </Text>
            </View>
            {trackingStatus.isTracked ? (
              <View style={[styles.statusChip, styles.statusChipLive]}>
                <View style={[styles.statusDot, styles.statusDotLive]} />
                <Text style={[styles.statusText, styles.statusTextLive]}>
                  En seguimiento
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {trackingStatus.isTracked && trackingStatus.openTarget ? (
          <Pressable
            style={styles.trackingButton}
            onPress={() =>
              openTrackeosFromOperacion(navigation, trackingStatus.openTarget!)
            }
          >
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.trackingButtonText}>Ver seguimiento activo</Text>
          </Pressable>
        ) : null}

        <DetailSection title="Información general">
          <DetailField
            label="Referencia cliente"
            value={shipment.customerReference}
            accent
          />
          <DetailField label="Guía / AWB" value={shipment.waybillNumber} />
          <DetailField
            label="Tracking"
            value={trackingStatus.trackingLabel}
            accent={trackingStatus.isTracked}
          />
          <DetailField label="Transportista" value={shipment.carrier?.name} />
        </DetailSection>

        <DetailSection title="Fechas y ruta">
          <DetailField
            label="Salida"
            value={formatOperacionDate(shipment.departure)}
          />
          <DetailField
            label="Llegada"
            value={formatOperacionDate(shipment.arrival)}
          />
          <DetailField
            label="Origen"
            value={formatLocationName(shipment.executedAt ?? shipment.origin)}
          />
          <DetailField
            label="Destino"
            value={formatLocationName(shipment.destination)}
          />
        </DetailSection>

        <DetailSection title="Carga">
          <DetailField label="Descripción" value={shipment.cargoDescription} />
          <DetailField
            label="Peligrosa"
            value={
              shipment.hazardous == null
                ? "-"
                : shipment.hazardous
                  ? "Sí"
                  : "No"
            }
          />
          <DetailField label="Notas" value={shipment.notes} />
        </DetailSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  hero: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  heroNumber: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: brand.navy,
    marginBottom: 4,
  },
  heroRoute: {
    fontSize: 13,
    color: brand.muted,
    lineHeight: 18,
    fontFamily: fonts.medium,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginTop: 2,
  },
  statusChipLive: {
    backgroundColor: "#eff4ff",
    borderColor: "#c7d7fc",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotLive: {
    backgroundColor: "#2f6fed",
  },
  statusText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },
  statusTextLive: {
    color: "#1d4ed8",
  },
  trackingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: brand.navy,
    borderRadius: radii.md,
    paddingVertical: 12,
    marginBottom: spacing.md,
  },
  trackingButtonText: {
    color: "#fff",
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
});
