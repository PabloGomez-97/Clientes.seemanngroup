import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import {
  formatOperacionCustomerReference,
  formatOperacionDate,
} from "../../../src/services/operacionesFiltersLogic";
import { DetailField, DetailSection } from "../../components/operaciones/DetailFields";
import type { OperacionesStackParamList } from "../../navigation/OperacionesStack";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type RouteProps = RouteProp<OperacionesStackParamList, "GroundOperacionDetail">;

export default function GroundOperacionDetailScreen() {
  const route = useRoute<RouteProps>();
  const { shipment } = route.params;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroNumber}>
            {formatOperacionCustomerReference(shipment.customerReference)}
          </Text>
          <Text style={styles.heroRoute}>
            {shipment.from || "-"} → {shipment.to || "-"}
          </Text>
        </View>

        <DetailSection title="Información general">
          <DetailField label="Número" value={shipment.number} accent />
          <DetailField label="Referencia cliente" value={shipment.customerReference} />
          <DetailField label="Transportista" value={shipment.carrier} />
          <DetailField label="Conductor" value={shipment.driver} />
          <DetailField label="Camión" value={shipment.truckNumber} />
          <DetailField label="Tracking" value={shipment.trackingNumber} />
          <DetailField label="PRO" value={shipment.proNumber} />
          <DetailField label="Clase" value={shipment.shipmentClass} />
          <DetailField label="Categoría tarifa" value={shipment.rateCategory} />
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
          <DetailField label="Origen" value={shipment.from} />
          <DetailField label="Destino" value={shipment.to} />
          <DetailField
            label="Destino final"
            value={shipment.finalDestination}
          />
        </DetailSection>

        <DetailSection title="Carga y documentos">
          <DetailField label="Descripción" value={shipment.cargoDescription} />
          <DetailField label="Estado carga" value={shipment.cargoStatus} />
          <DetailField
            label="Piezas"
            value={shipment.totalCargo_Pieces?.toString()}
          />
          <DetailField
            label="Peso"
            value={shipment.totalCargo_WeightDisplayValue}
          />
          <DetailField
            label="Volumen"
            value={shipment.totalCargo_VolumeDisplayValue}
          />
          <DetailField label="Booking" value={shipment.bookingNumber} />
          <DetailField label="Waybill" value={shipment.waybillNumber} />
          <DetailField label="Contenedor" value={shipment.containerNumber} />
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
});
