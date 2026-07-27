import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import {
  deleteAdminUser,
  fetchAdminClientUsers,
  type AdminUserRow,
} from "../../services/adminApi";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

const PAGE_SIZE = 15;

type Nav = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
};

export default function AdminClientAccountsScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setRows([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const data = await fetchAdminClientUsers(token);
      setRows(
        [...data].sort((a, b) =>
          (a.nombreuser || a.email).localeCompare(
            b.nombreuser || b.email,
            "es",
            { sensitivity: "base" },
          ),
        ),
      );
    } catch (e) {
      setRows([]);
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar los clientes.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.email,
        r.nombreuser,
        r.username,
        ...(r.usernames || []),
        r.ejecutivo?.nombre,
      ]
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

  const confirmDelete = (user: AdminUserRow) => {
    Alert.alert(
      "Eliminar cliente",
      `¿Eliminar permanentemente la cuenta de ${user.email}? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            void (async () => {
              if (!token) return;
              setDeletingId(user.id);
              try {
                await deleteAdminUser(token, user.id);
                await load();
              } catch (e) {
                Alert.alert(
                  "Error",
                  e instanceof Error
                    ? e.message
                    : "No se pudo eliminar el cliente.",
                );
              } finally {
                setDeletingId(null);
              }
            })();
          },
        },
      ],
    );
  };

  const empresasLabel = (user: AdminUserRow) => {
    const list =
      user.usernames?.length > 0
        ? user.usernames
        : user.username
          ? [user.username]
          : [];
    return list.join(", ") || "—";
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Cuentas cliente</Text>
        <Text style={styles.subtitle}>Usuarios del portal · clientes</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={brand.mutedLight} />
        <TextInput
          style={styles.search}
          placeholder="Buscar por email, nombre, empresa…"
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
            <Text style={styles.empty}>No hay clientes registrados.</Text>
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
            <Pressable
              style={styles.card}
              onPress={() =>
                navigation.navigate("AdminClientAccountForm", {
                  userId: item.id,
                })
              }
            >
              <View style={styles.cardTop}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.nombreuser || "Sin nombre"}
                </Text>
                <Pressable
                  hitSlop={10}
                  onPress={() => confirmDelete(item)}
                  disabled={deletingId === item.id}
                  style={styles.trashBtn}
                >
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color="#dc2626" />
                  ) : (
                    <Ionicons name="trash-outline" size={18} color="#dc2626" />
                  )}
                </Pressable>
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {item.email}
              </Text>
              <Text style={styles.meta} numberOfLines={2}>
                {empresasLabel(item)}
              </Text>
              {item.ejecutivo?.nombre ? (
                <Text style={styles.ejecutivo}>
                  Ejecutivo: {item.ejecutivo.nombre}
                </Text>
              ) : (
                <Text style={styles.ejecutivoMuted}>Sin ejecutivo</Text>
              )}
            </Pressable>
          )}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate("AdminClientAccountForm", {})}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={styles.fabText}>Nuevo cliente</Text>
      </Pressable>
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
    paddingBottom: 100,
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
  trashBtn: {
    padding: 4,
  },
  meta: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  ejecutivo: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: fonts.medium,
    color: brand.primary,
  },
  ejecutivoMuted: {
    marginTop: 4,
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
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radii.pill,
    shadowColor: brand.shadowOrange,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: {
    color: "#fff",
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
});
