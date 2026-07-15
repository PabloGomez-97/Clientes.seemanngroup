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

function priceSummary(row: BrowsableRateRow): string {
  const values = Object.values(row.prices || {}).filter(Boolean);
  if (!values.length) return "Consultar";
  return `${row.currency || "USD"} ${values[0]}`;
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

  const renderItem = ({ item }: { item: BrowsableRateRow }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.route} numberOfLines={2}>
          {item.origin} → {item.destination}
        </Text>
        <Text style={styles.price}>{priceSummary(item)}</Text>
      </View>
      <Text style={styles.meta}>
        {item.carrier || "Carrier por confirmar"}
        {item.validUntil ? ` · Vigente hasta ${item.validUntil}` : ""}
      </Text>
      {item.countryLabel ? (
        <Text style={styles.country}>{item.countryLabel}</Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Tarifario"
        subtitle="Solo consulta visual"
        onBack={() => navigation.goBack()}
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
              {filtered.length} tarifa{filtered.length === 1 ? "" : "s"}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>No hay tarifas con estos filtros</Text>
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
  count: { fontSize: 12, color: brand.muted, marginBottom: 4 },
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  route: { flex: 1, fontFamily: fonts.semiBold, color: brand.ink, fontSize: 14 },
  price: { fontFamily: fonts.bold, color: brand.primary, fontSize: 13 },
  meta: { fontSize: 12, color: brand.muted },
  country: { marginTop: 4, fontSize: 12, color: brand.inkSecondary },
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
});
