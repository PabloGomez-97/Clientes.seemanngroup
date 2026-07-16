import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import { brand } from "../../theme/brand";
import { fonts } from "../../theme/typography";

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

  const carrier =
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
    typeof shipment.route?.transit_percentage === "number"
      ? Math.min(Math.max(shipment.route.transit_percentage, 0), 100)
      : null;

  const routeIcon = mode === "air" ? "airplane" : "boat";

  return (
    <View style={[styles.row, delayed && styles.rowDelayed]}>
      <View style={[styles.accent, delayed && styles.accentDelayed]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.number} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.statusChip}>
            {delayed ? <View style={styles.delayDot} /> : null}
            <Text style={styles.statusText} numberOfLines={1}>
              {delayed ? "Demorado" : statusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.routeRow}>
          <View style={styles.place}>
            <Text style={styles.code} numberOfLines={1}>
              {origin || "—"}
            </Text>
            <Text style={styles.placeMeta}>Origen</Text>
          </View>

          <View style={styles.routeMid}>
            <View style={styles.routeLine} />
            <View style={styles.routeArrow}>
              <Ionicons name={routeIcon} size={12} color={brand.primary} />
            </View>
            <View style={styles.routeLine} />
          </View>

          <View style={[styles.place, styles.placeEnd]}>
            <Text style={styles.code} numberOfLines={1}>
              {destination || "—"}
            </Text>
            <Text style={styles.placeMeta}>Destino</Text>
          </View>
        </View>

        {progress != null ? (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        ) : null}

        <View style={styles.footerRow}>
          <Text style={styles.carrier} numberOfLines={1}>
            {carrier}
          </Text>
          <Text style={styles.date}>Creado {formatDate(shipment.created_at)}</Text>
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
  rowDelayed: {
    borderColor: "#fecaca",
  },
  accent: {
    width: 3,
    backgroundColor: brand.navy,
  },
  accentDelayed: {
    backgroundColor: "#dc2626",
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
  number: {
    flexShrink: 1,
    fontSize: 12,
    letterSpacing: 0.6,
    color: brand.muted,
    fontFamily: fonts.semiBold,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: brand.primarySoft,
  },
  delayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#dc2626",
  },
  statusText: {
    fontSize: 11,
    color: brand.primary,
    fontFamily: fonts.semiBold,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  place: {
    flex: 1,
    minWidth: 0,
  },
  placeEnd: {
    alignItems: "flex-end",
  },
  code: {
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.6,
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
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#eef2f7",
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: brand.primary,
  },
  progressText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: brand.muted,
    minWidth: 34,
    textAlign: "right",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  carrier: {
    flex: 1,
    fontSize: 12,
    color: brand.mutedLight,
    fontFamily: fonts.regular,
  },
  date: {
    fontSize: 11,
    color: brand.mutedLight,
    fontFamily: fonts.medium,
  },
});
