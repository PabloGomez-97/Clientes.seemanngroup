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
import ScreenHeader from "../../components/ui/ScreenHeader";
import { useReporteriaOperacional } from "../../hooks/useReporteria";
import {
  formatShortDate,
  type ShipmentRow,
} from "../../services/reporteriaApi";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const MODE_LABEL = {
  air: "Aéreo",
  sea: "Marítimo",
  ground: "Terrestre",
  other: "Otro",
} as const;

export default function ReporteriaOperacionalScreen() {
  const navigation = useNavigation();
  const {
    activeUsername,
    items,
    kpis,
    loading,
    loadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
    classifyMode,
  } = useReporteriaOperacional();

  const renderItem = ({ item }: { item: ShipmentRow }) => {
    const mode = classifyMode(item.modeOfTransportation);
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.number}>
            {item.number || item.customerReference || `SHIP-${item.id}`}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{MODE_LABEL[mode]}</Text>
          </View>
        </View>
        <Text style={styles.route} numberOfLines={2}>
          {(item.origin || "Origen —") + " → " + (item.destination || "Destino —")}
        </Text>
        <Text style={styles.meta}>
          Salida {formatShortDate(item.departure)} · Llegada{" "}
          {formatShortDate(item.arrival)}
        </Text>
        {item.currentFlow || item.lastEvent ? (
          <Text style={styles.event} numberOfLines={2}>
            {item.currentFlow || item.lastEvent}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Reportería operacional"
        subtitle={activeUsername || undefined}
        right={
          <Pressable style={styles.iconBtn} onPress={() => void refresh()}>
            <Ionicons name="refresh" size={18} color={brand.navy} />
          </Pressable>
        }
      />

      <View style={styles.kpiRow}>
        <Kpi label="Total" value={kpis.total} />
        <Kpi label="Aéreo" value={kpis.air} />
        <Kpi label="Marítimo" value={kpis.sea} />
        <Kpi label="Terrestre" value={kpis.ground} />
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => void refresh()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) =>
            String(item.id ?? item.number ?? index)
          }
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void refresh()}
              tintColor={brand.primary}
            />
          }
          onEndReached={() => loadMore()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                style={{ marginVertical: 16 }}
                color={brand.primary}
              />
            ) : hasMore ? (
              <Pressable style={styles.more} onPress={() => loadMore()}>
                <Text style={styles.moreText}>Cargar más</Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>No hay embarques para esta cuenta</Text>
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
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  kpi: {
    flex: 1,
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  kpiValue: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: brand.primary,
    marginBottom: 2,
  },
  kpiLabel: { fontSize: 10, color: brand.muted, textAlign: "center" },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: 10 },
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  number: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: brand.ink,
    flex: 1,
  },
  badge: {
    backgroundColor: brand.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: brand.primary },
  route: { fontSize: 13, color: brand.inkSecondary, marginBottom: 4 },
  meta: { fontSize: 12, color: brand.muted },
  event: { marginTop: 6, fontSize: 12, color: brand.navy },
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
  more: {
    alignSelf: "center",
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
  },
  moreText: { color: brand.navy, fontFamily: fonts.semiBold },
});
