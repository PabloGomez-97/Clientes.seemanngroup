import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ClientQuote } from "../../../src/services/cotizacionesLogic";
import {
  formatOperacionDate,
} from "../../../src/services/operacionesFiltersLogic";
import {
  getQuoteFlowLabel,
  getQuoteTransportDisplay,
  getQuoteValidityLabel,
} from "../../../src/services/cotizacionesLogic";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type QuoteCardProps = {
  quote: ClientQuote;
};

export default function QuoteCard({ quote }: QuoteCardProps) {
  const validity = getQuoteValidityLabel(quote.validUntil_Date);
  const isExpired = validity === "Vencida";

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.flowBadge}>
          <Text style={styles.flowText}>{getQuoteFlowLabel(quote.currentFlow)}</Text>
        </View>
        <View
          style={[
            styles.validityBadge,
            isExpired && styles.validityBadgeExpired,
          ]}
        >
          <Text
            style={[
              styles.validityText,
              isExpired && styles.validityTextExpired,
            ]}
          >
            {validity}
          </Text>
        </View>
      </View>

      <Text style={styles.reference} numberOfLines={2}>
        {quote.customerReference?.trim() || "Sin referencia"}
      </Text>
      <Text style={styles.number}>{quote.number || "-"}</Text>

      <Text style={styles.route} numberOfLines={2}>
        {quote.origin || "-"} → {quote.destination || "-"}
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Emisión</Text>
          <Text style={styles.metaValue}>{formatOperacionDate(quote.date)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Vigencia</Text>
          <Text style={styles.metaValue}>
            {formatOperacionDate(quote.validUntil_Date)}
          </Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.transportRow}>
          <Ionicons name="swap-horizontal-outline" size={14} color={brand.muted} />
          <Text style={styles.footerText} numberOfLines={1}>
            {getQuoteTransportDisplay(quote)}
          </Text>
        </View>
        {quote.transitDays != null ? (
          <Text style={styles.transitText}>{quote.transitDays} días</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: brand.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  flowBadge: {
    backgroundColor: "rgba(30, 58, 95, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  flowText: {
    fontSize: 11,
    fontWeight: "700",
    color: brand.navy,
  },
  validityBadge: {
    backgroundColor: brand.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  validityBadgeExpired: {
    backgroundColor: "#f3f4f6",
  },
  validityText: {
    fontSize: 11,
    fontWeight: "700",
    color: brand.primary,
  },
  validityTextExpired: {
    color: brand.muted,
  },
  reference: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: brand.ink,
    marginBottom: 2,
  },
  number: {
    fontSize: 13,
    fontWeight: "600",
    color: brand.muted,
    marginBottom: spacing.sm,
  },
  route: {
    fontSize: 14,
    color: brand.inkSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: brand.muted,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: brand.ink,
  },
  footerRow: {
    borderTopWidth: 1,
    borderTopColor: brand.borderLight,
    paddingTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  transportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  footerText: {
    fontSize: 12,
    color: brand.muted,
    flexShrink: 1,
  },
  transitText: {
    fontSize: 12,
    fontWeight: "700",
    color: brand.navy,
  },
});
