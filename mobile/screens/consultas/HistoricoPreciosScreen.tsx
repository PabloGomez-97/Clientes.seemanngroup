import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
import {
  fetchHistoricalExplorerSnapshot,
  type ExplorerMode,
  type HistoricalExplorerPoint,
  type HistoricalRouteBundle,
  type HistoricalTierSeries,
} from "../../../src/components/quotes/Handlers/shared/historicalExplorerParse";
import ScreenHeader from "../../components/ui/ScreenHeader";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

const MODES: { key: ExplorerMode; label: string; hint: string }[] = [
  { key: "air", label: "Aéreo", hint: "Tramos por peso (kg)" },
  { key: "fcl", label: "FCL", hint: "Contenedores 20GP / 40HQ / 40NOR" },
  { key: "lcl", label: "LCL", hint: "Tarifa ocean freight W/M" },
];

type HistoryItem = {
  key: string;
  route: HistoricalRouteBundle;
  tier: HistoricalTierSeries;
  entityLabel: string;
  points: HistoricalExplorerPoint[];
  latest: HistoricalExplorerPoint | null;
  previous: HistoricalExplorerPoint | null;
  deltaPct: number | null;
  deltaAbs: number | null;
};

function buildItems(
  routes: HistoricalRouteBundle[],
  mode: ExplorerMode,
): HistoryItem[] {
  const list: HistoryItem[] = [];
  for (const route of routes.filter((r) => r.mode === mode)) {
    for (const tier of route.tiers) {
      const entity = tier.entities[0];
      const points = entity?.points || [];
      if (!points.length) continue;
      const latest = points[points.length - 1] ?? null;
      const previous =
        points.length > 1 ? points[points.length - 2] : null;
      let deltaPct: number | null = null;
      let deltaAbs: number | null = null;
      if (latest && previous && previous.value > 0) {
        deltaAbs = latest.value - previous.value;
        deltaPct = (deltaAbs / previous.value) * 100;
      }
      list.push({
        key: `${route.routeKey}-${tier.tierKey}-${entity?.entityKey || "main"}`,
        route,
        tier,
        entityLabel: entity?.entityLabel || "Mercado",
        points,
        latest,
        previous,
        deltaPct,
        deltaAbs,
      });
    }
  }
  return list
    .sort((a, b) => {
      const an = a.route.originLabel.localeCompare(b.route.originLabel, "es");
      if (an !== 0) return an;
      return a.route.destLabel.localeCompare(b.route.destLabel, "es");
    })
    .slice(0, 80);
}

function money(currency: string, value: number) {
  return `${currency} ${value.toLocaleString("es-CL", {
    maximumFractionDigits: 2,
  })}`;
}

function DeltaBadge({
  deltaPct,
  deltaAbs,
  currency,
}: {
  deltaPct: number | null;
  deltaAbs: number | null;
  currency: string;
}) {
  if (deltaPct == null || deltaAbs == null) {
    return (
      <View style={[styles.deltaPill, styles.deltaNeutral]}>
        <Text style={styles.deltaNeutralText}>Sin variación</Text>
      </View>
    );
  }
  const up = deltaAbs > 0;
  const flat = Math.abs(deltaAbs) < 0.0001;
  if (flat) {
    return (
      <View style={[styles.deltaPill, styles.deltaNeutral]}>
        <Text style={styles.deltaNeutralText}>Sin cambio</Text>
      </View>
    );
  }
  return (
    <View style={[styles.deltaPill, up ? styles.deltaUp : styles.deltaDown]}>
      <Ionicons
        name={up ? "arrow-up" : "arrow-down"}
        size={12}
        color={up ? "#b91c1c" : "#047857"}
      />
      <Text style={up ? styles.deltaUpText : styles.deltaDownText}>
        {up ? "+" : ""}
        {deltaPct.toFixed(1)}% · {up ? "+" : ""}
        {money(currency, deltaAbs)}
      </Text>
    </View>
  );
}

