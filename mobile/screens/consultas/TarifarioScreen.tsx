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
  fetchBrowsableRates,
  listCountriesFromRows,
  listDestinationsFromRows,
  listOriginCitiesFromRows,
  type BrowsableRateRow,
} from "../../../src/components/quotes/Handlers/shared/buildBrowsableRates";
import type { CountryRateService } from "../../../src/components/quotes/Handlers/shared/countryRatesTypes";
import ScreenHeader from "../../components/ui/ScreenHeader";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

const MODES: { key: CountryRateService; label: string }[] = [
  { key: "air", label: "Aéreo" },
  { key: "fcl", label: "FCL" },
  { key: "lcl", label: "LCL" },
];

const PRICE_LABELS: Record<CountryRateService, { key: string; label: string }[]> =
  {
    air: [
      { key: "kg45", label: "45–99 kg" },
      { key: "kg100", label: "100–299 kg" },
      { key: "kg300", label: "300–499 kg" },
      { key: "kg500", label: "500–999 kg" },
      { key: "kg1000", label: "+1.000 kg" },
    ],
    fcl: [
      { key: "gp20", label: "20GP (contenedor)" },
      { key: "hq40", label: "40HQ (contenedor)" },
      { key: "nor40", label: "40NOR (contenedor)" },
    ],
    lcl: [{ key: "ofWM", label: "Ocean Freight W/M" }],
  };

function formatPrice(currency: string, value: string | null | undefined) {
  if (!value || value === "—" || value === "N/A") return null;
  return `${currency} ${value}`;
}

function getPriceEntries(row: BrowsableRateRow) {
  return PRICE_LABELS[row.mode]
    .map((tier) => ({
      ...tier,
      value: formatPrice(row.currency || "USD", row.prices?.[tier.key]),
    }))
    .filter((tier) => tier.value);
}

function validityTone(state: BrowsableRateRow["validityState"]) {
  if (state === "expired")
    return { bg: "#fef2f2", color: "#b91c1c", label: "Vencida" };
  if (state === "expiring-soon")
    return { bg: "#fffbeb", color: "#b45309", label: "Por vencer" };
  return { bg: "#ecfdf5", color: "#047857", label: "Vigente" };
}

function FilterPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value)?.label || "Todos";

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

