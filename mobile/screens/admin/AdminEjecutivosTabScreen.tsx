import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import {
  fetchAdminEjecutivos,
  roleLabels,
  type AdminEjecutivoRow,
} from "../../services/adminApi";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

const PAGE_SIZE = 15;

export default function AdminEjecutivosTabScreen() {
  const { token } = useAuth();
  const [rows, setRows] = useState<AdminEjecutivoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!token) {
      setRows([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const data = await fetchAdminEjecutivos(token);
      setRows(
        [...data].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
        ),
      );
    } catch (e) {
      setRows([]);
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar ejecutivos.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.nombre, r.email, r.telefono, roleLabels(r.roles)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const rangeLabel =
    filtered.length === 0
      ? "0 de 0"
      : `${(safePage - 1) * PAGE_SIZE + 1}-${Math.min(
          safePage * PAGE_SIZE,
          filtered.length,
        )} de ${filtered.length}`;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Ejecutivos</Text>
        <Text style={styles.subtitle}>
          Staff del portal · todos los roles
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={brand.mutedLight} />
        <TextInput
          style={styles.search}
          placeholder="Buscar por nombre, email, rol…"
          placeholderTextColor={brand.mutedLight}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
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
          data={pageItems}
          keyExtractor={(item) => item.id}
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
            <Text style={styles.empty}>No hay ejecutivos registrados.</Text>
          }
          ListFooterComponent={
            filtered.length > 0 ? (
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
                <Text style={styles.name} numberOfLines={1}>
                  {item.nombre}
                </Text>
                <View
                  style={[
                    styles.badge,
                    !item.activo && styles.badgeInactive,
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {item.activo ? "Activo" : "Inactivo"}
                  </Text>
                </View>
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {item.email}
              </Text>
              {item.telefono ? (
                <Text style={styles.meta}>{item.telefono}</Text>
              ) : null}
              <Text style={styles.role}>{roleLabels(item.roles)}</Text>
              {typeof item.clientesAsignados === "number" ? (
                <Text style={styles.clients}>
                  {item.clientesAsignados} cliente
                  {item.clientesAsignados === 1 ? "" : "s"}
                </Text>
              ) : null}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: brand.navy,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  searchWrap: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  badge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeInactive: { backgroundColor: "#fee2e2" },
  badgeText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  meta: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  role: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: brand.primary,
  },
  clients: {
    fontSize: 12,
    fontFamily: fonts.medium,
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
