import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
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
  type HistoricalRouteBundle,
  type HistoricalTierSeries,
} from "../../../src/components/quotes/Handlers/shared/historicalExplorerParse";
import ScreenHeader from "../../components/ui/ScreenHeader";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

const MODES: { key: ExplorerMode; label: string }[] = [
  { key: "air", label: "Aéreo" },
  { key: "fcl", label: "FCL" },
  { key: "lcl", label: "LCL" },
];

type ChartItem = {
  key: string;
  route: HistoricalRouteBundle;
  tier: HistoricalTierSeries;
};

function MiniBars({ points }: { points: { label: string; value: number }[] }) {
  const max = Math.max(...points.map((p) => p.value), 1);
  const last = points.slice(-8);
  return (
    <View style={styles.bars}>
      {last.map((p, i) => (
        <View key={`${p.label}-${i}`} style={styles.barCol}>
          <View
            style={[
              styles.bar,
              { height: Math.max(6, (p.value / max) * 56) },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

export default function HistoricoPreciosScreen() {
  const navigation = useNavigation();
  const [mode, setMode] = useState<ExplorerMode>("fcl");
  const [routes, setRoutes] = useState<HistoricalRouteBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await fetchHistoricalExplorerSnapshot();
      setRoutes(snapshot.routes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar histórico");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => {
    const filtered = routes.filter((r) => r.mode === mode);
    const list: ChartItem[] = [];
    for (const route of filtered.slice(0, 40)) {
      for (const tier of route.tiers.slice(0, 1)) {
        list.push({
          key: `${route.routeKey}-${tier.tierKey}`,
          route,
          tier,
        });
      }
    }
    return list;
  }, [mode, routes]);

  const renderItem = ({ item }: { item: ChartItem }) => {
    const entity = item.tier.entities[0];
    const points = (entity?.points || []).map((p) => ({
      label: p.label,
      value: p.value,
    }));
    const latest = points[points.length - 1];
    const first = points[0];
    const delta =
      latest && first && first.value
        ? ((latest.value - first.value) / first.value) * 100
        : 0;

    return (
      <View style={styles.card}>
        <Text style={styles.route} numberOfLines={2}>
          {item.route.originLabel} → {item.route.destLabel}
        </Text>
        <Text style={styles.tier}>
          {item.tier.tierLabel}
          {entity?.entityLabel ? ` · ${entity.entityLabel}` : ""}
        </Text>
        {points.length > 1 ? <MiniBars points={points} /> : null}
        <View style={styles.footer}>
          <Text style={styles.price}>
            {latest
              ? `${item.tier.currency || "USD"} ${latest.value}`
              : "Sin datos"}
          </Text>
          <Text
            style={[
              styles.delta,
              delta > 0 ? styles.up : delta < 0 ? styles.down : null,
            ]}
          >
            {Number.isFinite(delta)
              ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`
              : "—"}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Histórico de precios"
        subtitle="Evolución por ruta"
        onBack={() => navigation.goBack()}
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
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>Sin histórico para este modo</Text>
            </View>
          }
        />
      )}
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
    marginBottom: 10,
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: 10 },
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
  },
  route: { fontFamily: fonts.semiBold, color: brand.ink, fontSize: 14 },
  tier: { marginTop: 2, fontSize: 12, color: brand.muted, marginBottom: 10 },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 64,
    marginBottom: 10,
  },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  bar: {
    width: "80%",
    backgroundColor: brand.primary,
    borderRadius: 4,
    opacity: 0.85,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: { fontFamily: fonts.bold, color: brand.navy, fontSize: 14 },
  delta: { fontSize: 12, color: brand.muted, fontWeight: "700" },
  up: { color: "#b91c1c" },
  down: { color: "#047857" },
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
});
