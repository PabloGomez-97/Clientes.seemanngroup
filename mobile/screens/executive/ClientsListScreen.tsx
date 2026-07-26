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
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import type { ExecutiveClientsStackParamList } from "../../navigation/ExecutiveClientsStack";
import type { ClientTrackingCounts } from "../../hooks/useExecutivePortfolioTracking";
import {
  fetchMisClientes,
  type Cliente,
} from "../../services/ejecutivoClientesApi";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Nav = NativeStackNavigationProp<
  ExecutiveClientsStackParamList,
  "ClientsList"
>;

type Props = {
  onSelectClient?: (client: Cliente) => void;
  title?: string;
  subtitle?: string;
  /** Lista y carga externas (p. ej. Seguimientos con conteos ShipsGo). */
  clientsOverride?: Cliente[];
  loadingOverride?: boolean;
  errorOverride?: string | null;
  onRefreshOverride?: () => Promise<void>;
  trackingCounts?: Map<string, ClientTrackingCounts>;
  totalAir?: number;
  totalOcean?: number;
};

export default function ClientsListScreen({
  onSelectClient,
  title = "Mis clientes",
  subtitle,
  clientsOverride,
  loadingOverride,
  errorOverride,
  onRefreshOverride,
  trackingCounts,
  totalAir,
  totalOcean,
}: Props) {
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const [clients, setClients] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const isExternal = clientsOverride !== undefined;

  const load = useCallback(async () => {
    if (isExternal) {
      if (onRefreshOverride) await onRefreshOverride();
      setRefreshing(false);
      return;
    }
    if (!token) {
      setClients([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const data = await fetchMisClientes(token);
      setClients(data);
    } catch (e) {
      setClients([]);
      setError(
        e instanceof Error ? e.message : "No se pudo cargar la cartera.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isExternal, onRefreshOverride]);

  useEffect(() => {
    if (isExternal) return;
    setLoading(true);
    void load();
  }, [load, isExternal]);

  const list = isExternal ? clientsOverride : clients;
  const isLoading = isExternal ? Boolean(loadingOverride) : loading;
  const listError = isExternal ? (errorOverride ?? null) : error;
  const showTracking = Boolean(trackingCounts);

  const filtered = list.filter((client) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return (
      client.username.toLowerCase().includes(term) ||
      (client.nombreuser || "").toLowerCase().includes(term) ||
      (client.email || "").toLowerCase().includes(term) ||
      (client.parentUsername || "").toLowerCase().includes(term)
    );
  });

  const openClient = (client: Cliente) => {
    if (onSelectClient) {
      onSelectClient(client);
      return;
    }
    navigation.navigate("ClientHub", {
      username: client.username,
      nombreuser: client.nombreuser,
      email: client.email,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {subtitle ??
            (isLoading
              ? "Cargando cartera…"
              : `${list.length} cliente${list.length === 1 ? "" : "s"}`)}
        </Text>
      </View>

      {showTracking ? (
        <View style={styles.pillsRow}>
          <View style={styles.pill}>
            <Ionicons name="people-outline" size={14} color={brand.navy} />
            <Text style={styles.pillText}>
              {list.length} cliente{list.length === 1 ? "" : "s"}
            </Text>
          </View>
          <View style={[styles.pill, styles.pillAir]}>
            <Ionicons name="airplane" size={14} color="#2563eb" />
            <Text style={[styles.pillText, styles.pillAirText]}>
              {totalAir ?? 0} aéreos
            </Text>
          </View>
          <View style={[styles.pill, styles.pillOcean]}>
            <Ionicons name="boat" size={14} color="#059669" />
            <Text style={[styles.pillText, styles.pillOceanText]}>
              {totalOcean ?? 0} marítimos
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={brand.muted} />
        <TextInput
          style={styles.search}
          placeholder="Buscar por empresa, nombre o email"
          placeholderTextColor={brand.mutedLight}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : listError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{listError}</Text>
          <Pressable style={styles.retry} onPress={() => void load()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.id}-${item.username}`}
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
            <Text style={styles.empty}>
              {query.trim()
                ? "Sin resultados para esa búsqueda."
                : "No hay clientes en tu cartera."}
            </Text>
          }
          renderItem={({ item }) => {
            const counts = trackingCounts?.get(item.username);
            const air = counts?.air ?? 0;
            const ocean = counts?.ocean ?? 0;
            const hasTrackings = air > 0 || ocean > 0;

            return (
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => openClient(item)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(item.username || "?").slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.username}
                  </Text>
                  {item.parentUsername ? (
                    <Text style={styles.cardSub} numberOfLines={1}>
                      Subcuenta · {item.parentUsername}
                    </Text>
                  ) : null}
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {item.email || item.nombreuser || "—"}
                  </Text>
                </View>
                {showTracking ? (
                  <View style={styles.badges}>
                    {hasTrackings ? (
                      <>
                        {air > 0 ? (
                          <View style={[styles.badge, styles.badgeAir]}>
                            <Ionicons
                              name="airplane"
                              size={12}
                              color="#2563eb"
                            />
                            <Text style={[styles.badgeText, styles.badgeAirText]}>
                              {air}
                            </Text>
                          </View>
                        ) : null}
                        {ocean > 0 ? (
                          <View style={[styles.badge, styles.badgeOcean]}>
                            <Ionicons name="boat" size={12} color="#059669" />
                            <Text
                              style={[styles.badgeText, styles.badgeOceanText]}
                            >
                              {ocean}
                            </Text>
                          </View>
                        ) : null}
                      </>
                    ) : (
                      <Text style={styles.dash}>—</Text>
                    )}
                  </View>
                ) : null}
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
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eef2f7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillAir: { backgroundColor: "#dbeafe" },
  pillOcean: { backgroundColor: "#d1fae5" },
  pillText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  pillAirText: { color: "#1d4ed8" },
  pillOceanText: { color: "#047857" },
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brand.canvasAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: brand.navy,
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  cardSub: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: fonts.medium,
    color: brand.primary,
  },
  cardMeta: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  badges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeAir: { backgroundColor: "#dbeafe" },
  badgeOcean: { backgroundColor: "#d1fae5" },
  badgeText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  badgeAirText: { color: "#1d4ed8" },
  badgeOceanText: { color: "#047857" },
  dash: {
    color: brand.mutedLight,
    fontFamily: fonts.medium,
    fontSize: 16,
    paddingHorizontal: 4,
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
  retryText: {
    color: "#fff",
    fontFamily: fonts.semiBold,
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: brand.muted,
    fontFamily: fonts.regular,
  },
});
