import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { extractHbliFromCharges } from "../../../src/services/linbisQuoteLookup";
import {
  formatLocationName,
  formatOperacionCustomerReference,
  formatOperacionDate,
} from "../../../src/services/operacionesFiltersLogic";
import {
  getOceanOperacionContainerNumber,
  getOceanOperacionTrackingStatus,
} from "../../../src/services/operacionesTrackingLink";
import { DetailField, DetailSection } from "../../components/operaciones/DetailFields";
import { useOperaciones } from "../../hooks/useOperaciones";
import type { OperacionesStackParamList } from "../../navigation/OperacionesStack";
import { openTrackeosFromOperacion } from "../../navigation/openTrackeosFromOperacion";
import type { ClientTabParamList } from "../../navigation/ClientTabs";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

type RouteProps = RouteProp<OperacionesStackParamList, "OceanOperacionDetail">;
type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<OperacionesStackParamList, "OceanOperacionDetail">,
  BottomTabNavigationProp<ClientTabParamList>
>;

export default function OceanOperacionDetailScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { shipment } = route.params;
  const { getOceanTrackingStatus } = useOperaciones();
  const trackingStatus = getOceanTrackingStatus(shipment);
  const hbli = extractHbliFromCharges(shipment.charges);
  const containerNumber = getOceanOperacionContainerNumber(shipment);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroNumber}>
            {formatOperacionCustomerReference(shipment.customerReference)}
          </Text>
          <Text style={styles.heroRoute}>
            {formatLocationName(shipment.executedAt)} →{" "}
            {formatLocationName(shipment.destination)}
          </Text>
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
          <DetailField label="Número SOG" value={shipment.number} accent />
          <DetailField label="HBLI" value={hbli} />
          <DetailField label="Booking" value={shipment.bookingNumber} />
          <DetailField label="Contenedor" value={containerNumber} />
          <DetailField
            label="Tracking"
            value={trackingStatus.trackingLabel}
            accent={trackingStatus.isTracked}
          />
          <DetailField label="Waybill" value={shipment.waybillNumber} />
          <DetailField label="Referencia cliente" value={shipment.customerReference} />
          <DetailField label="Transportista" value={shipment.carrier?.name} />
        </DetailSection>

        <DetailSection title="Fechas y ruta">
          <DetailField
            label="Salida"
            value={formatOperacionDate(shipment.departureDate)}
          />
          <DetailField
            label="Llegada"
            value={formatOperacionDate(shipment.arrivalDate)}
          />
          <DetailField
            label="Origen"
            value={formatLocationName(shipment.executedAt)}
          />
          <DetailField
            label="Destino"
            value={formatLocationName(shipment.destination)}
          />
        </DetailSection>

        <DetailSection title="Carga">
          <DetailField
            label="Piezas"
            value={shipment.totalCargo?.pieces?.toString()}
          />
          <DetailField
            label="Peso"
            value={shipment.totalCargo?.weight?.userDisplay}
          />
          <DetailField
            label="Volumen"
            value={shipment.totalCargo?.volume?.userDisplay}
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
  heroNumber: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: brand.ink,
    marginBottom: 4,
  },
  heroRoute: {
    fontSize: 14,
    color: brand.inkSecondary,
    lineHeight: 20,
  },
  trackingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: brand.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    marginBottom: spacing.md,
  },
  trackingButtonText: {
    color: "#fff",
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
});
