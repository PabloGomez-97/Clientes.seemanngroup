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
import StatusDot from "../../components/tracking/StatusDot";
import {
  STATUS_TONE,
  toneForStatus,
} from "../../components/tracking/statusTone";
import { fetchOceanShipmentDetail } from "../../services/shipsgoApi";
import {
  getOceanDisplayTitle,
  getOceanEmbedQuery,
  isOceanDelayed,
} from "../../../src/services/shipsgoTrackingLogic";
import type { TrackeosStackParamList } from "../../navigation/TrackeosStack";
import { brand, radii, spacing } from "../../theme/brand";
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
  const delayed = isOceanDelayed(shipment);
  const status = delayed
    ? "Demorado"
    : OCEAN_STATUS_LABELS[shipment.status] || shipment.status;
  const toneKey = toneForStatus("ocean", shipment.status, delayed);
  const tone = STATUS_TONE[toneKey];
  const display = getOceanDisplayTitle(shipment);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroText}>
              <Text style={styles.kicker}>{display.kicker}</Text>
              <Text style={styles.title}>{display.title}</Text>
              <Text style={styles.subtitle}>
                {shipment.carrier?.name || "Sin naviera"}
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

        {display.secondaryKicker && display.secondaryTitle ? (
          <View style={styles.secondaryBlock}>
            <Text style={styles.secondaryLabel}>{display.secondaryKicker}</Text>
            <Text style={styles.secondaryValue}>{display.secondaryTitle}</Text>
          </View>
        ) : null}

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
            toneKey={toneKey}
          />
        ) : null}

        <TrackingEmbed
          transport="ocean"
          query={getOceanEmbedQuery(shipment)}
          height={340}
        />

        <MovementsTimeline
          loading={loading}
          accentColor={tone.accent}
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
    fontSize: 20,
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
  secondaryBlock: {
    marginTop: 4,
  },
  secondaryLabel: {
    fontSize: 12,
    color: brand.muted,
    fontFamily: fonts.semiBold,
  },
  secondaryValue: {
    marginTop: 4,
    fontSize: 14,
    color: brand.inkSecondary,
    fontFamily: fonts.semiBold,
  },
});
