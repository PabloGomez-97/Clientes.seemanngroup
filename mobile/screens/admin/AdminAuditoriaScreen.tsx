import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import {
  fetchAuditLogs,
  type AuditLogRow,
} from "../../services/adminApi";
import { useRefreshOnFocus } from "../../hooks/useRefreshOnFocus";
import { useRequestGate } from "../../hooks/useRequestGate";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

const PAGE_SIZE = 15;
const SEARCH_DEBOUNCE_MS = 350;

const CATEGORIES = [
  { key: "", label: "Todas" },
  { key: "GESTION_CLIENTES", label: "Clientes" },
  { key: "GESTION_EJECUTIVOS", label: "Ejecutivos" },
  { key: "AUTENTICACION", label: "Auth" },
  { key: "SISTEMA", label: "Sistema" },
];

export default function AdminAuditoriaScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const { next, isLatest } = useRequestGate();
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [categoria, setCategoria] = useState("");
  const [busquedaInput, setBusquedaInput] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setBusqueda(busquedaInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [busquedaInput]);

  const load = useCallback(async () => {
    if (!token) {
      setLogs([]);
      setLoading(false);
      return;
    }
    const requestId = next();
    setError(null);
    setLoading(true);
    try {
      const data = await fetchAuditLogs(token, {
        page,
        limit: PAGE_SIZE,
        categoria: categoria || undefined,
        busqueda: busqueda || undefined,
      });
      if (!isLatest(requestId)) return;
      setLogs(data.logs);
      setTotalPages(Math.max(1, data.pagination.totalPages));
      setTotal(data.pagination.total);
    } catch (e) {
      if (!isLatest(requestId)) return;
      setLogs([]);
      setError(
        e instanceof Error ? e.message : "No se pudo cargar la auditoría.",
      );
    } finally {
      if (isLatest(requestId)) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [token, page, categoria, busqueda, next, isLatest]);

  useRefreshOnFocus(load);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={brand.navy} />
        </Pressable>
        <Text style={styles.topTitle}>Auditoría</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={brand.mutedLight} />
        <TextInput
          style={styles.search}
          placeholder="Buscar usuario, acción…"
          placeholderTextColor={brand.mutedLight}
          value={busquedaInput}
          onChangeText={setBusquedaInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.filters}>
        {CATEGORIES.map((c) => {
          const active = categoria === c.key;
          return (
            <Pressable
              key={c.key || "all"}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => {
                setCategoria(c.key);
                setPage(1);
                setLoading(true);
              }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {c.label}
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
          <Pressable style={styles.retry} onPress={() => void load()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor={brand.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No hay eventos de auditoría.</Text>
          }
          ListFooterComponent={
            total > 0 ? (
              <View style={styles.pager}>
                <Text style={styles.pagerRange}>
                  Página {page} · {total} eventos
                </Text>
                <View style={styles.pagerControls}>
                  <Pressable
                    style={[
                      styles.pagerBtn,
                      page <= 1 && styles.pagerBtnDisabled,
                    ]}
                    disabled={page <= 1}
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={18}
                      color={page <= 1 ? brand.mutedLight : brand.navy}
                    />
                  </Pressable>
                  <Text style={styles.pagerPage}>
                    {page} / {totalPages}
                  </Text>
                  <Pressable
                    style={[
                      styles.pagerBtn,
                      page >= totalPages && styles.pagerBtnDisabled,
                    ]}
                    disabled={page >= totalPages}
                    onPress={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={
                        page >= totalPages ? brand.mutedLight : brand.navy
                      }
                    />
                  </Pressable>
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const expanded = expandedId === item._id;
            return (
              <Pressable
                style={styles.card}
                onPress={() =>
                  setExpandedId(expanded ? null : item._id)
                }
              >
                <View style={styles.cardTop}>
                  <Text style={styles.accion} numberOfLines={1}>
                    {item.accion || "Evento"}
                  </Text>
                  <Text style={styles.date}>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString("es-CL")
                      : ""}
                  </Text>
                </View>
                <Text style={styles.cat}>{item.categoria || "—"}</Text>
                <Text style={styles.desc} numberOfLines={expanded ? 8 : 2}>
                  {item.descripcion || "Sin descripción"}
                </Text>
                <Text style={styles.meta}>
                  {[item.usuario, item.email].filter(Boolean).join(" · ")}
                </Text>
                {expanded && item.clienteAfectado ? (
                  <Text style={styles.meta}>
                    Cliente: {item.clienteAfectado}
                  </Text>
                ) : null}
              </Pressable>
            );
          }}
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
  searchWrap: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  search: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: brand.ink,
    padding: 0,
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
    gap: 8,
  },
  accion: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  date: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: brand.mutedLight,
  },
  cat: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: brand.primary,
    textTransform: "uppercase",
  },
  desc: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: brand.ink,
  },
  meta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.muted,
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
