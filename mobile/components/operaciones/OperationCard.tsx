import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AirShipment } from "../../../src/components/cliente/embarques/Handlers/HandlerAirShipments";
import type { GroundShipment } from "../../../src/components/cliente/embarques/Handlers/HandlerGroundShipments";
import type { OceanListItem } from "../../../src/services/linbisShipmentMappers";
import { formatOperacionDate } from "../../../src/services/operacionesFiltersLogic";
import type { OperacionTrackingStatus } from "../../../src/services/operacionesTrackingLink";
import { brand } from "../../theme/brand";
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

type Place = { code: string; name: string };

function parsePlace(
  location?: { code?: string; name?: string } | string | null,
): Place {
  if (!location) return { code: "—", name: "" };
  if (typeof location === "string") {
    const raw = location.trim();
    if (!raw) return { code: "—", name: "" };
    const match = raw.match(/\(([A-Z0-9]{2,5})\)\s*$/i);
    if (match) {
      return {
        code: match[1].toUpperCase(),
        name: raw.replace(match[0], "").trim(),
      };
    }
    if (/^[A-Z0-9]{2,5}$/i.test(raw)) {
      return { code: raw.toUpperCase(), name: "" };
    }
    const words = raw.split(/\s+/);
    const short =
      words.length === 1
        ? raw.slice(0, 12)
        : words
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase();
    return { code: short.slice(0, 6) || "—", name: raw };
  }
  const code = location.code?.trim().toUpperCase();
  const name = location.name?.trim() || "";
  if (code) return { code, name };
  if (name) return parsePlace(name);
  return { code: "—", name: "" };
}

export default function OperationCard(props: OperationCardProps) {
  const number =
    props.mode === "ground"
      ? props.shipment.number
      : props.shipment.number || "—";

  const from: Place =
    props.mode === "air"
      ? parsePlace(props.shipment.executedAt ?? props.shipment.origin)
      : props.mode === "ocean"
        ? parsePlace(props.shipment.executedAt)
        : parsePlace(props.shipment.from);

  const to: Place =
    props.mode === "air"
      ? parsePlace(props.shipment.destination)
      : props.mode === "ocean"
        ? parsePlace(props.shipment.destination)
        : parsePlace(props.shipment.to);

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

  const trackingStatus =
    props.mode === "ground" ? undefined : props.trackingStatus;

  const routeIcon =
    props.mode === "air"
      ? ("airplane" as const)
      : props.mode === "ocean"
        ? ("boat" as const)
        : ("bus" as const);

  const routeHint =
    [from.name, to.name].filter(Boolean).join(" → ") || null;

  return (
    <View style={styles.row}>
      <View style={styles.accent} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.number}>{number}</Text>
          {trackingStatus?.isTracked ? (
            <Pressable
              onPress={
                props.mode !== "ground" ? props.onOpenTracking : undefined
              }
              hitSlop={8}
              style={styles.trackChip}
            >
              <View style={styles.trackDot} />
              <Text style={styles.trackText}>Seguimiento</Text>
            </Pressable>
          ) : (
            <Ionicons name="chevron-forward" size={16} color={brand.mutedLight} />
          )}
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
              <Ionicons name={routeIcon} size={12} color={brand.primary} />
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

        <Text style={styles.dates}>
          {departure}
          <Text style={styles.datesSep}>  ·  </Text>
          {arrival}
        </Text>

        {carrier ? (
          <Text style={styles.carrier} numberOfLines={1}>
            {carrier}
          </Text>
        ) : null}
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
  },
  number: {
    fontSize: 12,
    letterSpacing: 0.8,
    color: brand.muted,
    fontFamily: fonts.semiBold,
    textTransform: "uppercase",
  },
  trackChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: brand.primarySoft,
  },
  trackDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: brand.primary,
  },
  trackText: {
    fontSize: 11,
    color: brand.primary,
    fontFamily: fonts.semiBold,
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
  routeHint: {
    fontSize: 12,
    color: brand.muted,
    fontFamily: fonts.regular,
    marginBottom: 10,
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
  carrier: {
    marginTop: 6,
    fontSize: 12,
    color: brand.mutedLight,
    fontFamily: fonts.regular,
  },
});
