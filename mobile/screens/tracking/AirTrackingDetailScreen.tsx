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
import { fetchAirShipmentDetail } from "../../services/shipsgoApi";
import type { TrackeosStackParamList } from "../../navigation/TrackeosStack";
import { brand, spacing } from "../../theme/brand";
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
  const status = AIR_STATUS_LABELS[shipment.status] || shipment.status;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>AWB</Text>
          <Text style={styles.title}>{shipment.awb_number}</Text>
          <Text style={styles.subtitle}>
            {shipment.airline?.name || "Sin aerolínea"}
          </Text>
          <View style={styles.statusChip}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{status}</Text>
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
          />
        ) : null}

        <TrackingEmbed transport="air" query={shipment.awb_number} height={340} />

        <MovementsTimeline
          loading={loading}
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
    gap: 14,
    paddingBottom: spacing.xl,
  },
  hero: {
    gap: 4,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: brand.mutedLight,
    fontFamily: fonts.semiBold,
  },
  title: {
    fontSize: 26,
    letterSpacing: -0.4,
    color: brand.navy,
    fontFamily: fonts.bold,
  },
  subtitle: {
    fontSize: 13,
    color: brand.muted,
    fontFamily: fonts.medium,
    marginBottom: 8,
  },
  statusChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: brand.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: brand.primary,
  },
  statusText: {
    color: brand.primary,
    fontFamily: fonts.semiBold,
    fontSize: 12,
  },
});
