import { useEffect, useMemo, useState } from "react";
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
import { usePricingAlerts } from "../../hooks/usePricingAlerts";
import { useRefreshOnFocus } from "../../hooks/useRefreshOnFocus";
import type {
  PricingExpiringAir,
  PricingExpiringFcl,
  PricingExpiringLcl,
  PricingTariffKind,
} from "../../services/pricingApi";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

const PAGE_SIZE = 15;

type FilterKind = "all" | PricingTariffKind;

type RowItem = {
  id: string;
  kind: PricingTariffKind;
  title: string;
  subtitle: string;
  daysUntilExpiry?: number;
  validUntil: string;
  company?: string | null;
};

function urgencyLabel(days: number | undefined): string {
  if (days === undefined || days < 0) return "Expirado";
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

function urgencyColor(days: number | undefined): string {
  if (days === undefined || days <= 1) return "#dc2626";
  if (days === 2) return "#d97706";
  return brand.primary;
}

function mapAir(rows: PricingExpiringAir[]): RowItem[] {
  return rows.map((r, i) => ({
    id: `air-${r.rowNumber}-${i}`,
    kind: "air",
    title: `${r.origen} → ${r.destino}`,
    subtitle: [r.carrier, r.currency].filter(Boolean).join(" · ") || "Aéreo",
    daysUntilExpiry: r.daysUntilExpiry,
    validUntil: r.validUntil,
    company: r.company,
  }));
}

function mapFcl(rows: PricingExpiringFcl[]): RowItem[] {
  return rows.map((r, i) => ({
    id: `fcl-${r.rowNumber}-${i}`,
    kind: "fcl",
    title: `${r.pol} → ${r.pod}`,
    subtitle: [r.carrier, r.currency].filter(Boolean).join(" · ") || "FCL",
    daysUntilExpiry: r.daysUntilExpiry,
    validUntil: r.validUntil,
    company: r.company,
  }));
}

function mapLcl(rows: PricingExpiringLcl[]): RowItem[] {
  return rows.map((r, i) => ({
    id: `lcl-${r.rowNumber}-${i}`,
    kind: "lcl",
    title: `${r.pol} → ${r.pod}`,
    subtitle:
      [r.servicio || r.operador, r.currency].filter(Boolean).join(" · ") ||
      "LCL",
    daysUntilExpiry: r.daysUntilExpiry,
    validUntil: r.validUntil,
    company: r.company,
  }));
}

const FILTERS: { key: FilterKind; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "air", label: "Aéreo" },
  { key: "fcl", label: "FCL" },
  { key: "lcl", label: "LCL" },
];

export default function PricingAlertsScreen() {
  const navigation = useNavigation();
  const { expiry, loading, error, refresh } = usePricingAlerts(7);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKind>("all");
  const [page, setPage] = useState(1);

  useRefreshOnFocus(refresh);

  const rows = useMemo(() => {
    if (!expiry) return [];
    const all = [
      ...mapAir(expiry.air),
      ...mapFcl(expiry.fcl),
      ...mapLcl(expiry.lcl),
    ].sort(
      (a, b) => (a.daysUntilExpiry ?? 99) - (b.daysUntilExpiry ?? 99),
    );
    if (filter === "all") return all;
    return all.filter((r) => r.kind === filter);
  }, [expiry, filter]);

  useEffect(() => {
    setPage(1);
  }, [filter, rows.length]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);

  const rangeLabel =
    rows.length === 0
      ? "0 de 0"
      : `${(safePage - 1) * PAGE_SIZE + 1}-${Math.min(
          safePage * PAGE_SIZE,
          rows.length,
        )} de ${rows.length}`;

  const canBack = navigation.canGoBack();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {canBack ? (
        <View style={styles.topBar}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={22} color={brand.navy} />
          </Pressable>
          <Text style={styles.topTitle}>Alertas</Text>
          <View style={styles.backBtn} />
        </View>
      ) : null}
      <View style={styles.header}>
        {!canBack ? <Text style={styles.title}>Alertas</Text> : null}
        <Text style={styles.subtitle}>
          Tarifas por vencer en los próximos {expiry?.days ?? 7} días
        </Text>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retry}
            onPress={() => {
              void refresh();
            }}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={pageItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void refresh().finally(() => setRefreshing(false));
              }}
              tintColor={brand.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              No hay tarifas próximas a vencer en esta vista.
            </Text>
          }
          ListFooterComponent={
            rows.length > 0 ? (
              <View style={styles.pager}>
                <Text style={styles.pagerRange}>{rangeLabel}</Text>
                <View style={styles.pagerControls}>
                  <Pressable
                    style={[
                      styles.pagerBtn,
                      safePage <= 1 && styles.pagerBtnDisabled,
                    ]}
                    disabled={safePage <= 1}
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={18}
                      color={safePage <= 1 ? brand.mutedLight : brand.navy}
                    />
                  </Pressable>
                  <Text style={styles.pagerPage}>
                    {safePage} / {totalPages}
                  </Text>
                  <Pressable
                    style={[
                      styles.pagerBtn,
                      safePage >= totalPages && styles.pagerBtnDisabled,
                    ]}
                    disabled={safePage >= totalPages}
                    onPress={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={
                        safePage >= totalPages ? brand.mutedLight : brand.navy
                      }
                    />
                  </Pressable>
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.kindBadge}>
                  <Text style={styles.kindText}>
                    {item.kind === "air"
                      ? "Aéreo"
                      : item.kind === "fcl"
                        ? "FCL"
                        : "LCL"}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.urgency,
                    { color: urgencyColor(item.daysUntilExpiry) },
                  ]}
                >
                  {urgencyLabel(item.daysUntilExpiry)}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>{item.subtitle}</Text>
              {item.company ? (
                <Text style={styles.cardCompany}>{item.company}</Text>
              ) : null}
              <Text style={styles.cardValid}>
                Válida hasta {item.validUntil || "—"}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: brand.navy,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
  },
  chipActive: {
    backgroundColor: brand.primarySoft,
    borderColor: brand.primaryBorder,
  },
  chipText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.muted,
  },
  chipTextActive: { color: brand.primary },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: 10,
  },
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    padding: 14,
    gap: 4,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  kindBadge: {
    backgroundColor: "#eef2f7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  kindText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  urgency: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  cardMeta: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  cardCompany: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: brand.navy,
  },
  cardValid: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: fonts.regular,
    color: brand.mutedLight,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: 12,
  },
  errorText: {
    textAlign: "center",
    color: brand.muted,
    fontFamily: fonts.regular,
  },
  retry: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: brand.primary,
  },
  retryText: { color: "#fff", fontFamily: fonts.semiBold },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: brand.muted,
    fontFamily: fonts.regular,
  },
  pager: {
    marginTop: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pagerRange: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: brand.muted,
  },
  pagerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pagerBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  pagerBtnDisabled: { opacity: 0.5 },
  pagerPage: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: brand.navy,
    minWidth: 48,
    textAlign: "center",
  },
});
