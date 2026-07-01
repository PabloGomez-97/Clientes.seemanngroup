import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AirShipment } from "../../../src/components/cliente/embarques/Handlers/HandlerAirShipments";
import type { GroundShipment } from "../../../src/components/cliente/embarques/Handlers/HandlerGroundShipments";
import type { OceanListItem } from "../../../src/services/linbisShipmentMappers";
import {
  formatLocationName,
  formatOperacionDate,
} from "../../../src/services/operacionesFiltersLogic";
import type { OperacionTrackingStatus } from "../../../src/services/operacionesTrackingLink";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type OperationCardProps =
  | {
      mode: "air";
      shipment: AirShipment;
      trackingStatus?: OperacionTrackingStatus;
      onOpenTracking?: () => void;
    }
  | {
      mode: "ocean";
      shipment: OceanListItem;
      trackingStatus?: OperacionTrackingStatus;
      onOpenTracking?: () => void;
    }
  | {
      mode: "ground";
      shipment: GroundShipment;
    };

const MODE_META = {
  air: { icon: "airplane-outline" as const, label: "Aéreo" },
  ocean: { icon: "boat-outline" as const, label: "Marítimo" },
  ground: { icon: "bus-outline" as const, label: "Terrestre" },
};

export default function OperationCard(props: OperationCardProps) {
  const meta = MODE_META[props.mode];
  const number =
    props.mode === "ground"
      ? props.shipment.number
      : props.shipment.number || "-";

  const routeLabel =
    props.mode === "air"
      ? `${formatLocationName(props.shipment.executedAt ?? props.shipment.origin)} → ${formatLocationName(props.shipment.destination)}`
      : props.mode === "ocean"
        ? `${formatLocationName(props.shipment.executedAt)} → ${formatLocationName(props.shipment.destination)}`
        : `${props.shipment.from || "-"} → ${props.shipment.to || "-"}`;

  const departure =
    props.mode === "air"
      ? formatOperacionDate(props.shipment.departure)
      : props.mode === "ocean"
        ? formatOperacionDate(props.shipment.departureDate)
        : formatOperacionDate(props.shipment.departure);

  const arrival =
    props.mode === "air"
      ? formatOperacionDate(props.shipment.arrival)
      : props.mode === "ocean"
        ? formatOperacionDate(props.shipment.arrivalDate)
        : formatOperacionDate(props.shipment.arrival);

  const carrier =
    props.mode === "air" || props.mode === "ocean"
      ? props.shipment.carrier?.name
      : props.shipment.carrier;

  const reference =
    props.mode === "ground"
      ? props.shipment.customerReference
      : props.shipment.customerReference;

  const trackingStatus =
    props.mode === "ground" ? undefined : props.trackingStatus;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.modeBadge}>
          <Ionicons name={meta.icon} size={14} color={brand.navy} />
          <Text style={styles.modeText}>{meta.label}</Text>
        </View>
        {trackingStatus?.isTracked ? (
          <Pressable
            style={styles.trackingBadge}
            onPress={props.mode !== "ground" ? props.onOpenTracking : undefined}
          >
            <Ionicons name="navigate" size={12} color="#fff" />
            <Text style={styles.trackingBadgeText}>Seguimiento activo</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.number}>{number}</Text>
      <Text style={styles.route} numberOfLines={2}>
        {routeLabel}
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Salida</Text>
          <Text style={styles.metaValue}>{departure}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Llegada</Text>
          <Text style={styles.metaValue}>{arrival}</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText} numberOfLines={1}>
          {carrier || "Sin transportista"}
        </Text>
        {reference ? (
          <Text style={styles.refText} numberOfLines={1}>
            Ref: {reference}
          </Text>
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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(30, 58, 95, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  modeText: {
    fontSize: 11,
    fontWeight: "600",
    color: brand.navy,
  },
  trackingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: brand.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  trackingBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  number: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: brand.ink,
    marginBottom: 4,
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
    gap: 2,
  },
  footerText: {
    fontSize: 12,
    color: brand.muted,
  },
  refText: {
    fontSize: 12,
    color: brand.inkSecondary,
    fontWeight: "600",
  },
});
