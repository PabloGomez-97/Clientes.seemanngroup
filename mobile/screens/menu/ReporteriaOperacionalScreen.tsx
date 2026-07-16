import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useReporteriaOperacional } from "../../hooks/useReporteria";
import { brand, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

const MODE_COLOR = {
  air: "#0ea5e9",
  sea: "#1e3a5f",
  ground: "#64748b",
} as const;

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("es-CL");
}

function fmtDec(n: number, digits = 1): string {
  return n.toLocaleString("es-CL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function KpiTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View style={styles.kpi}>
      <View style={styles.kpiAccent} />
      <View style={styles.kpiBody}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text
          style={styles.kpiValue}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {value}
        </Text>
        {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ShareBar({
  label,
  count,
  pct,
  color,
}: {
  label: string;
  count: number;
  pct: number;
  color: string;
}) {
  return (
    <View style={styles.shareRow}>
      <View style={styles.shareMeta}>
        <Text style={styles.shareLabel}>{label}</Text>
        <Text style={styles.shareCount}>
          {fmtInt(count)} · {fmtDec(pct, 0)}%
        </Text>
      </View>
      <View style={styles.shareTrack}>
        <View
          style={[
            styles.shareFill,
            { width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function RankRow({
  rank,
  label,
  count,
  pct,
}: {
  rank: number;
  label: string;
  count: number;
  pct: number;
}) {
  return (
    <View style={styles.rankRow}>
      <Text style={styles.rankIndex}>{rank}</Text>
      <View style={styles.rankBody}>
        <Text style={styles.rankLabel} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.shareTrack}>
          <View
            style={[
              styles.shareFill,
              {
                width: `${Math.min(100, Math.max(0, pct))}%`,
                backgroundColor: brand.primary,
              },
            ]}
          />
        </View>
      </View>
      <Text style={styles.rankCount}>{fmtInt(count)}</Text>
    </View>
  );
}

function MonthBars({
  monthly,
}: {
  monthly: Array<{
    label: string;
    total: number;
    air: number;
    sea: number;
    ground: number;
  }>;
}) {
  const max = Math.max(...monthly.map((m) => m.total), 1);
  const barMax = 88;
  return (
    <View style={styles.monthWrap}>
      {monthly.map((m) => {
        const h = Math.max(4, Math.round((m.total / max) * barMax));
        return (
          <View key={m.label} style={styles.monthCol}>
            <Text style={styles.monthValue}>{m.total || ""}</Text>
            <View style={[styles.monthBarTrack, { height: barMax }]}>
              <View style={[styles.monthBarFill, { height: h }]} />
            </View>
            <Text style={styles.monthLabel} numberOfLines={1}>
              {m.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function ReporteriaOperacionalScreen() {
  const navigation = useNavigation();
  const { activeUsername, dashboard, sampleSize, loading, error, refresh } =
    useReporteriaOperacional();

  const d = dashboard;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={26} color={brand.navy} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Reportería operacional</Text>
          {activeUsername ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {activeUsername}
            </Text>
          ) : null}
        </View>
        <Pressable style={styles.iconBtn} onPress={() => void refresh()}>
          <Ionicons name="refresh" size={18} color={brand.navy} />
        </Pressable>
      </View>

      {loading && sampleSize === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
          <Text style={styles.loadingText}>Calculando indicadores...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color={brand.muted} />
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => void refresh()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void refresh()}
              tintColor={brand.primary}
            />
          }
        >
          <View style={styles.kpiGrid}>
            <KpiTile label="Embarques" value={fmtInt(d.total)} />
            <KpiTile
              label="Aéreo"
              value={fmtInt(d.air)}
              sub={d.total > 0 ? `${fmtDec((d.air / d.total) * 100, 0)}%` : undefined}
            />
            <KpiTile
              label="Marítimo"
              value={fmtInt(d.sea)}
              sub={d.total > 0 ? `${fmtDec((d.sea / d.total) * 100, 0)}%` : undefined}
            />
            <KpiTile
              label="Terrestre"
              value={fmtInt(d.ground)}
              sub={
                d.total > 0
                  ? `${fmtDec((d.ground / d.total) * 100, 0)}%`
                  : undefined
              }
            />
            <KpiTile label="Piezas" value={fmtInt(d.pieces)} />
            <KpiTile label="Peso" value={fmtInt(d.weightKg)} sub="kg" />
            <KpiTile label="Volumen" value={fmtInt(d.volumeM3)} sub="m³" />
            <KpiTile
              label="Tránsito prom."
              value={d.avgTransitDays > 0 ? fmtDec(d.avgTransitDays, 1) : "—"}
              sub="días"
            />
          </View>

          {d.modeShare.some((m) => m.count > 0) ? (
            <Section title="Distribución por modo">
              {d.modeShare
                .filter((m) => m.count > 0)
                .map((m) => (
                  <ShareBar
                    key={m.key}
                    label={m.label}
                    count={m.count}
                    pct={m.pct}
                    color={MODE_COLOR[m.key]}
                  />
                ))}
            </Section>
          ) : null}

          {d.monthly.length > 0 ? (
            <Section title="Tendencia mensual">
              <MonthBars monthly={d.monthly} />
            </Section>
          ) : null}

          {d.topRoutes.length > 0 ? (
            <Section title="Top rutas">
              {d.topRoutes.map((r, i) => (
                <RankRow
                  key={r.route}
                  rank={i + 1}
                  label={r.route}
                  count={r.count}
                  pct={r.pct}
                />
              ))}
            </Section>
          ) : null}

          {d.perfByMode.some((m) => m.stats.count > 0) ? (
            <Section title="Rendimiento por modo">
              {d.perfByMode
                .filter((m) => m.stats.count > 0)
                .map((m) => (
                  <View key={m.key} style={styles.perfCard}>
                    <View style={styles.perfHead}>
                      <View
                        style={[
                          styles.perfDot,
                          { backgroundColor: MODE_COLOR[m.key] },
                        ]}
                      />
                      <Text style={styles.perfTitle}>{m.label}</Text>
                      <Text style={styles.perfCount}>
                        {fmtInt(m.stats.count)}
                      </Text>
                    </View>
                    <View style={styles.perfMetrics}>
                      <View style={styles.perfMetric}>
                        <Text style={styles.perfMetricLabel}>Tránsito</Text>
                        <Text style={styles.perfMetricValue}>
                          {m.stats.avgTransitDays > 0
                            ? `${fmtDec(m.stats.avgTransitDays, 1)} d`
                            : "—"}
                        </Text>
                      </View>
                      <View style={styles.perfMetric}>
                        <Text style={styles.perfMetricLabel}>Peso prom.</Text>
                        <Text style={styles.perfMetricValue}>
                          {m.stats.avgWeightKg > 0
                            ? `${fmtInt(m.stats.avgWeightKg)} kg`
                            : "—"}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
            </Section>
          ) : null}

          {d.total === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons
                name="analytics-outline"
                size={40}
                color={brand.mutedLight}
              />
              <Text style={styles.emptyTitle}>Sin datos operacionales</Text>
              <Text style={styles.empty}>
                No hay embarques registrados para calcular indicadores.
              </Text>
            </View>
          ) : (
            <Text style={styles.footnote}>
              Indicadores calculados sobre {fmtInt(sampleSize)} embarques.
            </Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: 8,
  },
  backBtn: {
    marginLeft: -4,
    paddingVertical: 4,
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: brand.navy,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: brand.muted,
    fontFamily: fonts.medium,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: "rgba(30, 58, 95, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl + 8,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.md,
  },
  kpi: {
    width: "48.5%",
    flexGrow: 1,
    flexBasis: "46%",
    flexDirection: "row",
    backgroundColor: brand.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(30, 58, 95, 0.08)",
    overflow: "hidden",
    minHeight: 72,
  },
  kpiAccent: {
    width: 3,
    backgroundColor: brand.navy,
  },
  kpiBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
  },
  kpiLabel: {
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: brand.mutedLight,
    fontFamily: fonts.semiBold,
    marginBottom: 2,
  },
  kpiValue: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: brand.navy,
    letterSpacing: -0.3,
  },
  kpiSub: {
    marginTop: 2,
    fontSize: 11,
    color: brand.muted,
    fontFamily: fonts.medium,
  },
  section: {
    backgroundColor: brand.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(30, 58, 95, 0.08)",
    padding: 14,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: brand.mutedLight,
    fontFamily: fonts.semiBold,
    marginBottom: 12,
  },
  shareRow: {
    marginBottom: 12,
  },
  shareMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 8,
  },
  shareLabel: {
    fontSize: 13,
    color: brand.navy,
    fontFamily: fonts.semiBold,
  },
  shareCount: {
    fontSize: 12,
    color: brand.muted,
    fontFamily: fonts.medium,
  },
  shareTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(30, 58, 95, 0.08)",
    overflow: "hidden",
  },
  shareFill: {
    height: "100%",
    borderRadius: 3,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  rankIndex: {
    width: 18,
    fontSize: 13,
    fontFamily: fonts.bold,
    color: brand.mutedLight,
  },
  rankBody: {
    flex: 1,
    gap: 5,
  },
  rankLabel: {
    fontSize: 13,
    color: brand.navy,
    fontFamily: fonts.semiBold,
  },
  rankCount: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: brand.navy,
    minWidth: 28,
    textAlign: "right",
  },
  monthWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 6,
    paddingTop: 4,
  },
  monthCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  monthValue: {
    fontSize: 10,
    color: brand.muted,
    fontFamily: fonts.medium,
    marginBottom: 4,
    minHeight: 12,
  },
  monthBarTrack: {
    width: "70%",
    justifyContent: "flex-end",
    backgroundColor: "rgba(30, 58, 95, 0.06)",
    borderRadius: 6,
    overflow: "hidden",
  },
  monthBarFill: {
    width: "100%",
    backgroundColor: brand.primary,
    borderRadius: 6,
  },
  monthLabel: {
    marginTop: 6,
    fontSize: 10,
    color: brand.muted,
    fontFamily: fonts.medium,
  },
  perfCard: {
    backgroundColor: brand.canvasAlt,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  perfHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  perfDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  perfTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  perfCount: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: brand.muted,
  },
  perfMetrics: {
    flexDirection: "row",
    gap: 12,
  },
  perfMetric: {
    flex: 1,
  },
  perfMetricLabel: {
    fontSize: 11,
    color: brand.mutedLight,
    fontFamily: fonts.medium,
    marginBottom: 2,
  },
  perfMetricValue: {
    fontSize: 14,
    color: brand.navy,
    fontFamily: fonts.semiBold,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: 10,
  },
  loadingText: {
    color: brand.muted,
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  error: {
    color: brand.muted,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
  },
  retry: {
    marginTop: 4,
    backgroundColor: brand.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: "#fff", fontFamily: fonts.semiBold },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: brand.navy,
    marginTop: 4,
  },
  empty: {
    color: brand.muted,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 260,
  },
  footnote: {
    textAlign: "center",
    color: brand.mutedLight,
    fontSize: 11,
    marginTop: 4,
    marginBottom: 8,
    fontFamily: fonts.medium,
  },
});
