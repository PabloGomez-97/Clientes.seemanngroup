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
  AIR_TIER_ORDER,
  FCL_TIER_ORDER,
  fetchHistoricalExplorerSnapshot,
  type ExplorerMode,
  type HistoricalExplorerPoint,
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

type FilterOption = { value: string; label: string };

const CITY_ALIASES: Record<string, string> = {
  amsterdam: "amsterdam",
  johannesburg: "johannesburg",
  johannesburgo: "johannesburg",
  munich: "munich",
  munchen: "munich",
  cologne: "cologne",
  colonia: "cologne",
  koln: "cologne",
  "new york": "new york",
  "nueva york": "new york",
  "sao paulo": "sao paulo",
  "san pablo": "sao paulo",
  "buenos aires": "buenos aires",
  antwerp: "antwerp",
  amberes: "antwerp",
  antwerpen: "antwerp",
  geneva: "geneva",
  ginebra: "geneva",
  genova: "genoa",
  genoa: "genoa",
  lyon: "lyon",
  lion: "lyon",
  moscow: "moscow",
  moscu: "moscow",
  "cape town": "cape town",
  "ciudad del cabo": "cape town",
  "hong kong": "hong kong",
  "hong kong sar": "hong kong",
};

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function foldCityText(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function cityIdentityKey(label: string): string {
  const folded = foldCityText(label);
  if (!folded) return "";
  return CITY_ALIASES[folded] ?? folded;
}

function preferCityLabel(current: string, candidate: string): string {
  const currentAccented = current !== stripDiacritics(current);
  const candidateAccented = candidate !== stripDiacritics(candidate);
  if (currentAccented && !candidateAccented) return candidate;
  if (!currentAccented && candidateAccented) return current;
  if (current.length !== candidate.length) {
    return current.length <= candidate.length ? current : candidate;
  }
  return current.localeCompare(candidate, "es") <= 0 ? current : candidate;
}

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
  return list.sort((a, b) => {
    const an = a.route.originLabel.localeCompare(b.route.originLabel, "es");
    if (an !== 0) return an;
    return a.route.destLabel.localeCompare(b.route.destLabel, "es");
  });
}

function money(currency: string, value: number) {
  return `${currency} ${value.toLocaleString("es-CL", {
    maximumFractionDigits: 2,
  })}`;
}

function sortTier(
  options: FilterOption[],
  mode: ExplorerMode,
): FilterOption[] {
  const order =
    mode === "air"
      ? AIR_TIER_ORDER
      : mode === "fcl"
        ? FCL_TIER_ORDER
        : [];
  if (!order.length) {
    return [...options].sort((a, b) => a.label.localeCompare(b.label, "es"));
  }
  const rank = new Map(order.map((t, i) => [t.tierKey, i]));
  return [...options].sort((a, b) => {
    const ai = rank.get(a.value) ?? 999;
    const bi = rank.get(b.value) ?? 999;
    if (ai !== bi) return ai - bi;
    return a.label.localeCompare(b.label, "es");
  });
}

function FilterPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value)?.label || "Todas";

  return (
    <>
      <Pressable style={styles.filterBtn} onPress={() => setOpen(true)}>
        <Text style={styles.filterLabel}>{label}</Text>
        <Text style={styles.filterValue} numberOfLines={1}>
          {selected}
        </Text>
        <Ionicons name="chevron-down" size={14} color={brand.muted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {options.map((opt) => (
                <Pressable
                  key={opt.value || "all"}
                  style={styles.modalRow}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalRowText,
                      opt.value === value && styles.modalRowActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
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
  const [city, setCity] = useState("");
  const [tier, setTier] = useState("");

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

  const modeItems = useMemo(() => buildItems(routes, mode), [mode, routes]);

  const cityOptions = useMemo(() => {
    const pool = tier
      ? modeItems.filter((item) => item.tier.tierKey === tier)
      : modeItems;
    const byKey = new Map<string, string>();
    for (const item of pool) {
      const raw = item.route.originLabel?.trim();
      if (!raw) continue;
      const key = cityIdentityKey(raw);
      if (!key) continue;
      const prev = byKey.get(key);
      byKey.set(key, prev ? preferCityLabel(prev, raw) : raw);
    }
    const cities = Array.from(byKey.entries())
      .sort(([, a], [, b]) => a.localeCompare(b, "es"))
      .map(([value, label]) => ({ value, label }));
    return [{ value: "", label: "Todas" }, ...cities];
  }, [modeItems, tier]);

  const tierOptions = useMemo(() => {
    if (mode === "lcl") return [];
    const pool = city
      ? modeItems.filter(
          (item) => cityIdentityKey(item.route.originLabel) === city,
        )
      : modeItems;
    const map = new Map<string, string>();
    for (const item of pool) {
      if (!map.has(item.tier.tierKey)) {
        map.set(item.tier.tierKey, item.tier.tierLabel);
      }
    }
    const opts = Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
    return [{ value: "", label: "Todos" }, ...sortTier(opts, mode)];
  }, [city, mode, modeItems]);

  useEffect(() => {
    if (city && !cityOptions.some((o) => o.value === city)) {
      setCity("");
    }
  }, [city, cityOptions]);

  useEffect(() => {
    if (tier && !tierOptions.some((o) => o.value === tier)) {
      setTier("");
    }
  }, [tier, tierOptions]);

  const items = useMemo(() => {
    return modeItems.filter((item) => {
      if (city && cityIdentityKey(item.route.originLabel) !== city) return false;
      if (tier && item.tier.tierKey !== tier) return false;
      return true;
    });
  }, [city, modeItems, tier]);

  const changeMode = (next: ExplorerMode) => {
    setMode(next);
    setCity("");
    setTier("");
    setSelected(null);
  };

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
            onPress={() => changeMode(m.key)}
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

      <View style={styles.filters}>
        <FilterPicker
          label="Ciudad"
          value={city}
          options={cityOptions}
          onChange={setCity}
        />
        {mode === "air" ? (
          <FilterPicker
            label="KGS"
            value={tier}
            options={tierOptions}
            onChange={setTier}
          />
        ) : null}
        {mode === "fcl" ? (
          <FilterPicker
            label="Contenedor"
            value={tier}
            options={tierOptions}
            onChange={setTier}
          />
        ) : null}
      </View>

      {loading && modeItems.length === 0 ? (
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
              <Text style={styles.empty}>
                {city || tier
                  ? "Sin resultados para estos filtros"
                  : "Sin histórico para este modo"}
              </Text>
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
    marginBottom: 8,
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
  filters: {
    paddingHorizontal: spacing.lg,
    gap: 8,
    marginBottom: 8,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterLabel: { fontSize: 12, color: brand.muted, width: 78 },
  filterValue: { flex: 1, fontSize: 13, color: brand.ink, fontWeight: "600" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: brand.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: "70%",
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    marginBottom: 12,
    color: brand.ink,
  },
  modalRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: brand.borderLight,
  },
  modalRowText: { fontSize: 14, color: brand.ink },
  modalRowActive: { color: brand.primary, fontFamily: fonts.semiBold },
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
  empty: { color: brand.muted, textAlign: "center" },
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
