import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ClientQuote } from "../../../src/services/cotizacionesLogic";
import { formatOperacionDate } from "../../../src/services/operacionesFiltersLogic";
import {
  getQuoteFlowLabel,
  getQuoteTransportDisplay,
  getQuoteValidityLabel,
} from "../../../src/services/cotizacionesLogic";
import { brand } from "../../theme/brand";
import { fonts } from "../../theme/typography";

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
  const routeHint =
    [from.name || quote.origin, to.name || quote.destination]
      .filter(Boolean)
      .join(" → ") || null;
  const icon = transportIcon(quote);

  return (
    <View style={styles.row}>
      <View style={[styles.accent, isExpired && styles.accentExpired]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>
            {quote.customerReference?.trim() || "Sin referencia"}
          </Text>
          <View style={styles.statusRow}>
            <View style={styles.flowChip}>
              <Text style={styles.flowChipText}>{flow}</Text>
            </View>
            <Text
              style={[styles.validityText, isExpired && styles.validityExpired]}
            >
              {validity}
            </Text>
          </View>
        </View>

        <View style={styles.routeRow}>
          <View style={styles.place}>
            <Text style={styles.code} numberOfLines={1}>
              {from.code}
            </Text>
            <Text style={styles.placeMeta}>Origen</Text>
          </View>

          <View style={styles.routeMid}>
            <View style={styles.routeLine} />
            <View style={styles.routeArrow}>
              <Ionicons name={icon} size={12} color={brand.primary} />
            </View>
            <View style={styles.routeLine} />
          </View>

          <View style={[styles.place, styles.placeEnd]}>
            <Text style={styles.code} numberOfLines={1}>
              {to.code}
            </Text>
            <Text style={styles.placeMeta}>Destino</Text>
          </View>
        </View>

        {routeHint ? (
          <Text style={styles.routeHint} numberOfLines={1}>
            {routeHint}
          </Text>
        ) : null}

        <Text style={styles.quoteNumber} numberOfLines={1}>
          {quote.number || "—"}
        </Text>

        <Text style={styles.dates}>
          {formatOperacionDate(quote.date)}
          <Text style={styles.datesSep}>  ·  </Text>
          {formatOperacionDate(quote.validUntil_Date)}
        </Text>

        <View style={styles.footerRow}>
          <Text style={styles.transport} numberOfLines={1}>
            {getQuoteTransportDisplay(quote)}
          </Text>
          {quote.transitDays != null ? (
            <Text style={styles.transit}>{quote.transitDays} días</Text>
          ) : (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={brand.mutedLight}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: brand.surface,
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(30, 58, 95, 0.08)",
  },
  accent: {
    width: 3,
    backgroundColor: brand.navy,
  },
  accentExpired: {
    backgroundColor: brand.mutedLight,
  },
  content: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  title: {
    flexShrink: 1,
    fontSize: 13,
    letterSpacing: 0.2,
    color: brand.navy,
    fontFamily: fonts.semiBold,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  flowChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(30, 58, 95, 0.08)",
  },
  flowChipText: {
    fontSize: 11,
    color: brand.navy,
    fontFamily: fonts.semiBold,
  },
  validityText: {
    fontSize: 11,
    color: brand.primary,
    fontFamily: fonts.semiBold,
  },
  validityExpired: {
    color: brand.muted,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  place: {
    flex: 1,
    minWidth: 0,
  },
  placeEnd: {
    alignItems: "flex-end",
  },
  code: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: brand.navy,
    fontFamily: fonts.bold,
  },
  placeMeta: {
    marginTop: 2,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: brand.mutedLight,
    fontFamily: fonts.medium,
  },
  routeMid: {
    width: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  routeLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(30, 58, 95, 0.25)",
  },
  routeArrow: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  routeHint: {
    fontSize: 12,
    color: brand.muted,
    fontFamily: fonts.regular,
    marginBottom: 6,
  },
  quoteNumber: {
    fontSize: 12,
    color: brand.muted,
    fontFamily: fonts.medium,
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  dates: {
    fontSize: 13,
    color: brand.inkSecondary,
    fontFamily: fonts.medium,
  },
  datesSep: {
    color: brand.mutedLight,
    fontFamily: fonts.regular,
  },
  footerRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  transport: {
    flex: 1,
    fontSize: 12,
    color: brand.mutedLight,
    fontFamily: fonts.regular,
  },
  transit: {
    fontSize: 12,
    color: brand.navy,
    fontFamily: fonts.semiBold,
  },
});
