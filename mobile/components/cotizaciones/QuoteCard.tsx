import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ClientQuote } from "../../../src/services/cotizacionesLogic";
import { formatOperacionDate } from "../../../src/services/operacionesFiltersLogic";
import {
  getQuoteFlowLabel,
  getQuoteTransportDisplay,
  getQuoteValidityLabel,
} from "../../../src/services/cotizacionesLogic";
import { brand, radii } from "../../theme/brand";
import { fonts } from "../../theme/typography";
import { STATUS_TONE } from "../tracking/statusTone";

type QuoteCardProps = {
  quote: ClientQuote;
};

type Place = { code: string; name: string };

function parsePlace(location?: string | null): Place {
  const raw = location?.trim() || "";
  if (!raw) return { code: "—", name: "" };

  const paren = raw.match(/\(([A-Z0-9]{2,5})\)\s*$/i);
  if (paren) {
    return {
      code: paren[1].toUpperCase(),
      name: raw.replace(paren[0], "").trim(),
    };
  }

  if (/^[A-Z0-9]{2,5}$/i.test(raw)) {
    return { code: raw.toUpperCase(), name: "" };
  }

  const words = raw.split(/\s+/).filter(Boolean);
  const first = words[0] || raw;
  const code =
    first.length <= 10 ? first.toUpperCase() : first.slice(0, 8).toUpperCase();
  return { code, name: raw };
}

function transportIcon(quote: ClientQuote): keyof typeof Ionicons.glyphMap {
  const label = getQuoteTransportDisplay(quote).toLowerCase();
  if (label.includes("air") || label.includes("aér") || label.includes("aer")) {
    return "airplane";
  }
  if (
    label.includes("vessel") ||
    label.includes("ocean") ||
    label.includes("container") ||
    label.includes("marít") ||
    label.includes("marit")
  ) {
    return "boat";
  }
  if (label.includes("truck") || label.includes("ground") || label.includes("terr")) {
    return "bus";
  }
  return "swap-horizontal";
}

export default function QuoteCard({ quote }: QuoteCardProps) {
  const validity = getQuoteValidityLabel(quote.validUntil_Date);
  const isExpired = validity === "Vencida";
  const flow = getQuoteFlowLabel(quote.currentFlow);
  const from = parsePlace(quote.origin);
  const to = parsePlace(quote.destination);
  const icon = transportIcon(quote);
  const validityTone = isExpired ? STATUS_TONE.neutral : STATUS_TONE.done;
  const ref =
    quote.customerReference?.trim() || quote.number || "Sin referencia";

  return (
    <View style={[styles.card, isExpired && styles.cardExpired]}>
      <View style={styles.body}>
        <View style={styles.mainRow}>
          <View style={styles.routeBlock}>
            <Text style={styles.code}>{from.code}</Text>
            <View style={styles.connector}>
              <View style={styles.connectorLine} />
              <Ionicons
                name={icon}
                size={11}
                color={isExpired ? brand.muted : brand.navy}
                style={styles.connectorIcon}
              />
              <View style={styles.connectorLine} />
            </View>
            <Text style={styles.code}>{to.code}</Text>
          </View>

          <View
            style={[
              styles.validityChip,
              {
                backgroundColor: validityTone.soft,
                borderColor: validityTone.border,
              },
            ]}
          >
            <View
              style={[
                styles.validityDot,
                { backgroundColor: validityTone.accent },
              ]}
            />
            <Text style={[styles.validityText, { color: validityTone.text }]}>
              {validity}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaPrimary} numberOfLines={1}>
            {ref}
          </Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaSecondary} numberOfLines={1}>
            {flow}
          </Text>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerLeft} numberOfLines={1}>
            {quote.number ? `${quote.number} · ` : ""}
            {getQuoteTransportDisplay(quote)}
          </Text>
          <Text style={styles.footerRight}>
            {formatOperacionDate(quote.validUntil_Date)}
            {quote.transitDays != null ? ` · ${quote.transitDays}d` : ""}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: brand.border,
    overflow: "hidden",
  },
  cardExpired: {
    borderColor: "#e5e7eb",
    backgroundColor: "#fafafa",
  },
  body: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  routeBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  code: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: 0.3,
    color: brand.navy,
    fontFamily: fonts.bold,
  },
  connector: {
    flexDirection: "row",
    alignItems: "center",
    width: 48,
    marginHorizontal: 8,
  },
  connectorLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(30, 58, 95, 0.28)",
  },
  connectorIcon: {
    marginHorizontal: 3,
  },
  validityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  validityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  validityText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 5,
  },
  metaPrimary: {
    flexShrink: 1,
    fontSize: 12,
    letterSpacing: 0.2,
    color: brand.ink,
    fontFamily: fonts.semiBold,
  },
  metaSecondary: {
    flexShrink: 1,
    fontSize: 12,
    color: brand.muted,
    fontFamily: fonts.regular,
  },
  metaDot: {
    fontSize: 12,
    color: brand.mutedLight,
    fontFamily: fonts.regular,
  },
  footerRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  footerLeft: {
    flex: 1,
    fontSize: 11,
    color: brand.mutedLight,
    fontFamily: fonts.medium,
  },
  footerRight: {
    fontSize: 11,
    color: brand.mutedLight,
    fontFamily: fonts.medium,
  },
});
