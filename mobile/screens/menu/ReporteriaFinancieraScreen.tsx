import { useMemo, useState } from "react";
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
import { useReporteriaFinanciera } from "../../hooks/useReporteria";
import {
  formatShortDate,
  type InvoiceRow,
} from "../../services/reporteriaApi";
import { brand, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type InvoiceFilter = "all" | "pending";

function hasPendingBalance(item: InvoiceRow): boolean {
  const balance = item.balanceDue?.value ?? 0;
  return typeof balance === "number" && balance > 0;
}

function moneyField(
  field?: { value?: number; userString?: string } | null,
  currency?: string,
): string {
  if (field?.userString?.trim()) return field.userString.trim();
  if (field?.value != null) {
    const abbr = currency ? `${currency} ` : "";
    return `${abbr}${field.value.toLocaleString("es-CL")}`;
  }
  return "—";
}

function KpiCard({
  label,
  value,
  accent,
  active,
  onPress,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  active?: boolean;
  onPress?: () => void;
}) {
  const body = (
    <>
      <View
        style={[
          styles.kpiAccent,
          accent && styles.kpiAccentHot,
          active && styles.kpiAccentActive,
        ]}
      />
      <View style={styles.kpiBody}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text
          style={[styles.kpiValue, accent && styles.kpiValueHot]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {value}
        </Text>
      </View>
    </>
  );

  if (!onPress) {
    return <View style={[styles.kpi, active && styles.kpiActive]}>{body}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.kpi,
        active && styles.kpiActive,
        pressed && styles.kpiPressed,
      ]}
    >
      {body}
    </Pressable>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function InvoiceCard({
  item,
  amount,
  expanded,
  onToggle,
}: {
  item: InvoiceRow;
  amount: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasBalance = hasPendingBalance(item);
  const balanceLabel =
    item.balanceDue?.userString ||
    (hasBalance ? String(item.balanceDue?.value ?? 0) : null);
  const shipmentRef =
    item.shipment?.customerReference?.trim() ||
    item.shipment?.number?.trim() ||
    "";
  const currency =
    item.currency?.abbr ||
    (typeof item.currency === "object" &&
    item.currency &&
    "name" in item.currency
      ? String((item.currency as { name?: string }).name || "")
      : "");
  const notes =
    typeof item.notes === "string" ? item.notes.split("@")[0]?.trim() : "";
  const taxAmount = item.taxAmount;
  const subtotal = item.amount || item.totalAmount;

  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.accent, hasBalance && styles.accentPending]} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.number} numberOfLines={1}>
            {item.number || `INV-${item.id ?? "—"}`}
          </Text>
          <View style={styles.topRight}>
            <Text style={styles.amount} numberOfLines={1}>
              {amount}
            </Text>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={brand.mutedLight}
            />
          </View>
        </View>

        <Text style={styles.dates}>
          {formatShortDate(item.date)}
          <Text style={styles.datesSep}>  ·  </Text>
          {item.dueDate ? formatShortDate(item.dueDate) : "Sin vencimiento"}
        </Text>

        {shipmentRef ? (
          <Text style={styles.shipment} numberOfLines={1}>
            Embarque {shipmentRef}
          </Text>
        ) : null}

        <View style={styles.footerRow}>
          <Text style={styles.dateHint}>Emisión · Vencimiento</Text>
          {hasBalance && balanceLabel ? (
            <View style={styles.balanceChip}>
              <View style={styles.balanceDot} />
              <Text style={styles.balanceText}>Saldo {balanceLabel}</Text>
            </View>
          ) : (
            <Text style={styles.paidText}>Sin saldo</Text>
          )}
        </View>

        {expanded ? (
          <View style={styles.detailBox}>
            {notes ? <DetailLine label="Referencia" value={notes} /> : null}
            {item.shipment?.number ? (
              <DetailLine label="N° embarque" value={item.shipment.number} />
            ) : null}
            {item.shipment?.customerReference ? (
              <DetailLine
                label="Ref. cliente"
                value={item.shipment.customerReference}
              />
            ) : null}
            {currency ? <DetailLine label="Moneda" value={currency} /> : null}
            <DetailLine
              label="Monto"
              value={moneyField(subtotal, item.currency?.abbr)}
            />
            {taxAmount ? (
              <DetailLine
                label="Impuesto"
                value={moneyField(taxAmount, item.currency?.abbr)}
              />
            ) : null}
            <DetailLine
              label="Total"
              value={moneyField(item.totalAmount || item.amount, item.currency?.abbr)}
            />
            <DetailLine
              label="Saldo"
              value={moneyField(item.balanceDue, item.currency?.abbr)}
            />
            {item.status != null && String(item.status).trim() ? (
              <DetailLine label="Estado" value={String(item.status)} />
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function ReporteriaFinancieraScreen() {
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
    moneyLabel,
  } = useReporteriaFinanciera();

  const [filter, setFilter] = useState<InvoiceFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (filter === "pending") return items.filter(hasPendingBalance);
    return items;
  }, [filter, items]);

  const listKey = (item: InvoiceRow, index: number) =>
    String(item.id ?? item.number ?? index);

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
          <Text style={styles.title}>Reportería financiera</Text>
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

      <View style={styles.kpiRow}>
        <KpiCard
          label="Facturas"
          value={kpis.total}
          active={filter === "all"}
          onPress={() => {
            setFilter("all");
            setExpandedId(null);
          }}
        />
        <KpiCard
          label="Con saldo"
          value={kpis.pending}
          accent
          active={filter === "pending"}
          onPress={() => {
            setFilter("pending");
            setExpandedId(null);
          }}
        />
        <KpiCard label="Total" value={kpis.amountLabel} />
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
          <Text style={styles.loadingText}>Cargando facturas...</Text>
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
        <FlatList
          data={filteredItems}
          keyExtractor={listKey}
          renderItem={({ item, index }) => {
            const key = listKey(item, index);
            return (
              <InvoiceCard
                item={item}
                amount={moneyLabel(item)}
                expanded={expandedId === key}
                onToggle={() =>
                  setExpandedId((prev) => (prev === key ? null : key))
                }
              />
            );
          }}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void refresh()}
              tintColor={brand.primary}
            />
          }
          onEndReached={() => {
            if (filter === "all") loadMore();
          }}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <Text style={styles.listLabel}>
              {filter === "pending" ? "Facturas con saldo" : "Facturas"}
              {filteredItems.length > 0 ? ` · ${filteredItems.length}` : ""}
            </Text>
          }
          ListFooterComponent={
            filter === "all" && loadingMore ? (
              <ActivityIndicator
                style={{ marginVertical: 16 }}
                color={brand.primary}
              />
            ) : filter === "all" && hasMore ? (
              <Pressable style={styles.more} onPress={() => loadMore()}>
                <Text style={styles.moreText}>Cargar más</Text>
              </Pressable>
            ) : filteredItems.length > 0 ? (
              <Text style={styles.endHint}>Fin del listado</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons
                name="wallet-outline"
                size={40}
                color={brand.mutedLight}
              />
              <Text style={styles.emptyTitle}>
                {filter === "pending" ? "Sin saldos pendientes" : "Sin facturas"}
              </Text>
              <Text style={styles.empty}>
                {filter === "pending"
                  ? "No hay facturas con saldo en el listado actual."
                  : "No hay facturas registradas para esta cuenta."}
              </Text>
              {filter === "pending" ? (
                <Pressable
                  style={styles.more}
                  onPress={() => setFilter("all")}
                >
                  <Text style={styles.moreText}>Ver todas</Text>
                </Pressable>
              ) : null}
            </View>
          }
        />
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
  headerText: {
    flex: 1,
  },
  title: {
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
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  kpi: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: brand.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(30, 58, 95, 0.08)",
    overflow: "hidden",
    minHeight: 64,
  },
  kpiActive: {
    borderColor: brand.primaryBorder,
    backgroundColor: "#fffaf7",
  },
  kpiPressed: {
    opacity: 0.92,
  },
  kpiAccent: {
    width: 3,
    backgroundColor: brand.navy,
  },
  kpiAccentHot: {
    backgroundColor: brand.primary,
  },
  kpiAccentActive: {
    backgroundColor: brand.primary,
  },
  kpiBody: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: "center",
  },
  kpiLabel: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: brand.mutedLight,
    fontFamily: fonts.semiBold,
    marginBottom: 4,
  },
  kpiValue: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: brand.navy,
  },
  kpiValueHot: {
    color: brand.primary,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  listLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: brand.mutedLight,
    fontFamily: fonts.semiBold,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    backgroundColor: brand.surface,
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(30, 58, 95, 0.08)",
  },
  rowPressed: {
    opacity: 0.96,
  },
  accent: {
    width: 3,
    backgroundColor: brand.navy,
  },
  accentPending: {
    backgroundColor: brand.primary,
  },
  content: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  number: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  amount: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: brand.ink,
  },
  dates: {
    fontSize: 13,
    color: brand.inkSecondary,
    fontFamily: fonts.medium,
  },
  datesSep: {
    color: brand.mutedLight,
  },
  shipment: {
    marginTop: 6,
    fontSize: 12,
    color: brand.muted,
    fontFamily: fonts.regular,
  },
  footerRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dateHint: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: brand.mutedLight,
    fontFamily: fonts.medium,
  },
  balanceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: brand.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  balanceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: brand.primary,
  },
  balanceText: {
    fontSize: 11,
    color: brand.primary,
    fontFamily: fonts.semiBold,
  },
  paidText: {
    fontSize: 11,
    color: brand.mutedLight,
    fontFamily: fonts.medium,
  },
  detailBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(30, 58, 95, 0.12)",
    gap: 8,
  },
  detailLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: brand.muted,
    fontFamily: fonts.medium,
  },
  detailValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
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
    paddingVertical: 48,
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
  more: {
    alignSelf: "center",
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: "rgba(30, 58, 95, 0.1)",
  },
  moreText: { color: brand.navy, fontFamily: fonts.semiBold, fontSize: 13 },
  endHint: {
    textAlign: "center",
    color: brand.mutedLight,
    fontSize: 11,
    marginVertical: 14,
    fontFamily: fonts.medium,
  },
});