function HistoryDetailModal({
  item,
  onClose,
}: {
  item: HistoryItem | null;
  onClose: () => void;
}) {
  if (!item) return null;
  const currency = item.tier.currency || "USD";
  const chronology = [...item.points].reverse();

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.detailBackdrop}>
        <View style={styles.detailSheet}>
          <View style={styles.detailHandle} />
          <View style={styles.detailHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailEyebrow}>{item.tier.tierLabel}</Text>
              <Text style={styles.detailRoute}>
                {item.route.originLabel} → {item.route.destLabel}
              </Text>
              <Text style={styles.detailSub}>
                {item.entityLabel} · {item.route.countryLabel}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.detailClose}>
              <Ionicons name="close" size={20} color={brand.ink} />
            </Pressable>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Último precio registrado</Text>
            <Text style={styles.summaryValue}>
              {item.latest
                ? money(currency, item.latest.value)
                : "Sin dato"}
            </Text>
            <Text style={styles.summaryDate}>
              {item.latest?.label || "—"}
            </Text>
            <DeltaBadge
              deltaPct={item.deltaPct}
              deltaAbs={item.deltaAbs}
              currency={currency}
            />
          </View>

          <Text style={styles.timelineTitle}>Línea de tiempo de precios</Text>
          <Text style={styles.timelineHint}>
            Cada fila es una fecha de vigencia. Compara el valor con la
            observación anterior.
          </Text>

          <ScrollView
            style={{ maxHeight: 360 }}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <View style={styles.timelineCard}>
              <View style={styles.timelineHead}>
                <Text style={[styles.th, { flex: 1.2 }]}>Fecha</Text>
                <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>
                  Precio
                </Text>
                <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>
                  vs anterior
                </Text>
              </View>
              {chronology.map((point, index) => {
                const older = chronology[index + 1];
                let change = "—";
                let tone: "up" | "down" | "flat" = "flat";
                if (older) {
                  const diff = point.value - older.value;
                  if (Math.abs(diff) < 0.0001) {
                    change = "Igual";
                  } else {
                    const pct = (diff / older.value) * 100;
                    change = `${diff > 0 ? "+" : ""}${pct.toFixed(1)}%`;
                    tone = diff > 0 ? "up" : "down";
                  }
                }
                return (
                  <View key={`${point.dateKey}-${index}`} style={styles.timelineRow}>
                    <Text style={[styles.td, { flex: 1.2 }]}>{point.label}</Text>
                    <Text
                      style={[
                        styles.td,
                        styles.tdStrong,
                        { flex: 1, textAlign: "right" },
                      ]}
                    >
                      {money(currency, point.value)}
                    </Text>
                    <Text
                      style={[
                        styles.td,
                        {
                          flex: 1,
                          textAlign: "right",
                          color:
                            tone === "up"
                              ? "#b91c1c"
                              : tone === "down"
                                ? "#047857"
                                : brand.muted,
                        },
                      ]}
                    >
                      {change}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function HistoricoPreciosScreen() {
  const navigation = useNavigation();
  const [mode, setMode] = useState<ExplorerMode>("fcl");
  const [routes, setRoutes] = useState<HistoricalRouteBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<HistoryItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await fetchHistoricalExplorerSnapshot();
      setRoutes(snapshot.routes);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar histórico",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => buildItems(routes, mode), [mode, routes]);
  const modeMeta = MODES.find((m) => m.key === mode);

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const currency = item.tier.currency || "USD";
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => setSelected(item)}
      >
        <View style={styles.cardTop}>
          <Text style={styles.route} numberOfLines={2}>
            {item.route.originLabel} → {item.route.destLabel}
          </Text>
          <View style={styles.tierPill}>
            <Text style={styles.tierPillText}>{item.tier.tierLabel}</Text>
          </View>
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {item.entityLabel}
          {item.route.countryLabel ? ` · ${item.route.countryLabel}` : ""}
        </Text>
        <View style={styles.priceBlock}>
          <View>
            <Text style={styles.priceLabel}>Precio actual</Text>
            <Text style={styles.priceValue}>
              {item.latest ? money(currency, item.latest.value) : "—"}
            </Text>
            <Text style={styles.priceDate}>{item.latest?.label || ""}</Text>
          </View>
          <DeltaBadge
            deltaPct={item.deltaPct}
            deltaAbs={item.deltaAbs}
            currency={currency}
          />
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.tapHint}>
            Ver historial completo ({item.points.length} fechas)
          </Text>
          <Ionicons name="chevron-forward" size={16} color={brand.mutedLight} />
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Histórico de precios"
        subtitle="Comparación por ruta y producto"
        right={
          <Pressable style={styles.iconBtn} onPress={() => void load()}>
            <Ionicons name="refresh" size={18} color={brand.navy} />
          </Pressable>
        }
      />

      <View style={styles.modes}>
        {MODES.map((m) => (
          <Pressable
            key={m.key}
            style={[styles.modeBtn, mode === m.key && styles.modeBtnActive]}
            onPress={() => setMode(m.key)}
          >
            <Text
              style={[
                styles.modeText,
                mode === m.key && styles.modeTextActive,
              ]}
            >
              {m.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {modeMeta ? (
        <Text style={styles.modeHint}>{modeMeta.hint}</Text>
      ) : null}

      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => void load()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void load()}
              tintColor={brand.primary}
            />
          }
          ListHeaderComponent={
            <Text style={styles.intro}>
              Cada tarjeta muestra el último precio de una ruta. El porcentaje
              compara contra la fecha anterior. Toca una tarjeta para ver toda
              la línea de tiempo.
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>Sin histórico para este modo</Text>
            </View>
          }
        />
      )}

      <HistoryDetailModal item={selected} onClose={() => setSelected(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modes: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: 6,
  },
  modeBtn: {
    flex: 1,
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    paddingVertical: 10,
    alignItems: "center",
  },
  modeBtnActive: {
    backgroundColor: brand.primarySoft,
    borderColor: brand.primaryBorder,
  },
  modeText: { fontFamily: fonts.semiBold, color: brand.muted },
  modeTextActive: { color: brand.primary },
  modeHint: {
    paddingHorizontal: spacing.lg,
    marginBottom: 8,
    fontSize: 12,
    color: brand.muted,
  },
  intro: {
    fontSize: 13,
    color: brand.muted,
    lineHeight: 19,
    marginBottom: 10,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: 10 },
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
  },
  cardPressed: { backgroundColor: brand.canvasAlt },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  route: { flex: 1, fontFamily: fonts.semiBold, color: brand.ink, fontSize: 15 },
  tierPill: {
    backgroundColor: brand.navy,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    alignSelf: "flex-start",
  },
  tierPillText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  meta: { fontSize: 12, color: brand.muted, marginBottom: 12 },
  priceBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
  },
  priceLabel: { fontSize: 11, color: brand.muted, marginBottom: 2 },
  priceValue: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: brand.navy,
    letterSpacing: -0.4,
  },
  priceDate: { fontSize: 11, color: brand.muted, marginTop: 2 },
  deltaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  deltaUp: { backgroundColor: "#fef2f2" },
  deltaDown: { backgroundColor: "#ecfdf5" },
  deltaNeutral: { backgroundColor: brand.canvasAlt },
  deltaUpText: { fontSize: 11, fontWeight: "700", color: "#b91c1c" },
  deltaDownText: { fontSize: 11, fontWeight: "700", color: "#047857" },
  deltaNeutralText: { fontSize: 11, fontWeight: "600", color: brand.muted },
  cardFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: brand.borderLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tapHint: { fontSize: 12, color: brand.muted },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  error: { color: brand.muted, textAlign: "center", marginBottom: 12 },
  retry: {
    backgroundColor: brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  retryText: { color: "#fff", fontFamily: fonts.semiBold },
  empty: { color: brand.muted },
  detailBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "flex-end",
  },
  detailSheet: {
    backgroundColor: brand.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingHorizontal: spacing.lg,
    paddingBottom: 20,
  },
  detailHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: brand.border,
    marginTop: 10,
    marginBottom: 10,
  },
  detailHeader: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  detailEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: brand.primary,
    marginBottom: 4,
  },
  detailRoute: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: brand.ink,
    letterSpacing: -0.3,
  },
  detailSub: { marginTop: 4, fontSize: 12, color: brand.muted },
  detailClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brand.canvasAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryBox: {
    backgroundColor: "#0f2744",
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  summaryValue: {
    color: "#fff",
    fontSize: 28,
    fontFamily: fonts.bold,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  summaryDate: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  timelineTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: brand.ink,
    marginBottom: 4,
  },
  timelineHint: {
    fontSize: 12,
    color: brand.muted,
    marginBottom: 10,
    lineHeight: 17,
  },
  timelineCard: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  timelineHead: {
    flexDirection: "row",
    backgroundColor: brand.canvasAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  th: {
    fontSize: 11,
    fontWeight: "700",
    color: brand.muted,
    textTransform: "uppercase",
  },
  timelineRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: brand.borderLight,
  },
  td: { fontSize: 13, color: brand.inkSecondary },
  tdStrong: { fontFamily: fonts.semiBold, color: brand.ink },
});
