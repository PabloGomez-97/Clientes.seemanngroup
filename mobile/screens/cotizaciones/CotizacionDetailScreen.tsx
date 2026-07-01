import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { ClientQuote } from "../../../src/services/cotizacionesLogic";
import {
  getQuoteFlowLabel,
  getQuoteTransportDisplay,
  getQuoteValidityLabel,
} from "../../../src/services/cotizacionesLogic";
import {
  formatOperacionCustomerReference,
  formatOperacionDate,
} from "../../../src/services/operacionesFiltersLogic";
import { DetailField, DetailSection } from "../../components/operaciones/DetailFields";
import type { CotizacionesStackParamList } from "../../navigation/CotizacionesStack";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type RouteProps = RouteProp<CotizacionesStackParamList, "CotizacionDetail">;

export default function CotizacionDetailScreen() {
  const route = useRoute<RouteProps>();
  const { quote } = route.params;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            {formatOperacionCustomerReference(quote.customerReference)}
          </Text>
          <Text style={styles.heroSubtitle}>{quote.number || "-"}</Text>
          <Text style={styles.heroRoute}>
            {quote.origin || "-"} → {quote.destination || "-"}
          </Text>
        </View>

        <DetailSection title="Información general">
          <DetailField label="N° cotización" value={quote.number} accent />
          <DetailField
            label="Referencia cliente"
            value={quote.customerReference}
          />
          <DetailField
            label="Etapa"
            value={getQuoteFlowLabel(quote.currentFlow)}
          />
          <DetailField
            label="Vigencia"
            value={getQuoteValidityLabel(quote.validUntil_Date)}
          />
          <DetailField
            label="Transporte"
            value={getQuoteTransportDisplay(quote)}
          />
          <DetailField label="Transportista" value={quote.carrierBroker} />
          <DetailField label="Ejecutivo" value={quote.salesRep} />
        </DetailSection>

        <DetailSection title="Fechas y ruta">
          <DetailField label="Emisión" value={formatOperacionDate(quote.date)} />
          <DetailField
            label="Válida hasta"
            value={formatOperacionDate(quote.validUntil_Date)}
          />
          <DetailField
            label="Salida"
            value={formatOperacionDate(quote.deperture_Date)}
          />
          <DetailField
            label="Llegada"
            value={formatOperacionDate(quote.arrival_Date)}
          />
          <DetailField label="Origen" value={quote.origin} />
          <DetailField label="Destino" value={quote.destination} />
          <DetailField
            label="Tránsito"
            value={
              quote.transitDays != null ? `${quote.transitDays} días` : undefined
            }
          />
        </DetailSection>

        <DetailSection title="Carga y valores">
          <DetailField
            label="Piezas"
            value={quote.totalCargo_Pieces?.toString()}
          />
          <DetailField
            label="Contenedores"
            value={quote.totalCargo_Container?.toString()}
          />
          <DetailField label="Peso" value={quote.totalCargo_WeightDisplayValue} />
          <DetailField
            label="Volumen"
            value={quote.totalCargo_VolumeDisplayValue}
          />
          <DetailField
            label="Valor total"
            value={quote.totalCharge_IncomeDisplayValue}
            accent
          />
          <DetailField label="Tipo pago" value={quote.paymentType} />
          <DetailField label="Estado carga" value={quote.cargoStatus} />
          <DetailField label="Peligrosa" value={quote.hazardous} />
          <DetailField label="Notas" value={quote.notes} />
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
  heroTitle: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: brand.ink,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: brand.muted,
    marginBottom: 4,
  },
  heroRoute: {
    fontSize: 14,
    color: brand.inkSecondary,
    lineHeight: 20,
  },
});
