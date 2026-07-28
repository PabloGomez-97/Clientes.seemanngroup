import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { RutaAerea } from "../../../src/components/quotes/Handlers/Air/HandlerQuoteAir";
import {
  airRouteValidityMeta,
  formatAirRateTier,
} from "../../../src/components/quotes/Handlers/Air/airQuoteStep1Shared";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Props = {
  ruta: RutaAerea;
  selected?: boolean;
  pending?: boolean;
  onPress: () => void;
};

export default function AirRateCard({
  ruta,
  selected,
  pending,
  onPress,
}: Props) {
  const validity = airRouteValidityMeta(ruta.validUntil);
  const tone =
    validity.state === "expired"
      ? { bg: "#fee2e2", color: "#b91c1c" }
      : validity.state === "expiring-soon"
        ? { bg: "#ffedd5", color: "#c2410c" }
        : { bg: "#dcfce7", color: "#15803d" };

  const tiers = [
    { key: "45", label: "+45 kg", value: ruta.kg45 },
    { key: "100", label: "+100", value: ruta.kg100 },
    { key: "300", label: "+300", value: ruta.kg300 },
  ];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.top}>
        <Text style={styles.route} numberOfLines={2}>
          {ruta.origin} → {ruta.destination}
        </Text>
        <View style={[styles.pill, { backgroundColor: tone.bg }]}>
          <Text style={[styles.pillText, { color: tone.color }]}>
            {pending ? "Sin tarifa" : validity.label}
          </Text>
        </View>
      </View>
      <Text style={styles.carrier} numberOfLines={1}>
        {ruta.carrier || "Carrier por confirmar"}
        {ruta.transitTime ? ` · TT ${ruta.transitTime}` : ""}
        {!pending && validity.iso ? ` · Validez ${validity.iso}` : ""}
      </Text>
      {pending ? (
        <Text style={styles.pendingHint}>
          Se enviará solicitud al ejecutivo para cotizar esta ruta.
        </Text>
      ) : (
        <View style={styles.chips}>
          {tiers.map((tier) => (
            <View key={tier.key} style={styles.chip}>
              <Text style={styles.chipLabel}>{tier.label}</Text>
              <Text style={styles.chipValue}>
                {formatAirRateTier(tier.value, ruta.currency)}
              </Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.footer}>
        <Text style={styles.tapHint}>
          {selected ? "Seleccionada" : "Toca para seleccionar"}
        </Text>
        {selected ? (
          <Ionicons name="checkmark-circle" size={18} color={brand.primary} />
        ) : (
          <Ionicons name="chevron-forward" size={16} color={brand.mutedLight} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    padding: 14,
    gap: 8,
  },
  cardSelected: {
    borderColor: brand.primary,
    backgroundColor: brand.primarySoft,
  },
  cardPressed: { opacity: 0.94 },
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  route: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  pill: {
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
  },
  carrier: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  pendingHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.inkSecondary,
    lineHeight: 18,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: brand.canvas,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 72,
  },
  chipLabel: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: brand.muted,
  },
  chipValue: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  footer: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tapHint: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: brand.muted,
  },
});
