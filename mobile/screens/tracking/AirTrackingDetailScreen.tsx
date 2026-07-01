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
  AIR_STATUS_LABELS,
  MOVEMENT_EVENT_LABELS,
  formatDateTime,
} from "../../../src/components/cliente/tracking/shipsgo/types";
import type { AirShipmentDetail } from "../../../src/components/cliente/tracking/shipsgo/types";
import TrackingEmbed from "../../components/tracking/TrackingEmbed";
import { fetchAirShipmentDetail } from "../../services/shipsgoApi";
import type { TrackeosStackParamList } from "../../navigation/TrackeosStack";
import { brand, radii, spacing } from "../../theme/brand";

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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{shipment.awb_number}</Text>
        <Text style={styles.subtitle}>
          {shipment.airline?.name || "Sin aerolínea"}
        </Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {AIR_STATUS_LABELS[shipment.status] || shipment.status}
          </Text>
        </View>

        {shipment.route ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ruta</Text>
            <Text style={styles.routeText}>
              {shipment.route.origin.location.iata} →{" "}
              {shipment.route.destination.location.iata}
            </Text>
            <Text style={styles.meta}>
              Progreso {shipment.route.transit_percentage}%
            </Text>
            <Text style={styles.meta}>
              Salida {formatDateTime(shipment.route.origin.date_of_dep)}
            </Text>
            <Text style={styles.meta}>
              Llegada estimada{" "}
              {formatDateTime(shipment.route.destination.date_of_rcf)}
            </Text>
          </View>
        ) : null}

        <TrackingEmbed transport="air" query={shipment.awb_number} />

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
                  {MOVEMENT_EVENT_LABELS[movement.event] || movement.event}
                </Text>
                <Text style={styles.meta}>
                  {movement.location.iata} · {formatDateTime(movement.timestamp)}
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
