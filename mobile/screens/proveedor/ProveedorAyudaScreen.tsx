import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import {
  fetchProveedorAyudaEjecutivos,
  type ProveedorEjecutivoContact,
} from "../../services/proveedorApi";
import { useRefreshOnFocus } from "../../hooks/useRefreshOnFocus";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

export default function ProveedorAyudaScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const [items, setItems] = useState<ProveedorEjecutivoContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const data = await fetchProveedorAyudaEjecutivos(token);
      setItems(data);
    } catch (e) {
      setItems([]);
      setError(
        e instanceof Error ? e.message : "No se pudo cargar el equipo.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

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
        <Text style={styles.topTitle}>¿Necesitas ayuda?</Text>
        <View style={styles.backBtn} />
      </View>

      <Text style={styles.subtitle}>
        Contacta a nuestro equipo ejecutivo para cualquier consulta.
      </Text>

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
          data={items}
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
            <Text style={styles.empty}>
              No hay ejecutivos disponibles en este momento.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.nombre}</Text>
              {item.email ? (
                <Pressable
                  style={styles.row}
                  onPress={() => void Linking.openURL(`mailto:${item.email}`)}
                >
                  <Ionicons name="mail-outline" size={16} color={brand.primary} />
                  <Text style={styles.link}>{item.email}</Text>
                </Pressable>
              ) : null}
              {item.telefono ? (
                <Pressable
                  style={styles.row}
                  onPress={() =>
                    void Linking.openURL(
                      `tel:${item.telefono.replace(/\s/g, "")}`,
                    )
                  }
                >
                  <Ionicons name="call-outline" size={16} color={brand.primary} />
                  <Text style={styles.link}>{item.telefono}</Text>
                </Pressable>
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
  subtitle: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.regular,
    color: brand.muted,
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
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: brand.navy,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  link: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: brand.ink,
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
});
