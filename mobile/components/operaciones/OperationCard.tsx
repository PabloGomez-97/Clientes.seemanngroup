import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AirShipment } from "../../../src/components/cliente/embarques/Handlers/HandlerAirShipments";
import type { GroundShipment } from "../../../src/components/cliente/embarques/Handlers/HandlerGroundShipments";
import type { OceanListItem } from "../../../src/services/linbisShipmentMappers";
import { formatOperacionCustomerReference, formatOperacionDate } from "../../../src/services/operacionesFiltersLogic";
import type { OperacionTrackingStatus } from "../../../src/services/operacionesTrackingLink";
import { brand, radii } from "../../theme/brand";
import { fonts } from "../../theme/typography";
import { STATUS_TONE } from "../tracking/statusTone";

type OperationCardProps =
  | {
      mode: "air";
      shipment: AirShipment;
      trackingStatus?: OperacionTrackingStatus;
      onOpenTracking?: () => void;
      routeLoading?: boolean;
    }
  | {
      mode: "ocean";
      shipment: OceanListItem;
      trackingStatus?: OperacionTrackingStatus;
      onOpenTracking?: () => void;
      routeLoading?: boolean;
    }
  | {
      mode: "ground";
      shipment: GroundShipment;
      routeLoading?: boolean;
    };

type Place = { code: string; name: string };

const MODE_ACCENT = {
  air: STATUS_TONE.transit.accent,
  ocean: "#0f766e",
  ground: brand.navy,
} as const;

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
  const reference =
    props.mode === "ground"
      ? props.shipment.number || "—"
      : formatOperacionCustomerReference(props.shipment.customerReference);

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

  const accent = MODE_ACCENT[props.mode];
  const showRouteLoading =
    Boolean(props.routeLoading) && from.code === "—" && to.code === "—";

  return (
    <View style={styles.card}>
      <View style={styles.body}>
        <View style={styles.mainRow}>
          <View style={styles.routeBlock}>
            {showRouteLoading ? (
              <View style={styles.routeLoading}>
                <ActivityIndicator size="small" color={brand.navy} />
                <Text style={styles.routeLoadingText}>Cargando ruta…</Text>
              </View>
            ) : (
              <>
                <Text style={styles.code}>{from.code}</Text>
                <View style={styles.connector}>
                  <View style={styles.connectorLine} />
                  <Ionicons
                    name={routeIcon}
                    size={11}
                    color={accent}
                    style={styles.connectorIcon}
                  />
                  <View style={styles.connectorLine} />
                </View>
                <Text style={styles.code}>{to.code}</Text>
              </>
            )}
          </View>

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
          ) : props.mode === "ground" ? (
            <Ionicons name="chevron-forward" size={16} color={brand.mutedLight} />
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaPrimary} numberOfLines={1}>
            {reference}
          </Text>
          {carrier ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaSecondary} numberOfLines={1}>
                {carrier}
              </Text>
            </>
          ) : null}
        </View>

        <Text style={styles.dates}>
          {departure}
          <Text style={styles.datesSep}>  ·  </Text>
          {arrival}
        </Text>
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
  routeLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 22,
  },
  routeLoadingText: {
    fontSize: 12,
    color: brand.muted,
    fontFamily: fonts.medium,
  },
  trackChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: STATUS_TONE.transit.soft,
    borderWidth: 1,
    borderColor: STATUS_TONE.transit.border,
  },
  trackDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: STATUS_TONE.transit.accent,
  },
  trackText: {
    fontSize: 11,
    color: STATUS_TONE.transit.text,
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
  dates: {
    marginTop: 4,
    fontSize: 11,
    color: brand.mutedLight,
    fontFamily: fonts.medium,
  },
  datesSep: {
    color: brand.mutedLight,
    fontFamily: fonts.regular,
  },
});
