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
import { useRefreshOnFocus } from "../../hooks/useRefreshOnFocus";
import { useEmbeddedChrome } from "../../navigation/EmbeddedChromeContext";
import type { CotizacionesStackParamList } from "../../navigation/CotizacionesStack";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type NavigationProp = NativeStackNavigationProp<
  CotizacionesStackParamList,
  "CotizacionesList"
>;

export default function CotizacionesListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const embedded = useEmbeddedChrome();
  const { activeUsername, items, loading, error, pagination, refresh } =
    useCotizaciones();

  useRefreshOnFocus(refresh);

  const renderItem = ({ item }: { item: ClientQuote }) => (
    <Pressable
      onPress={() => navigation.navigate("CotizacionDetail", { quote: item })}
    >
      <QuoteCard quote={item} />
    </Pressable>
  );

  const isEmpty = !loading && items.length === 0 && pagination.totalItems === 0;

  return (
    <SafeAreaView style={styles.safe} edges={embedded ? [] : ["top"]}>
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
          <ActivityIndicator size="large" color={brand.navy} />
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
            size={36}
            color={brand.navy}
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
    fontSize: 22,
    fontFamily: fonts.bold,
    color: brand.navy,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: brand.muted,
    marginTop: 2,
    fontFamily: fonts.medium,
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
    fontSize: 16,
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
    backgroundColor: brand.navy,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  retryButtonText: {
    color: "#fff",
    fontFamily: fonts.semiBold,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  emptyText: {
    color: brand.muted,
    textAlign: "center",
    lineHeight: 20,
  },
});
