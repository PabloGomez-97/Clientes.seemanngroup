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
import { brand, radii } from "../../theme/brand";
import { fonts } from "../../theme/typography";
import StatusDot from "./StatusDot";
import { STATUS_TONE, toneForStatus } from "./statusTone";

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
  const toneKey = toneForStatus(mode, shipment.status, delayed);
  const tone = STATUS_TONE[toneKey];

  return (
    <View
      style={[
        styles.card,
        toneKey === "delayed" && styles.cardDelayed,
        toneKey === "done" && styles.cardDone,
      ]}
    >
      <View style={styles.body}>
        <View style={styles.mainRow}>
          <View style={styles.routeBlock}>
            <Text style={styles.code}>{origin || "—"}</Text>
            <View style={styles.connector}>
              <View style={styles.connectorLine} />
              <Ionicons
                name={routeIcon}
                size={11}
                color={tone.accent}
                style={styles.connectorIcon}
              />
              <View style={styles.connectorLine} />
            </View>
            <Text style={styles.code}>{destination || "—"}</Text>
          </View>

          <View
            style={[
              styles.statusChip,
              {
                backgroundColor: tone.soft,
                borderColor: tone.border,
              },
            ]}
          >
            <StatusDot color={tone.accent} pulse={toneKey === "transit"} />
            <Text
              style={[styles.statusText, { color: tone.text }]}
              numberOfLines={1}
            >
              {delayed ? "Demorado" : statusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaPrimary} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaSecondary} numberOfLines={1}>
            {carrier}
          </Text>
          {progress != null ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaProgress}>{progress}%</Text>
            </>
          ) : null}
        </View>

        {shipment.tags.length > 0 ? (
          <View style={styles.tagsRow}>
            {shipment.tags.slice(0, 4).map((tag) => (
              <View key={tag.id} style={styles.tagChip}>
                <Text style={styles.tagText} numberOfLines={1}>
                  {tag.name}
                </Text>
              </View>
            ))}
            {shipment.tags.length > 4 ? (
              <Text style={styles.tagMore}>+{shipment.tags.length - 4}</Text>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.date}>Creado {formatDate(shipment.created_at)}</Text>
      </View>

      {progress != null ? (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%`, backgroundColor: tone.accent },
            ]}
          />
        </View>
      ) : null}
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
  cardDelayed: {
    borderColor: "#fecaca",
    backgroundColor: "#fffbfb",
  },
  cardDone: {
    borderColor: "#dcfce7",
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
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 0.4,
    color: brand.navy,
    fontFamily: fonts.bold,
  },
  connector: {
    flexDirection: "row",
    alignItems: "center",
    width: 52,
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
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "42%",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  statusText: {
    flexShrink: 1,
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
  metaProgress: {
    fontSize: 12,
    color: brand.navy,
    fontFamily: fonts.semiBold,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
    alignItems: "center",
  },
  tagChip: {
    maxWidth: "48%",
    backgroundColor: brand.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    color: brand.inkSecondary,
    fontFamily: fonts.medium,
  },
  tagMore: {
    fontSize: 11,
    color: brand.muted,
    fontFamily: fonts.medium,
  },
  date: {
    marginTop: 4,
    fontSize: 11,
    color: brand.mutedLight,
    fontFamily: fonts.medium,
  },
  progressTrack: {
    height: 2,
    backgroundColor: "#eef2f7",
  },
  progressFill: {
    height: 2,
  },
});
