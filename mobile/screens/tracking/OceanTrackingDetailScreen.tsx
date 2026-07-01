import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useRoute } from "@react-navigation/native";
import {
  OCEAN_MOVEMENT_EVENT_LABELS,
  OCEAN_STATUS_LABELS,
  formatDateTime,
} from "../../../src/components/cliente/tracking/shipsgo/types";
import type { OceanShipmentDetail } from "../../../src/components/cliente/tracking/shipsgo/types";
import TrackingEmbed from "../../components/tracking/TrackingEmbed";
import { fetchOceanShipmentDetail } from "../../services/shipsgoApi";
import { getOceanEmbedQuery, getOceanTrackingLabel } from "../../../src/services/shipsgoTrackingLogic";
import type { TrackeosStackParamList } from "../../navigation/TrackeosStack";
import { brand, radii, spacing } from "../../theme/brand";

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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{getOceanTrackingLabel(shipment)}</Text>
        <Text style={styles.subtitle}>
          {shipment.carrier?.name || "Sin naviera"}
        </Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {OCEAN_STATUS_LABELS[shipment.status] || shipment.status}
          </Text>
        </View>

        {shipment.route ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ruta</Text>
            <Text style={styles.routeText}>
              {shipment.route.port_of_loading.location.code} →{" "}
              {shipment.route.port_of_discharge.location.code}
            </Text>
            <Text style={styles.meta}>
              Progreso {shipment.route.transit_percentage}%
            </Text>
            <Text style={styles.meta}>
              Carga {formatDateTime(shipment.route.port_of_loading.date_of_loading)}
            </Text>
            <Text style={styles.meta}>
              Descarga estimada{" "}
              {formatDateTime(
                shipment.route.port_of_discharge.date_of_discharge,
              )}
            </Text>
          </View>
        ) : null}

        <TrackingEmbed
          transport="ocean"
          query={getOceanEmbedQuery(shipment)}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Movimientos</Text>
          {loading ? (
            <ActivityIndicator color={brand.primary} />
          ) : movements.length === 0 ? (
            <Text style={styles.meta}>Sin movimientos registrados aún.</Text>
          ) : (
            movements.map((movement, index) => (
              <View key={`${movement.timestamp}-${index}`} style={styles.movement}>
                <Text style={styles.movementEvent}>
                  {OCEAN_MOVEMENT_EVENT_LABELS[movement.event] ||
                    movement.event}
                </Text>
                <Text style={styles.meta}>
                  {movement.location.code} ·{" "}
                  {formatDateTime(movement.timestamp)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  content: {
    padding: spacing.lg,
    gap: 16,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: brand.ink,
  },
  subtitle: {
    fontSize: 14,
    color: brand.muted,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: brand.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: brand.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: brand.ink,
    marginBottom: 4,
  },
  routeText: {
    fontSize: 18,
    fontWeight: "700",
    color: brand.navy,
  },
  meta: {
    fontSize: 13,
    color: brand.muted,
  },
  movement: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: brand.borderLight,
  },
  movementEvent: {
    fontSize: 14,
    fontWeight: "600",
    color: brand.ink,
  },
});