function RateDetailModal({
  row,
  onClose,
}: {
  row: BrowsableRateRow | null;
  onClose: () => void;
}) {
  if (!row) return null;
  const prices = getPriceEntries(row);
  const tone = validityTone(row.validityState);
  const modeLabel = MODES.find((m) => m.key === row.mode)?.label || row.mode;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.detailBackdrop}>
        <View style={styles.detailSheet}>
          <View style={styles.detailHandle} />
          <View style={styles.detailHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailMode}>{modeLabel}</Text>
              <Text style={styles.detailRoute}>
                {row.origin} → {row.destination}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.detailClose}>
              <Ionicons name="close" size={20} color={brand.ink} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.detailBody}
          >
            <View style={[styles.validityPill, { backgroundColor: tone.bg }]}>
              <Text style={[styles.validityText, { color: tone.color }]}>
                {tone.label}
                {row.validUntil && row.validUntil !== "—"
                  ? ` · hasta ${row.validUntil}`
                  : ""}
              </Text>
            </View>

            <Text style={styles.sectionLabel}>Precios</Text>
            {prices.length === 0 ? (
              <Text style={styles.emptyPrices}>Sin precios publicados</Text>
            ) : (
              <View style={styles.priceTable}>
                {prices.map((tier) => (
                  <View key={tier.key} style={styles.priceRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.priceTier}>{tier.label}</Text>
                      {row.mode === "air" ? (
                        <Text style={styles.priceHint}>
                          Tarifa por kilogramo
                        </Text>
                      ) : row.mode === "fcl" ? (
                        <Text style={styles.priceHint}>
                          Precio por contenedor
                        </Text>
                      ) : (
                        <Text style={styles.priceHint}>
                          Ocean Freight weight/measure
                        </Text>
                      )}
                    </View>
                    <Text style={styles.priceValue}>{tier.value}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.sectionLabel}>Detalle de la ruta</Text>
            <View style={styles.metaCard}>
              <MetaRow label="País / región" value={row.countryLabel || "—"} />
              <MetaRow label="Carrier" value={row.carrier || "Por confirmar"} />
              <MetaRow label="Moneda" value={row.currency || "USD"} />
              {row.ttAprox ? (
                <MetaRow label="Tránsito aprox." value={row.ttAprox} />
              ) : null}
              {row.freeTime ? (
                <MetaRow label="Free time" value={row.freeTime} />
              ) : null}
              <MetaRow
                label="Validez"
                value={row.validUntil || "—"}
                last
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function MetaRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.metaRow, !last && styles.metaRowBorder]}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

export default function TarifarioScreen() {
  const navigation = useNavigation();
  const [mode, setMode] = useState<CountryRateService>("air");
  const [rowsByMode, setRowsByMode] = useState<
    Record<CountryRateService, BrowsableRateRow[]>
  >({ air: [], fcl: [], lcl: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [includeExpired, setIncludeExpired] = useState(false);
  const [selected, setSelected] = useState<BrowsableRateRow | null>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBrowsableRates(force);
      setRowsByMode({
        air: data.air,
        fcl: data.fcl,
        lcl: data.lcl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar tarifas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const modeRows = rowsByMode[mode];

  const filtered = useMemo(() => {
    return modeRows.filter((row) => {
      if (!includeExpired && row.validityState === "expired") return false;
      if (country && row.countryCode !== country) return false;
      if (origin && row.originNorm !== origin) return false;
      if (destination && row.destNorm !== destination) return false;
      return true;
    });
  }, [country, destination, includeExpired, modeRows, origin]);

  const countryOptions = useMemo(() => {
    const list = listCountriesFromRows(modeRows);
    return [
      { value: "", label: "Todos los países" },
      ...list.map((c) => ({ value: c.code, label: c.label })),
    ];
  }, [modeRows]);

  const originOptions = useMemo(() => {
    const scoped = country
      ? modeRows.filter((r) => r.countryCode === country)
      : modeRows;
    return [
      { value: "", label: "Todos los orígenes" },
      ...listOriginCitiesFromRows(scoped).map((o) => ({
        value: o.norm,
        label: o.label,
      })),
    ];
  }, [country, modeRows]);

  const destinationOptions = useMemo(() => {
    let scoped = modeRows;
    if (country) scoped = scoped.filter((r) => r.countryCode === country);
    if (origin) scoped = scoped.filter((r) => r.originNorm === origin);
    return [
      { value: "", label: "Todos los destinos" },
      ...listDestinationsFromRows(scoped).map((d) => ({
        value: d.norm,
        label: d.label,
      })),
    ];
  }, [country, modeRows, origin]);

  const renderItem = ({ item }: { item: BrowsableRateRow }) => {
    const prices = getPriceEntries(item).slice(0, 3);
    const tone = validityTone(item.validityState);
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => setSelected(item)}
      >
        <View style={styles.cardTop}>
          <Text style={styles.route} numberOfLines={2}>
            {item.origin} → {item.destination}
          </Text>
          <View style={[styles.miniPill, { backgroundColor: tone.bg }]}>
            <Text style={[styles.miniPillText, { color: tone.color }]}>
              {tone.label}
            </Text>
          </View>
        </View>
        <Text style={styles.carrier} numberOfLines={1}>
          {item.carrier || "Carrier por confirmar"}
          {item.validUntil && item.validUntil !== "—"
            ? ` · Validez ${item.validUntil}`
            : ""}
        </Text>
        <View style={styles.priceChips}>
          {prices.map((tier) => (
            <View key={tier.key} style={styles.chip}>
              <Text style={styles.chipLabel}>{tier.label}</Text>
              <Text style={styles.chipValue}>{tier.value}</Text>
            </View>
          ))}
          {getPriceEntries(item).length > 3 ? (
            <View style={styles.chipMore}>
              <Text style={styles.chipMoreText}>+ más</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.tapHint}>Toca para ver el detalle completo</Text>
          <Ionicons name="chevron-forward" size={16} color={brand.mutedLight} />
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Tarifario"
        subtitle="Solo consulta visual"
        right={
          <Pressable style={styles.iconBtn} onPress={() => void load(true)}>
            <Ionicons name="refresh" size={18} color={brand.navy} />
          </Pressable>
        }
      />

      <View style={styles.modes}>
        {MODES.map((m) => (
          <Pressable
            key={m.key}
            style={[styles.modeBtn, mode === m.key && styles.modeBtnActive]}
            onPress={() => {
              setMode(m.key);
              setCountry("");
              setOrigin("");
              setDestination("");
            }}
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
          label="País"
          value={country}
          options={countryOptions}
          onChange={(v) => {
            setCountry(v);
            setOrigin("");
            setDestination("");
          }}
        />
        <FilterPicker
          label="Origen"
          value={origin}
          options={originOptions}
          onChange={(v) => {
            setOrigin(v);
            setDestination("");
          }}
        />
        <FilterPicker
          label="Destino"
          value={destination}
          options={destinationOptions}
          onChange={setDestination}
        />
      </View>

      <Pressable
        style={styles.toggle}
        onPress={() => setIncludeExpired((v) => !v)}
      >
        <Ionicons
          name={includeExpired ? "checkbox" : "square-outline"}
          size={18}
          color={brand.primary}
        />
        <Text style={styles.toggleText}>Incluir tarifas vencidas</Text>
      </Pressable>

      {loading && filtered.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
          <Text style={styles.hint}>Cargando tarifas…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => void load(true)}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void load(true)}
              tintColor={brand.primary}
            />
          }
          ListHeaderComponent={
            <Text style={styles.count}>
              {filtered.length} tarifa{filtered.length === 1 ? "" : "s"} · toca
              una fila para ver todos los tramos
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>No hay tarifas con estos filtros</Text>
            </View>
          }
        />
      )}

      <RateDetailModal row={selected} onClose={() => setSelected(null)} />
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
  filterLabel: { fontSize: 12, color: brand.muted, width: 56 },
  filterValue: { flex: 1, fontSize: 13, color: brand.ink, fontWeight: "600" },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: 8,
  },
  toggleText: { fontSize: 13, color: brand.inkSecondary },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: 10 },
  count: { fontSize: 12, color: brand.muted, marginBottom: 4, lineHeight: 17 },
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
    marginBottom: 6,
  },
  route: { flex: 1, fontFamily: fonts.semiBold, color: brand.ink, fontSize: 15 },
  miniPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    alignSelf: "flex-start",
  },
  miniPillText: { fontSize: 11, fontWeight: "700" },
  carrier: { fontSize: 12, color: brand.muted, marginBottom: 10 },
  priceChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: brand.canvasAlt,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: brand.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: "30%",
  },
  chipLabel: { fontSize: 10, color: brand.muted, marginBottom: 2 },
  chipValue: { fontSize: 13, fontFamily: fonts.bold, color: brand.navy },
  chipMore: {
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  chipMoreText: { fontSize: 12, color: brand.primary, fontWeight: "600" },
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
  hint: { marginTop: 8, color: brand.muted },
  error: { color: brand.muted, textAlign: "center", marginBottom: 12 },
  retry: {
    backgroundColor: brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  retryText: { color: "#fff", fontFamily: fonts.semiBold },
  empty: { color: brand.muted },
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
  detailBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "flex-end",
  },
  detailSheet: {
    backgroundColor: brand.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    paddingBottom: 24,
  },
  detailHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: brand.border,
    marginTop: 10,
    marginBottom: 8,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingBottom: 8,
    gap: 12,
  },
  detailMode: {
    fontSize: 12,
    fontWeight: "700",
    color: brand.primary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  detailRoute: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: brand.ink,
    letterSpacing: -0.3,
  },
  detailClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brand.canvasAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  detailBody: { paddingHorizontal: spacing.lg, paddingBottom: 12 },
  validityPill: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: spacing.md,
  },
  validityText: { fontSize: 12, fontWeight: "700" },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  emptyPrices: { color: brand.muted, marginBottom: 12 },
  priceTable: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.lg,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: brand.borderLight,
    backgroundColor: brand.surface,
  },
  priceTier: { fontSize: 14, fontFamily: fonts.semiBold, color: brand.ink },
  priceHint: { fontSize: 11, color: brand.muted, marginTop: 2 },
  priceValue: { fontSize: 16, fontFamily: fonts.bold, color: brand.navy },
  metaCard: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.lg,
    overflow: "hidden",
    marginBottom: 8,
  },
  metaRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  metaRowBorder: { borderBottomWidth: 1, borderBottomColor: brand.borderLight },
  metaLabel: { fontSize: 13, color: brand.muted },
  metaValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
});
