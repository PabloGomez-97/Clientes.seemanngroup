import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { brand, radii } from "../../theme/brand";
import { fonts } from "../../theme/typography";
import { STATUS_TONE, type StatusToneKey } from "./statusTone";

type RouteTimelineProps = {
  mode: "air" | "ocean";
  origin: string;
  destination: string;
  progress?: number | null;
  departureLabel: string;
  departureValue: string;
  arrivalLabel: string;
  arrivalValue: string;
  toneKey?: StatusToneKey;
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
  toneKey = "neutral",
}: RouteTimelineProps) {
  const pct =
    typeof progress === "number"
      ? Math.min(Math.max(progress, 0), 100)
      : null;
  const icon = mode === "air" ? "airplane" : "boat";
  const tone = STATUS_TONE[toneKey];

  return (
    <View style={styles.card}>
      <View style={styles.routeRow}>
        <Text style={styles.code}>{origin || "—"}</Text>
        <View style={styles.connector}>
          <View style={styles.connectorLine} />
          <Ionicons
            name={icon}
            size={12}
            color={tone.accent}
            style={styles.connectorIcon}
          />
          <View style={styles.connectorLine} />
        </View>
        <Text style={styles.code}>{destination || "—"}</Text>
        {pct != null ? (
          <Text style={[styles.progressPct, { color: tone.text }]}>{pct}%</Text>
        ) : null}
      </View>

      {pct != null ? (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${pct}%`, backgroundColor: tone.accent },
            ]}
          />
        </View>
      ) : (
        <View style={styles.divider} />
      )}

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
  accentColor?: string;
};

export function MovementsTimeline({
  loading,
  items,
  accentColor = brand.navy,
}: MovementsTimelineProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Movimientos</Text>
      {loading ? (
        <ActivityIndicator color={brand.navy} style={{ marginTop: 8 }} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Sin movimientos registrados aún.</Text>
      ) : (
        <View style={styles.timeline}>
          {items.map((item, index) => {
            const last = index === items.length - 1;
            const isFirst = index === 0;
            return (
              <View key={item.key} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View
                    style={[
                      styles.timelineDot,
                      {
                        backgroundColor: isFirst
                          ? accentColor
                          : "rgba(30, 58, 95, 0.28)",
                      },
                    ]}
                  />
                  {!last ? <View style={styles.timelineLine} /> : null}
                </View>
                <View
                  style={[styles.timelineBody, last && styles.timelineBodyLast]}
                >
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
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    overflow: "hidden",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  code: {
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0.3,
    color: brand.navy,
    fontFamily: fonts.bold,
  },
  connector: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
    maxWidth: 88,
  },
  connectorLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(30, 58, 95, 0.28)",
  },
  connectorIcon: {
    marginHorizontal: 4,
  },
  progressPct: {
    marginLeft: 10,
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  progressTrack: {
    height: 2,
    borderRadius: 1,
    backgroundColor: "#eef2f7",
    marginBottom: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: brand.border,
    marginBottom: 12,
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
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: brand.mutedLight,
    fontFamily: fonts.semiBold,
    marginBottom: 3,
  },
  dateValue: {
    fontSize: 12,
    color: brand.inkSecondary,
    fontFamily: fonts.medium,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: brand.navy,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  empty: {
    fontSize: 13,
    color: brand.muted,
    fontFamily: fonts.regular,
  },
  timeline: {
    marginTop: 2,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
  },
  timelineRail: {
    width: 12,
    alignItems: "center",
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  timelineLine: {
    flex: 1,
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(30, 58, 95, 0.14)",
    marginTop: 4,
  },
  timelineBody: {
    flex: 1,
    paddingBottom: 14,
  },
  timelineBodyLast: {
    paddingBottom: 0,
  },
  movementTitle: {
    fontSize: 13,
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
