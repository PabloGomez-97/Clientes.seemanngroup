import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useRoute } from "@react-navigation/native";
import {
  AIR_STATUS_LABELS,
  MOVEMENT_EVENT_LABELS,
  formatDateTime,
} from "../../../src/components/cliente/tracking/shipsgo/types";
import type { AirShipmentDetail } from "../../../src/components/cliente/tracking/shipsgo/types";
import TrackingEmbed from "../../components/tracking/TrackingEmbed";
import {
  MovementsTimeline,
  RouteTimelineCard,
} from "../../components/tracking/TrackingDetailBlocks";
import StatusDot from "../../components/tracking/StatusDot";
import {
  STATUS_TONE,
  toneForStatus,
} from "../../components/tracking/statusTone";
import { fetchAirShipmentDetail } from "../../services/shipsgoApi";
import { isAirDelayed } from "../../../src/services/shipsgoTrackingLogic";
import type { TrackeosStackParamList } from "../../navigation/TrackeosStack";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type RouteProps = RouteProp<TrackeosStackParamList, "AirDetail">;

export default function AirTrackingDetailScreen() {
  const { params } = useRoute<RouteProps>();
  const [detail, setDetail] = useState<AirShipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchAirShipmentDetail(params.shipment.id).then((data) => {
      if (!cancelled) {
        setDetail(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [params.shipment.id]);

  const shipment = detail || params.shipment;
  const movements = detail?.movements || [];
  const delayed = isAirDelayed(shipment);
  const status = delayed
    ? "Demorado"
    : AIR_STATUS_LABELS[shipment.status] || shipment.status;
  const toneKey = toneForStatus("air", shipment.status, delayed);
  const tone = STATUS_TONE[toneKey];

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroText}>
              <Text style={styles.kicker}>AWB</Text>
              <Text style={styles.title}>{shipment.awb_number}</Text>
              <Text style={styles.subtitle}>
                {shipment.airline?.name || "Sin aerolínea"}
              </Text>
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
              <StatusDot
                color={tone.accent}
                pulse={toneKey === "transit"}
              />
              <Text style={[styles.statusText, { color: tone.text }]}>
                {status}
              </Text>
            </View>
          </View>
        </View>

        {shipment.route ? (
          <RouteTimelineCard
            mode="air"
            origin={shipment.route.origin.location.iata}
            destination={shipment.route.destination.location.iata}
            progress={shipment.route.transit_percentage}
            departureLabel="Salida"
            departureValue={formatDateTime(shipment.route.origin.date_of_dep)}
            arrivalLabel="Llegada est."
            arrivalValue={formatDateTime(
              shipment.route.destination.date_of_rcf,
            )}
            toneKey={toneKey}
          />
        ) : null}

        <TrackingEmbed transport="air" query={shipment.awb_number} height={340} />

        <MovementsTimeline
          loading={loading}
          accentColor={tone.accent}
          items={movements.map((movement, index) => ({
            key: `${movement.timestamp}-${index}`,
            title: MOVEMENT_EVENT_LABELS[movement.event] || movement.event,
            meta: `${movement.location.iata} · ${formatDateTime(movement.timestamp)}`,
          }))}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  content: {
    padding: spacing.lg,
    gap: 12,
    paddingBottom: spacing.xl,
  },
  hero: {
    marginBottom: 2,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: brand.mutedLight,
    fontFamily: fonts.semiBold,
  },
  title: {
    marginTop: 2,
    fontSize: 22,
    letterSpacing: -0.3,
    color: brand.navy,
    fontFamily: fonts.bold,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: brand.muted,
    fontFamily: fonts.medium,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 2,
  },
  statusText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
  },
});
