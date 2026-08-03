import { useMemo } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import {
  formatLocationName,
  formatOperacionCustomerReference,
  formatOperacionDate,
} from "../../../src/services/operacionesFiltersLogic";
import { DetailField, DetailSection } from "../../components/operaciones/DetailFields";
import {
  OperacionActions,
  OperacionCommoditiesSection,
  OperacionHero,
  OperacionNotesSection,
} from "../../components/operaciones/OperacionDetailChrome";
import OperacionDocumentosSection from "../../components/operaciones/OperacionDocumentosSection";
import { useOperacionQuoteNumber } from "../../hooks/useOperacionQuoteNumber";
import { useOperaciones } from "../../hooks/useOperaciones";
import type { ClientTabParamList } from "../../navigation/ClientTabs";
import {
  openCotizacionesFromOperacion,
  openNewAirTrackingFromOperacion,
  openTrackeosFromOperacion,
} from "../../navigation/openTrackeosFromOperacion";
import type { OperacionesStackParamList } from "../../navigation/OperacionesStack";
import {
  formatMetric,
  getOperacionCommodities,
  summarizeCommodities,
} from "../../services/operacionDetailLogic";
import { brand, spacing } from "../../theme/brand";

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
  const { quoteNumber, loading: quoteLoading } = useOperacionQuoteNumber({
    sogNumber: shipment.number,
    shipmentId: shipment.id,
  });

  const commodities = useMemo(
    () => getOperacionCommodities(shipment),
    [shipment],
  );
  const cargoSummary = useMemo(
    () => summarizeCommodities(commodities),
    [commodities],
  );

  const title = formatOperacionCustomerReference(shipment.customerReference);
  const origin = formatLocationName(shipment.executedAt ?? shipment.origin);
  const destination = formatLocationName(shipment.destination);
  const trackAwb =
    trackingStatus.trackingLabel ||
    shipment.waybillNumber?.trim() ||
    shipment.number?.trim() ||
    "";

  const actions = [];
  if (trackingStatus.isTracked && trackingStatus.openTarget) {
    actions.push({
      key: "view-tracking",
      label: "Ver seguimiento",
      icon: "navigate" as const,
      primary: true,
      onPress: () =>
        openTrackeosFromOperacion(navigation, trackingStatus.openTarget!),
    });
  } else if (trackAwb) {
    actions.push({
      key: "create-tracking",
      label: "Trackea tu envío",
      icon: "add-circle-outline" as const,
      primary: true,
      onPress: () =>
        openNewAirTrackingFromOperacion(
          navigation,
          trackAwb.replace(/[\s-]/g, ""),
          shipment.customerReference,
        ),
    });
  }
  if (quoteNumber) {
    actions.push({
      key: "quote",
      label: "Ver cotización",
      icon: "document-text-outline" as const,
      onPress: () => openCotizacionesFromOperacion(navigation),
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <OperacionHero
          title={title}
          routeLabel={`${origin} → ${destination}`}
          mode="Aéreo"
          tracked={trackingStatus.isTracked}
        />

        <OperacionActions actions={actions} />

        <DetailSection title="Detalles del envío">
          <DetailField label="Número de envío" value={shipment.number} />
          <DetailField
            label="Referencia cliente"
            value={shipment.customerReference}
            accent
          />
          <DetailField
            label="Número de cotización"
            value={quoteLoading ? "Cargando…" : quoteNumber}
            accent={Boolean(quoteNumber)}
          />
          <DetailField label="Waybill" value={shipment.waybillNumber} />
          <DetailField label="ID interno" value={shipment.id} />
        </DetailSection>

        <DetailSection title="Seguimiento y operación">
          <DetailField label="Transportista" value={shipment.carrier?.name} />
          <DetailField
            label="Número de seguimiento"
            value={trackingStatus.trackingLabel}
            accent={trackingStatus.isTracked}
          />
          <DetailField
            label="Fecha salida"
            value={formatOperacionDate(shipment.departure)}
          />
          <DetailField
            label="Fecha llegada"
            value={formatOperacionDate(shipment.arrival)}
          />
          <DetailField label="Origen" value={origin} />
          <DetailField label="Destino" value={destination} />
        </DetailSection>

        <DetailSection title="Información de carga">
          <DetailField
            label="Descripción"
            value={shipment.cargoDescription}
          />
          <DetailField
            label="Tipo de empaque"
            value={cargoSummary.packageTypes.join(", ") || null}
          />
          <DetailField
            label="Piezas"
            value={
              cargoSummary.pieces > 0 ? String(cargoSummary.pieces) : null
            }
          />
          <DetailField
            label="Peso total"
            value={formatMetric(cargoSummary.weight, "kg")}
          />
          <DetailField
            label="Volumen total"
            value={formatMetric(cargoSummary.volume, "m³")}
          />
          <DetailField
            label="Carga peligrosa"
            value={
              shipment.hazardous == null
                ? null
                : shipment.hazardous
                  ? "Sí"
                  : "No"
            }
          />
        </DetailSection>

        <OperacionCommoditiesSection items={commodities} />

        <OperacionDocumentosSection
          mode="air"
          quoteNumber={quoteNumber}
          quoteLoading={quoteLoading}
        />

        <OperacionNotesSection notes={shipment.notes} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
});
