import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import {
  formatOperacionCustomerReference,
  formatOperacionDate,
} from "../../../src/services/operacionesFiltersLogic";
import { DetailField, DetailSection } from "../../components/operaciones/DetailFields";
import {
  OperacionHero,
  OperacionNotesSection,
} from "../../components/operaciones/OperacionDetailChrome";
import OperacionDocumentosSection from "../../components/operaciones/OperacionDocumentosSection";
import type { OperacionesStackParamList } from "../../navigation/OperacionesStack";
import { brand, spacing } from "../../theme/brand";

type RouteProps = RouteProp<OperacionesStackParamList, "GroundOperacionDetail">;

export default function GroundOperacionDetailScreen() {
  const route = useRoute<RouteProps>();
  const { shipment } = route.params;

  const title = formatOperacionCustomerReference(shipment.customerReference);
  const routeLabel = `${shipment.from || "-"} → ${shipment.to || "-"}`;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <OperacionHero title={title} routeLabel={routeLabel} mode="Terrestre" />

        <DetailSection title="Detalles del envío">
          <DetailField label="Número de envío" value={shipment.number} accent />
          <DetailField
            label="Referencia cliente"
            value={shipment.customerReference}
          />
          <DetailField label="Clase" value={shipment.shipmentClass} />
          <DetailField label="Categoría tarifa" value={shipment.rateCategory} />
          <DetailField label="ID interno" value={shipment.id} />
        </DetailSection>

        <DetailSection title="Transporte terrestre">
          <DetailField label="Transportista" value={shipment.carrier} />
          <DetailField label="Conductor" value={shipment.driver} />
          <DetailField label="Camión" value={shipment.truckNumber} />
          <DetailField label="Tracking" value={shipment.trackingNumber} />
          <DetailField label="PRO" value={shipment.proNumber} />
        </DetailSection>

        <DetailSection title="Documentos y referencias">
          <DetailField label="Booking" value={shipment.bookingNumber} />
          <DetailField label="Waybill" value={shipment.waybillNumber} />
          <DetailField label="Contenedor" value={shipment.containerNumber} />
        </DetailSection>

        <DetailSection title="Fechas">
          <DetailField
            label="Salida"
            value={formatOperacionDate(shipment.departure)}
          />
          <DetailField
            label="Llegada"
            value={formatOperacionDate(shipment.arrival)}
          />
          <DetailField label="Origen" value={shipment.from} />
          <DetailField label="Destino" value={shipment.to} />
          <DetailField
            label="Destino final"
            value={shipment.finalDestination}
          />
        </DetailSection>

        <DetailSection title="Información de carga">
          <DetailField label="Descripción" value={shipment.cargoDescription} />
          <DetailField label="Estado carga" value={shipment.cargoStatus} />
          <DetailField
            label="Piezas"
            value={
              shipment.totalCargo_Pieces != null
                ? String(shipment.totalCargo_Pieces)
                : null
            }
          />
          <DetailField
            label="Peso total"
            value={shipment.totalCargo_WeightDisplayValue}
          />
          <DetailField
            label="Volumen total"
            value={shipment.totalCargo_VolumeDisplayValue}
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

        <OperacionDocumentosSection
          mode="ground"
          shipmentId={shipment.id}
        />

        {(shipment.totalCharge_IncomeDisplayValue ||
          shipment.totalCharge_ExpenseDisplayValue ||
          shipment.totalCharge_ProfitDisplayValue) && (
          <DetailSection title="Financiero">
            <DetailField
              label="Ingreso"
              value={shipment.totalCharge_IncomeDisplayValue}
            />
            <DetailField
              label="Costo"
              value={shipment.totalCharge_ExpenseDisplayValue}
            />
            <DetailField
              label="Profit"
              value={shipment.totalCharge_ProfitDisplayValue}
            />
          </DetailSection>
        )}

        <OperacionNotesSection notes={shipment.notes} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
});
