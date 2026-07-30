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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import {
  fetchBehaviorClients,
  type BehaviorClientSummary,
} from "../../services/comportamientoApi";
import { useRefreshOnFocus } from "../../hooks/useRefreshOnFocus";
import { useStaffClientsSource } from "../../navigation/StaffClientsSourceContext";
import { backOrHub } from "../../navigation/backOrHub";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

const PAGE_SIZE = 15;

export type ComportamientoStackParamList = {
  ComportamientoList: undefined;
  ComportamientoDetail: {
    email: string;
    username: string;
    nombreuser?: string;
  };
};

type Nav = NativeStackNavigationProp<
  ComportamientoStackParamList,
  "ComportamientoList"
>;

export default function ComportamientoListScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const clientsSource = useStaffClientsSource();
  const [clients, setClients] = useState<BehaviorClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!token) {
      setClients([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const data = await fetchBehaviorClients(
        token,
        clientsSource === "global" ? "global" : "portfolio",
      );
      setClients(data);
    } catch (e) {
      setClients([]);
      setError(
        e instanceof Error ? e.message : "No se pudo cargar el análisis.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, clientsSource]);

  useRefreshOnFocus(load);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = clients.filter((c) => {
      if (!term) return true;
      return (
        c.username.toLowerCase().includes(term) ||
        (c.nombreuser || "").toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term)
      );
    });
    return list.sort((a, b) => {
      const ar = a.stats?.completionRate ?? -1;
      const br = b.stats?.completionRate ?? -1;
      return br - ar;
    });
  }, [clients, query]);

  useEffect(() => {
    setPage(1);
  }, [query, clients.length]);

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
        <Pressable
          onPress={() => backOrHub(navigation as never, "MoreHome")}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color={brand.navy} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Comportamiento</Text>
          <Text style={styles.subtitle}>
            Cotizaciones iniciadas, completadas y abandonos
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={brand.muted} />
        <TextInput
          style={styles.search}
          placeholder="Buscar cliente…"
          placeholderTextColor={brand.mutedLight}
          value={query}
          onChangeText={setQuery}
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
          keyExtractor={(item) => item.email}
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
            <Text style={styles.empty}>Sin datos de comportamiento.</Text>
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
          renderItem={({ item }) => {
            const stats = item.stats;
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                ]}
                onPress={() =>
                  navigation.navigate("ComportamientoDetail", {
                    email: item.email,
                    username: item.username,
                    nombreuser: item.nombreuser,
                  })
                }
              >
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.username}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {item.email}
                  </Text>
                  {stats ? (
                    <Text style={styles.cardStats}>
                      {stats.quotesCompleted}/{stats.quotesStarted} completadas
                      · {Math.round(stats.completionRate)}% ·{" "}
                      {stats.quotesAbandoned} abandonos
                    </Text>
                  ) : (
                    <Text style={styles.cardStats}>Sin actividad registrada</Text>
                  )}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={brand.mutedLight}
                />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 4,
  },
  backBtn: {
    width: 32,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, alignItems: "center" },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: brand.navy,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: brand.muted,
    textAlign: "center",
  },
  searchWrap: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
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
  search: {
    flex: 1,
    fontSize: 15,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardPressed: { opacity: 0.85 },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  cardMeta: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  cardStats: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: fonts.medium,
    color: brand.navy,
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
