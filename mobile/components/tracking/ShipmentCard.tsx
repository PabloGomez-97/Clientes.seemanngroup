import { StyleSheet, Text, View } from "react-native";
import {
  AIR_STATUS_LABELS,
  OCEAN_STATUS_LABELS,
  formatDate,
} from "../../../src/components/cliente/tracking/shipsgo/types";
import type {
  AirShipment,
  OceanShipment,
} from "../../../src/components/cliente/tracking/shipsgo/types";
import {
  getOceanTrackingLabel,
  isAirDelayed,
  isOceanDelayed,
} from "../../../src/services/shipsgoTrackingLogic";
import { brand, radii } from "../../theme/brand";

type ShipmentCardProps =
  | {
      mode: "air";
      shipment: AirShipment;
    }
  | {
      mode: "ocean";
      shipment: OceanShipment;
    };

export default function ShipmentCard({ mode, shipment }: ShipmentCardProps) {
  const delayed =
    mode === "air" ? isAirDelayed(shipment) : isOceanDelayed(shipment);
  const statusLabel =
    mode === "air"
      ? AIR_STATUS_LABELS[shipment.status] || shipment.status
      : OCEAN_STATUS_LABELS[shipment.status] || shipment.status;

  const title =
    mode === "air" ? shipment.awb_number : getOceanTrackingLabel(shipment);

  const subtitle =
    mode === "air"
      ? shipment.airline?.name || "Sin aerolínea"
      : shipment.carrier?.name || "Sin naviera";

  const origin =
    mode === "air"
      ? shipment.route?.origin.location.iata
      : shipment.route?.port_of_loading.location.code;

  const destination =
    mode === "air"
      ? shipment.route?.destination.location.iata
      : shipment.route?.port_of_discharge.location.code;

  const progress =
    mode === "air"
      ? shipment.route?.transit_percentage
      : shipment.route?.transit_percentage;

  return (
    <View style={[styles.card, delayed && styles.cardDelayed]}>
      {delayed ? (
        <Text style={styles.delayBanner}>Posible retraso</Text>
      ) : null}
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.routeRow}>
        <Text style={styles.routeCode}>{origin || "—"}</Text>
        <Text style={styles.routeArrow}>→</Text>
        <Text style={styles.routeCode}>{destination || "—"}</Text>
      </View>

      {typeof progress === "number" ? (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(progress, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      ) : null}

      <Text style={styles.date}>Creado {formatDate(shipment.created_at)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    padding: 16,
    marginBottom: 12,
  },
  cardDelayed: {
    borderColor: "#fecaca",
    backgroundColor: "#fffafa",
  },
  delayBanner: {
    color: "#b91c1c",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: brand.ink,
  },
  subtitle: {
    fontSize: 12,
    color: brand.muted,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: brand.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: brand.primary,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  routeCode: {
    fontSize: 15,
    fontWeight: "700",
    color: brand.navy,
  },
  routeArrow: {
    color: brand.mutedLight,
  },
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#eef2f7",
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: brand.primary,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: brand.inkSecondary,
    minWidth: 34,
  },
  date: {
    fontSize: 11,
    color: brand.muted,
  },
});
