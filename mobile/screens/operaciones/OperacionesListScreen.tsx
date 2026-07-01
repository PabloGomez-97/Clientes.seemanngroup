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
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import type { AirShipment } from "../../../src/components/cliente/embarques/Handlers/HandlerAirShipments";
import type { GroundShipment } from "../../../src/components/cliente/embarques/Handlers/HandlerGroundShipments";
import {
  countActiveAirOceanFilters,
  countActiveGroundFilters,
} from "../../../src/services/operacionesFiltersLogic";
import type { OceanListItem } from "../../../src/services/linbisShipmentMappers";
import OperationCard from "../../components/operaciones/OperationCard";
import OperacionesFilterSheet from "../../components/operaciones/OperacionesFilterSheet";
import OperacionesPaginationBar from "../../components/operaciones/OperacionesPaginationBar";
import { useOperaciones } from "../../hooks/useOperaciones";
import type { OperacionesStackParamList } from "../../navigation/OperacionesStack";
import { openTrackeosFromOperacion } from "../../navigation/openTrackeosFromOperacion";
import type { ClientTabParamList } from "../../navigation/ClientTabs";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<OperacionesStackParamList, "OperacionesList">,
  BottomTabNavigationProp<ClientTabParamList>
>;

export default function OperacionesListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [showFilters, setShowFilters] = useState(false);
  const {
    activeUsername,
    activeTab,
    setActiveTab,
    filteredAir,
    filteredOcean,
    filteredGround,
    airLoading,
    oceanLoading,
    groundLoading,
    airError,
    oceanError,
    groundError,
    oceanCatalogLoaded,
    groundCatalogLoaded,
    airFilters,
    oceanFilters,
    groundFilters,
    setAirFilters,
    setOceanFilters,
    setGroundFilters,
    clearAirFilters,
    clearOceanFilters,
    clearGroundFilters,
    getAirTrackingStatus,
    getOceanTrackingStatus,
    refreshActiveTab,
    pagination,
    tabTotals,
  } = useOperaciones();

  const loading =
    activeTab === "air"
      ? airLoading
      : activeTab === "ocean"
        ? oceanLoading
        : groundLoading;
  const error =
    activeTab === "air"
      ? airError
      : activeTab === "ocean"
        ? oceanError
        : groundError;
  const displayedItems =
    activeTab === "air"
      ? filteredAir
      : activeTab === "ocean"
        ? filteredOcean
        : filteredGround;

  const isCatalogEmpty =
    activeTab === "air"
      ? !airLoading &&
        displayedItems.length === 0 &&
        !pagination.hasNext &&
        pagination.page === 1
      : activeTab === "ocean"
        ? oceanCatalogLoaded &&
          !oceanLoading &&
          tabTotals.ocean === 0
        : groundCatalogLoaded && !groundLoading && tabTotals.ground === 0;

  const listEmptyAfterFilter =
    !loading &&
    !isCatalogEmpty &&
    displayedItems.length === 0;

  const paginationFooter =
    !isCatalogEmpty && (displayedItems.length > 0 || pagination.hasPrevious) ? (
      <OperacionesPaginationBar
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        hasPrevious={pagination.hasPrevious}
        hasNext={pagination.hasNext}
        loading={loading}
        onPrevious={pagination.goPrevious}
        onNext={pagination.goNext}
      />
    ) : null;

  const formatTabLabel = (
    key: "air" | "ocean" | "ground",
    label: string,
  ) => {
    if (key === "air") return label;
    const total = key === "ocean" ? tabTotals.ocean : tabTotals.ground;
    return total != null ? `${label} (${total})` : label;
  };

  const activeFilterCount = useMemo(() => {
    if (activeTab === "ground") return countActiveGroundFilters(groundFilters);
    if (activeTab === "ocean") return countActiveAirOceanFilters(oceanFilters);
    return countActiveAirOceanFilters(airFilters);
  }, [activeTab, airFilters, groundFilters, oceanFilters]);

  const clearCurrentFilters = () => {
    if (activeTab === "air") clearAirFilters();
    else if (activeTab === "ocean") clearOceanFilters();
    else clearGroundFilters();
  };

  const renderAirItem = ({ item }: { item: AirShipment }) => {
    const trackingStatus = getAirTrackingStatus(item);
    return (
      <Pressable
        onPress={() =>
          navigation.navigate("AirOperacionDetail", { shipment: item })
        }
      >
        <OperationCard
          mode="air"
          shipment={item}
          trackingStatus={trackingStatus}
          onOpenTracking={() => {
            if (trackingStatus.openTarget) {
              openTrackeosFromOperacion(navigation, trackingStatus.openTarget);
            }
          }}
        />
      </Pressable>
    );
  };

  const renderOceanItem = ({ item }: { item: OceanListItem }) => {
    const trackingStatus = getOceanTrackingStatus(item);
    return (
      <Pressable
        onPress={() =>
          navigation.navigate("OceanOperacionDetail", { shipment: item })
        }
      >
        <OperationCard
          mode="ocean"
          shipment={item}
          trackingStatus={trackingStatus}
          onOpenTracking={() => {
            if (trackingStatus.openTarget) {
              openTrackeosFromOperacion(navigation, trackingStatus.openTarget);
            }
          }}
        />
      </Pressable>
    );
  };

  const renderGroundItem = ({ item }: { item: GroundShipment }) => (
    <Pressable
      onPress={() =>
        navigation.navigate("GroundOperacionDetail", { shipment: item })
      }
    >
      <OperationCard mode="ground" shipment={item} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Operaciones</Text>
          <Text style={styles.subtitle}>{activeUsername}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton} onPress={() => void refreshActiveTab()}>
            <Ionicons name="refresh" size={18} color={brand.navy} />
          </Pressable>
          <Pressable
            style={[
              styles.filterButton,
              activeFilterCount > 0 && styles.filterButtonActive,
            ]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={activeFilterCount > 0 ? "#fff" : brand.navy}
            />
            <Text
              style={[
                styles.filterButtonText,
                activeFilterCount > 0 && styles.filterButtonTextActive,
              ]}
            >
              Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tabs}>
        {(
          [
            ["air", "Aéreo"],
            ["ocean", "Marítimo"],
            ["ground", "Terrestre"],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => setActiveTab(key)}
          >
            <Text
              style={[styles.tabText, activeTab === key && styles.tabTextActive]}
            >
              {formatTabLabel(key, label)}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
          <Text style={styles.loadingText}>Cargando operaciones...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => void refreshActiveTab()}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : isCatalogEmpty ? (
        <View style={styles.center}>
          <Ionicons
            name={
              activeTab === "air"
                ? "airplane-outline"
                : activeTab === "ocean"
                  ? "boat-outline"
                  : "bus-outline"
            }
            size={42}
            color={brand.primary}
          />
          <Text style={styles.emptyTitle}>No hay operaciones registradas</Text>
          <Text style={styles.emptyText}>
            Cuando existan embarques para tu cuenta, aparecerán aquí.
          </Text>
        </View>
      ) : activeTab === "air" ? (
        <FlatList
          data={filteredAir}
          keyExtractor={(item, index) => String(item.id ?? item.number ?? index)}
          renderItem={renderAirItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={airLoading}
              onRefresh={() => void refreshActiveTab()}
              tintColor={brand.primary}
            />
          }
          ListHeaderComponent={
            listEmptyAfterFilter ? (
              <FilterEmptyState onClear={clearCurrentFilters} />
            ) : null
          }
          ListFooterComponent={paginationFooter}
        />
      ) : activeTab === "ocean" ? (
        <FlatList
          data={filteredOcean}
          keyExtractor={(item, index) => String(item.id ?? item.number ?? index)}
          renderItem={renderOceanItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={oceanLoading}
              onRefresh={() => void refreshActiveTab()}
              tintColor={brand.primary}
            />
          }
          ListHeaderComponent={
            listEmptyAfterFilter ? (
              <FilterEmptyState onClear={clearCurrentFilters} />
            ) : null
          }
          ListFooterComponent={paginationFooter}
        />
      ) : (
        <FlatList
          data={filteredGround}
          keyExtractor={(item, index) => String(item.id ?? item.number ?? index)}
          renderItem={renderGroundItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={groundLoading}
              onRefresh={() => void refreshActiveTab()}
              tintColor={brand.primary}
            />
          }
          ListHeaderComponent={
            listEmptyAfterFilter ? (
              <FilterEmptyState onClear={clearCurrentFilters} />
            ) : null
          }
          ListFooterComponent={paginationFooter}
        />
      )}

      <OperacionesFilterSheet
        visible={showFilters}
        tab={activeTab}
        airOceanFilters={activeTab === "ocean" ? oceanFilters : airFilters}
        groundFilters={groundFilters}
        onClose={() => setShowFilters(false)}
        onApplyAirOcean={(filters) => {
          if (activeTab === "ocean") setOceanFilters(filters);
          else setAirFilters(filters);
        }}
        onApplyGround={setGroundFilters}
        onClear={() => {
          clearCurrentFilters();
          setShowFilters(false);
        }}
      />
    </SafeAreaView>
  );
}

function FilterEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <View style={styles.filterEmpty}>
      <Text style={styles.filterEmptyText}>
        No hay operaciones con los filtros aplicados.
      </Text>
      <Pressable onPress={onClear}>
        <Text style={styles.filterEmptyAction}>Limpiar filtros</Text>
      </Pressable>
    </View>
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
    gap: spacing.md,
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  filterButtonActive: {
    backgroundColor: brand.primary,
    borderColor: brand.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: brand.navy,
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radii.sm,
  },
  tabActive: {
    backgroundColor: brand.primarySoft,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "600",
    color: brand.muted,
    textAlign: "center",
  },
  tabTextActive: {
    color: brand.primary,
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
  filterEmpty: {
    backgroundColor: brand.primarySoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.primaryBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: "center",
    gap: 6,
  },
  filterEmptyText: { color: brand.inkSecondary, textAlign: "center" },
  filterEmptyAction: {
    color: brand.primary,
    fontWeight: "700",
  },
});
