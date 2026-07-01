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
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import type { ClientQuote } from "../../../src/services/cotizacionesLogic";
import QuoteCard from "../../components/cotizaciones/QuoteCard";
import OperacionesPaginationBar from "../../components/operaciones/OperacionesPaginationBar";
import { useCotizaciones } from "../../hooks/useCotizaciones";
import type { CotizacionesStackParamList } from "../../navigation/CotizacionesStack";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type NavigationProp = NativeStackNavigationProp<
  CotizacionesStackParamList,
  "CotizacionesList"
>;

export default function CotizacionesListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { activeUsername, items, loading, error, pagination, refresh } =
    useCotizaciones();

  const renderItem = ({ item }: { item: ClientQuote }) => (
    <Pressable
      onPress={() => navigation.navigate("CotizacionDetail", { quote: item })}
    >
      <QuoteCard quote={item} />
    </Pressable>
  );

  const isEmpty = !loading && items.length === 0 && pagination.totalItems === 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cotizaciones</Text>
          <Text style={styles.subtitle}>{activeUsername}</Text>
        </View>
        <Pressable style={styles.iconButton} onPress={() => void refresh()}>
          <Ionicons name="refresh" size={18} color={brand.navy} />
        </Pressable>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
          <Text style={styles.loadingText}>Cargando cotizaciones...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => void refresh()}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : isEmpty ? (
        <View style={styles.center}>
          <Ionicons
            name="document-text-outline"
            size={42}
            color={brand.primary}
          />
          <Text style={styles.emptyTitle}>No hay cotizaciones registradas</Text>
          <Text style={styles.emptyText}>
            Cuando existan cotizaciones para tu cuenta, aparecerán aquí.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) =>
            String(item.id ?? item.number ?? index)
          }
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void refresh()}
              tintColor={brand.primary}
            />
          }
          ListFooterComponent={
            <OperacionesPaginationBar
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              hasPrevious={pagination.hasPrevious}
              hasNext={pagination.hasNext}
              loading={loading}
              itemLabel="cotizaciones"
              onPrevious={pagination.goPrevious}
              onNext={pagination.goNext}
            />
          }
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
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 26,
    fontFamily: fonts.bold,
    color: brand.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: brand.muted,
    marginTop: 2,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: 10,
  },
  loadingText: { color: brand.muted, fontSize: 14 },
  errorTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  errorText: {
    color: brand.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: brand.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  retryButtonText: { color: "#fff", fontWeight: "700" },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  emptyText: {
    color: brand.muted,
    textAlign: "center",
    lineHeight: 20,
  },
});
