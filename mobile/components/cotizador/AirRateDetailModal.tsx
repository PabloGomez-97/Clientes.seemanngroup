import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { RutaAerea } from "../../../src/components/quotes/Handlers/Air/HandlerQuoteAir";
import {
  airRouteValidityMeta,
  formatAirRateTier,
} from "../../../src/components/quotes/Handlers/Air/airQuoteStep1Shared";
import { formatValidUntilDisplay } from "../../../src/components/quotes/Handlers/handlerFechas";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

function formatValidityDate(validUntil: string | null | undefined): string {
  const display = formatValidUntilDisplay(validUntil);
  if (!display || display === "—") return "—";
  return display.replace(/-/g, "/");
}

export const AIR_RATE_TIERS = [
  { key: "kg45", label: "45–99 kg", field: "kg45" as const },
  { key: "kg100", label: "100–299 kg", field: "kg100" as const },
  { key: "kg300", label: "300–499 kg", field: "kg300" as const },
  { key: "kg500", label: "500–999 kg", field: "kg500" as const },
  { key: "kg1000", label: "+1.000 kg", field: "kg1000" as const },
];

function MetaRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.metaRow, !last && styles.metaRowBorder]}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

type Props = {
  ruta: RutaAerea | null;
  pending?: boolean;
  onClose: () => void;
  onConfirm: (ruta: RutaAerea) => void;
  confirmDisabled?: boolean;
  confirmHint?: string | null;
};

/** Detalle de tarifa aérea (paridad visual con Tarifario) + CTA Confirmar ruta. */
export default function AirRateDetailModal({
  ruta,
  pending,
  onClose,
  onConfirm,
  confirmDisabled,
  confirmHint,
}: Props) {
  if (!ruta) return null;

  const validity = airRouteValidityMeta(ruta.validUntil);
  const validityDate = formatValidityDate(ruta.validUntil);
  const tone =
    validity.state === "expired"
      ? { bg: "#fef2f2", color: "#b91c1c" }
      : validity.state === "expiring-soon"
        ? { bg: "#fffbeb", color: "#b45309" }
        : { bg: "#ecfdf5", color: "#047857" };

  const prices = AIR_RATE_TIERS.map((tier) => ({
    ...tier,
    value: formatAirRateTier(ruta[tier.field], ruta.currency),
    raw: ruta[tier.field],
  })).filter((t) => t.raw);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mode}>Aéreo</Text>
              <Text style={styles.route}>
                {ruta.origin} → {ruta.destination}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={20} color={brand.ink} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
          >
            <View style={[styles.validityPill, { backgroundColor: tone.bg }]}>
              <Text style={[styles.validityText, { color: tone.color }]}>
                {pending ? "Sin tarifa publicada" : validity.label}
                {!pending && validityDate !== "—"
                  ? ` · hasta ${validityDate}`
                  : ""}
              </Text>
            </View>

            {pending ? (
              <Text style={styles.pendingBody}>
                Esta combinación no tiene tarifa en sheet. Al confirmar se
                enviará la solicitud al ejecutivo para cotizar.
              </Text>
            ) : (
              <>
                <Text style={styles.sectionLabel}>Precios</Text>
                {prices.length === 0 ? (
                  <Text style={styles.emptyPrices}>Sin precios publicados</Text>
                ) : (
                  <View style={styles.priceTable}>
                    {prices.map((tier) => (
                      <View key={tier.key} style={styles.priceRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.priceTier}>{tier.label}</Text>
                          <Text style={styles.priceHint}>
                            Tarifa por kilogramo
                          </Text>
                        </View>
                        <Text style={styles.priceValue}>{tier.value}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            <Text style={styles.sectionLabel}>Detalle de la ruta</Text>
            <View style={styles.metaCard}>
              <MetaRow
                label="Carrier / agente"
                value={ruta.carrier || "Por confirmar"}
              />
              <MetaRow label="Moneda" value={ruta.currency || "USD"} />
              {ruta.transitTime ? (
                <MetaRow label="Tránsito (TT)" value={ruta.transitTime} />
              ) : null}
              {ruta.frequency ? (
                <MetaRow label="Frecuencia" value={ruta.frequency} />
              ) : null}
              {ruta.routing ? (
                <MetaRow label="Routing" value={ruta.routing} />
              ) : null}
              {ruta.company ? (
                <MetaRow label="Compañía" value={ruta.company} />
              ) : null}
              {ruta.minAirFreight > 0 ? (
                <MetaRow
                  label="Mínimo flete"
                  value={`${ruta.currency} ${ruta.minAirFreight.toFixed(2)}`}
                />
              ) : null}
              <MetaRow
                label="Validez"
                value={validityDate}
                last
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {confirmHint ? (
              <Text style={styles.confirmHint}>{confirmHint}</Text>
            ) : null}
            <Pressable
              style={[
                styles.confirmBtn,
                confirmDisabled && styles.confirmDisabled,
              ]}
              disabled={confirmDisabled}
              onPress={() => onConfirm(ruta)}
            >
              <Text style={styles.confirmText}>Confirmar ruta</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: brand.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 12,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: brand.border,
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingBottom: 8,
    gap: 12,
  },
  mode: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: brand.primary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  route: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: brand.ink,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brand.canvasAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 16,
    gap: 12,
  },
  validityPill: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  validityText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  pendingBody: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: brand.inkSecondary,
    lineHeight: 19,
  },
  sectionLabel: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  emptyPrices: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  priceTable: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
    backgroundColor: brand.surface,
  },
  priceTier: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  priceHint: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  priceValue: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: brand.navy,
  },
  metaCard: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: brand.canvasAlt,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  metaRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
  },
  metaLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: brand.muted,
    flexShrink: 0,
  },
  metaValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.border,
  },
  confirmHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#b45309",
  },
  confirmBtn: {
    backgroundColor: brand.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmDisabled: { opacity: 0.45 },
  confirmText: {
    color: "#fff",
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
});
