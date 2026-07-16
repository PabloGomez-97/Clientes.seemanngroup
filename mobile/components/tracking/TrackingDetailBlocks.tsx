import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type RouteTimelineProps = {
  mode: "air" | "ocean";
  origin: string;
  destination: string;
  progress?: number | null;
  departureLabel: string;
  departureValue: string;
  arrivalLabel: string;
  arrivalValue: string;
};

export function RouteTimelineCard({
  mode,
  origin,
  destination,
  progress,
  departureLabel,
  departureValue,
  arrivalLabel,
  arrivalValue,
}: RouteTimelineProps) {
  const pct =
    typeof progress === "number"
      ? Math.min(Math.max(progress, 0), 100)
      : null;
  const icon = mode === "air" ? "airplane" : "boat";

  return (
    <View style={styles.card}>
      <View style={styles.routeRow}>
        <View style={styles.place}>
          <Text style={styles.code}>{origin || "—"}</Text>
          <Text style={styles.placeMeta}>Origen</Text>
        </View>
        <View style={styles.routeMid}>
          <View style={styles.routeLine} />
          <View style={styles.routeArrow}>
            <Ionicons name={icon} size={14} color={brand.primary} />
          </View>
          <View style={styles.routeLine} />
        </View>
        <View style={[styles.place, styles.placeEnd]}>
          <Text style={styles.code}>{destination || "—"}</Text>
          <Text style={styles.placeMeta}>Destino</Text>
        </View>
      </View>

      {pct != null ? (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressText}>{pct}%</Text>
        </View>
      ) : null}

      <View style={styles.datesRow}>
        <View style={styles.dateCol}>
          <Text style={styles.dateLabel}>{departureLabel}</Text>
          <Text style={styles.dateValue}>{departureValue}</Text>
        </View>
        <View style={[styles.dateCol, styles.dateColEnd]}>
          <Text style={styles.dateLabel}>{arrivalLabel}</Text>
          <Text style={styles.dateValue}>{arrivalValue}</Text>
        </View>
      </View>
    </View>
  );
}

type MovementItem = {
  key: string;
  title: string;
  meta: string;
};

type MovementsTimelineProps = {
  loading: boolean;
  items: MovementItem[];
};

export function MovementsTimeline({ loading, items }: MovementsTimelineProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Movimientos</Text>
      {loading ? (
        <ActivityIndicator color={brand.primary} style={{ marginTop: 8 }} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Sin movimientos registrados aún.</Text>
      ) : (
        <View style={styles.timeline}>
          {items.map((item, index) => {
            const last = index === items.length - 1;
            return (
              <View key={item.key} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View style={styles.timelineDot} />
                  {!last ? <View style={styles.timelineLine} /> : null}
                </View>
                <View style={[styles.timelineBody, last && styles.timelineBodyLast]}>
                  <Text style={styles.movementTitle}>{item.title}</Text>
                  <Text style={styles.movementMeta}>{item.meta}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: brand.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(30, 58, 95, 0.08)",
    padding: 16,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  place: {
    flex: 1,
    minWidth: 0,
  },
  placeEnd: {
    alignItems: "flex-end",
  },
  code: {
    fontSize: 28,
    lineHeight: 32,
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
    width: 80,
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
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
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
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.muted,
    minWidth: 36,
    textAlign: "right",
  },
  datesRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateCol: {
    flex: 1,
  },
  dateColEnd: {
    alignItems: "flex-end",
  },
  dateLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: brand.mutedLight,
    fontFamily: fonts.semiBold,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 13,
    color: brand.inkSecondary,
    fontFamily: fonts.medium,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: brand.navy,
    marginBottom: 8,
  },
  empty: {
    fontSize: 13,
    color: brand.muted,
    fontFamily: fonts.regular,
  },
  timeline: {
    marginTop: 4,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
  },
  timelineRail: {
    width: 14,
    alignItems: "center",
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: brand.primary,
    marginTop: 4,
  },
  timelineLine: {
    flex: 1,
    width: 1,
    backgroundColor: "rgba(30, 58, 95, 0.15)",
    marginTop: 4,
  },
  timelineBody: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineBodyLast: {
    paddingBottom: 0,
  },
  movementTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: brand.ink,
    marginBottom: 2,
  },
  movementMeta: {
    fontSize: 12,
    color: brand.muted,
    fontFamily: fonts.regular,
  },
});
