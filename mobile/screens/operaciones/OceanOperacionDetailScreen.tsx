import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import {
  getOceanOperacionContainerNumber,
  getOceanTrackCreateIdentifier,
} from "../../../src/services/operacionesTrackingLink";
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
import { useLinbisToken } from "../../hooks/useLinbisToken";
import type { ClientTabParamList } from "../../navigation/ClientTabs";
import {
  openCotizacionesFromOperacion,
  openNewOceanTrackingFromOperacion,
  openTrackeosFromOperacion,
} from "../../navigation/openTrackeosFromOperacion";
import type { OperacionesStackParamList } from "../../navigation/OperacionesStack";
import { fetchOceanContainerHint } from "../../services/operacionesApi";
import {
  formatMetric,
  getOperacionCommodities,
  summarizeCommodities,
} from "../../services/operacionDetailLogic";
import { brand, spacing } from "../../theme/brand";

type RouteProps = RouteProp<OperacionesStackParamList, "OceanOperacionDetail">;
type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<OperacionesStackParamList, "OceanOperacionDetail">,
  BottomTabNavigationProp<ClientTabParamList>
>;

export default function OceanOperacionDetailScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { shipment } = route.params;
  const { getOceanTrackingStatus, oceanContainerHints } = useOperaciones();
  const { accessToken, refreshAccessToken } = useLinbisToken();
  const trackingStatus = getOceanTrackingStatus(shipment);
  const { quoteNumber, loading: quoteLoading } = useOperacionQuoteNumber({
    sogNumber: shipment.number,
    shipmentId: shipment.id,
  });
  const [localContainerHint, setLocalContainerHint] = useState<string | null>(
    null,
  );

  const commodities = useMemo(
    () => getOperacionCommodities(shipment),
    [shipment],
  );
  const cargoSummary = useMemo(
    () => summarizeCommodities(commodities),
    [commodities],
  );

  const containerHint =
    localContainerHint ||
    oceanContainerHints[shipment.number?.trim() || ""] ||
    null;

  useEffect(() => {
    const number = shipment.number?.trim();
    if (!accessToken || !number) return;
    if (containerHint || shipment.bookingNumber?.trim()) return;

    let cancelled = false;
    void fetchOceanContainerHint(number, {
      accessToken,
      refreshAccessToken,
      moduleId: shipment.id,
    }).then((hint) => {
      if (!cancelled && hint.containerNumber) {
        setLocalContainerHint(hint.containerNumber);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    containerHint,
    refreshAccessToken,
    shipment.bookingNumber,
    shipment.id,
    shipment.number,
  ]);

  const containerNumber = getOceanOperacionContainerNumber(
    shipment,
    containerHint,
  );
  const createId = getOceanTrackCreateIdentifier(
    shipment,
    {},
    containerHint,
  );

  const title = formatOperacionCustomerReference(shipment.customerReference);
  const origin = formatLocationName(shipment.executedAt);
  const destination = formatLocationName(shipment.destination);

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
  } else {
    const identifier =
      createId ||
      (trackingStatus.trackingLabel
        ? {
            type: "booking_number" as const,
            value: trackingStatus.trackingLabel,
          }
        : null);
    if (identifier) {
      actions.push({
        key: "create-tracking",
        label: "Trackea tu envío",
        icon: "add-circle-outline" as const,
        primary: true,
        onPress: () =>
          openNewOceanTrackingFromOperacion(navigation, {
            containerNumber:
              identifier.type === "container_number" ? identifier.value : null,
            bookingNumber:
              identifier.type === "booking_number" ? identifier.value : null,
            tagHint: shipment.customerReference,
          }),
      });
    }
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
          mode="Marítimo"
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
          <DetailField label="Booking" value={shipment.bookingNumber} />
          <DetailField label="Waybill / BL" value={shipment.waybillNumber} />
          <DetailField label="ID interno" value={shipment.id} />
        </DetailSection>

        <DetailSection title="Seguimiento y operación">
          <DetailField label="Transportista" value={shipment.carrier?.name} />
          <DetailField
            label="Número de seguimiento"
            value={trackingStatus.trackingLabel}
            accent={trackingStatus.isTracked}
          />
          <DetailField label="Contenedor" value={containerNumber} />
          <DetailField
            label="Fecha salida"
            value={formatOperacionDate(shipment.departureDate)}
          />
          <DetailField
            label="Fecha llegada"
            value={formatOperacionDate(shipment.arrivalDate)}
          />
          <DetailField label="Origen" value={origin} />
          <DetailField label="Destino" value={destination} />
        </DetailSection>

        <DetailSection title="Información de carga">
          <DetailField
            label="Piezas"
            value={
              shipment.totalCargo?.pieces != null
                ? String(shipment.totalCargo.pieces)
                : cargoSummary.pieces > 0
                  ? String(cargoSummary.pieces)
                  : null
            }
          />
          <DetailField
            label="Peso total"
            value={
              shipment.totalCargo?.weight?.userDisplay ||
              formatMetric(cargoSummary.weight, "kg")
            }
          />
          <DetailField
            label="Volumen total"
            value={
              shipment.totalCargo?.volume?.userDisplay ||
              formatMetric(cargoSummary.volume, "m³")
            }
          />
          <DetailField
            label="Contenedores"
            value={
              shipment.totalCargo?.containers != null
                ? String(shipment.totalCargo.containers)
                : null
            }
          />
        </DetailSection>

        <OperacionCommoditiesSection items={commodities} />

        <OperacionDocumentosSection
          mode="ocean"
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
