import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useRoute } from "@react-navigation/native";
import {
  OCEAN_MOVEMENT_EVENT_LABELS,
  OCEAN_STATUS_LABELS,
  formatDateTime,
} from "../../../src/components/cliente/tracking/shipsgo/types";
import type { OceanShipmentDetail } from "../../../src/components/cliente/tracking/shipsgo/types";
import TrackingEmbed from "../../components/tracking/TrackingEmbed";
import {
  MovementsTimeline,
  RouteTimelineCard,
} from "../../components/tracking/TrackingDetailBlocks";
import { fetchOceanShipmentDetail } from "../../services/shipsgoApi";
import {
  getOceanEmbedQuery,
  getOceanTrackingLabel,
} from "../../../src/services/shipsgoTrackingLogic";
import type { TrackeosStackParamList } from "../../navigation/TrackeosStack";
import { brand, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type RouteProps = RouteProp<TrackeosStackParamList, "OceanDetail">;

export default function OceanTrackingDetailScreen() {
  const { params } = useRoute<RouteProps>();
  const [detail, setDetail] = useState<OceanShipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchOceanShipmentDetail(params.shipment.id).then((data) => {
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
  const movements =
    detail?.containers?.flatMap((container) => container.movements) || [];
  const status = OCEAN_STATUS_LABELS[shipment.status] || shipment.status;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Contenedor / Booking</Text>
          <Text style={styles.title}>{getOceanTrackingLabel(shipment)}</Text>
          <Text style={styles.subtitle}>
            {shipment.carrier?.name || "Sin naviera"}
          </Text>
          <View style={styles.statusChip}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>

        {shipment.route ? (
          <RouteTimelineCard
            mode="ocean"
            origin={shipment.route.port_of_loading.location.code}
            destination={shipment.route.port_of_discharge.location.code}
            progress={shipment.route.transit_percentage}
            departureLabel="Carga"
            departureValue={formatDateTime(
              shipment.route.port_of_loading.date_of_loading,
            )}
            arrivalLabel="Descarga est."
            arrivalValue={formatDateTime(
              shipment.route.port_of_discharge.date_of_discharge,
            )}
          />
        ) : null}

        <TrackingEmbed
          transport="ocean"
          query={getOceanEmbedQuery(shipment)}
          height={340}
        />

        <MovementsTimeline
          loading={loading}
          items={movements.map((movement, index) => ({
            key: `${movement.timestamp}-${index}`,
            title:
              OCEAN_MOVEMENT_EVENT_LABELS[movement.event] || movement.event,
            meta: `${movement.location.code} · ${formatDateTime(movement.timestamp)}`,
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
    fontSize: 24,
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
