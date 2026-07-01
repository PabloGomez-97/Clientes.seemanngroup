import { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import type { AirShipment, OceanShipment } from "../../../src/components/cliente/tracking/shipsgo/types";
import {
  findTrackedAirShipment,
  findTrackedOceanShipment,
} from "../../../src/services/operacionesTrackingLink";
import {
  matchesAirOpenTrackingTarget,
  matchesOceanOpenTrackingTarget,
} from "../../../src/services/shipsgoTrackingNavigation";
import ShipmentCard from "../../components/tracking/ShipmentCard";
import TrackingStatusStrip from "../../components/tracking/TrackingStatusStrip";
import { useShipsgoTracking } from "../../hooks/useShipsgoTracking";
import type { TrackeosStackParamList } from "../../navigation/TrackeosStack";
import { brand, radii, spacing } from "../../theme/brand";

type NavigationProp = NativeStackNavigationProp<
  TrackeosStackParamList,
  "TrackeosList"
>;
type RouteProps = RouteProp<TrackeosStackParamList, "TrackeosList">;

export default function TrackeosListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const {
    activeUsername,
    activeTab,
    setActiveTab,
    filteredUserAir,
    filteredUserOcean,
    userAir,
    userOcean,
    airLoading,
    oceanLoading,
    airError,
    oceanError,
    airStatusChips,
    oceanStatusChips,
    airStatusFilter,
    oceanStatusFilter,
    toggleAirFilter,
    toggleOceanFilter,
    clearAirFilter,
    clearOceanFilter,
    refreshAll,
    removeAirShipment,
    removeOceanShipment,
  } = useShipsgoTracking();

  useFocusEffect(
    useCallback(() => {
      void refreshAll();
    }, [refreshAll]),
  );

  const openTracking = route.params?.openTracking;

  useEffect(() => {
    if (!openTracking || airLoading || oceanLoading) return;

    if (openTracking.mode === "air") {
      const found =
        findTrackedAirShipment(userAir, openTracking, activeUsername) ??
        userAir.find((shipment) =>
          matchesAirOpenTrackingTarget(shipment.awb_number, openTracking),
        );
      if (found) {
        navigation.navigate("AirDetail", { shipment: found });
        navigation.setParams({ openTracking: undefined });
      }
      return;
    }

    const found =
      findTrackedOceanShipment(userOcean, openTracking, activeUsername) ??
      userOcean.find((shipment) =>
        matchesOceanOpenTrackingTarget(shipment, openTracking),
      );
    if (found) {
      navigation.navigate("OceanDetail", { shipment: found });
      navigation.setParams({ openTracking: undefined });
    }
  }, [
    activeUsername,
    airLoading,
    navigation,
    oceanLoading,
    openTracking,
    userAir,
    userOcean,
  ]);

  const confirmDelete = (
    label: string,
    onConfirm: () => Promise<void>,
  ) => {
    Alert.alert(
      "Eliminar seguimiento",
      `¿Eliminar el tracking ${label}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            void onConfirm().catch((error: unknown) => {
              Alert.alert(
                "Error",
                error instanceof Error
                  ? error.message
                  : "No se pudo eliminar el tracking.",
              );
            });
          },
        },
      ],
    );
  };

  const openNewTracking = () => {
    if (activeTab === "air") {
      navigation.navigate("NewAirTracking");
      return;
    }
    navigation.navigate("NewOceanTracking");
  };

  const loading = activeTab === "air" ? airLoading : oceanLoading;
  const error = activeTab === "air" ? airError : oceanError;
  const totalCount = activeTab === "air" ? userAir.length : userOcean.length;

  const renderAirItem = ({ item }: { item: AirShipment }) => (
    <Pressable
      onPress={() => navigation.navigate("AirDetail", { shipment: item })}
      onLongPress={() =>
        confirmDelete(item.awb_number, () => removeAirShipment(item.id))
      }
    >
      <ShipmentCard mode="air" shipment={item} />
    </Pressable>
  );

  const renderOceanItem = ({ item }: { item: OceanShipment }) => (
    <Pressable
      onPress={() => navigation.navigate("OceanDetail", { shipment: item })}
      onLongPress={() =>
        confirmDelete(
          item.container_number || item.booking_number || `#${item.id}`,
          () => removeOceanShipment(item.id),
        )
      }
    >
      <ShipmentCard mode="ocean" shipment={item} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Rastreo de envíos</Text>
          <Text style={styles.subtitle}>{activeUsername}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton} onPress={() => void refreshAll()}>
            <Ionicons name="refresh" size={18} color={brand.navy} />
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={openNewTracking}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Nuevo seguimiento</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === "air" && styles.tabActive]}
          onPress={() => setActiveTab("air")}
        >
          <Text style={[styles.tabText, activeTab === "air" && styles.tabTextActive]}>
            Aéreo ({userAir.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "ocean" && styles.tabActive]}
          onPress={() => setActiveTab("ocean")}
        >
          <Text style={[styles.tabText, activeTab === "ocean" && styles.tabTextActive]}>
            Marítimo ({userOcean.length})
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
          <Text style={styles.loadingText}>Cargando seguimientos...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => void refreshAll()}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : totalCount === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name={activeTab === "air" ? "airplane-outline" : "boat-outline"}
            size={42}
            color={brand.primary}
          />
          <Text style={styles.emptyTitle}>No tienes envíos registrados</Text>
          <Text style={styles.emptyText}>
            Agrega un nuevo seguimiento para comenzar a rastrear tus envíos.
          </Text>
          <Pressable style={styles.primaryButton} onPress={openNewTracking}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Nuevo seguimiento</Text>
          </Pressable>
        </View>
      ) : activeTab === "air" ? (
        <FlatList
          data={filteredUserAir}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderAirItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={airLoading}
              onRefresh={() => void refreshAll()}
              tintColor={brand.primary}
            />
          }
          ListHeaderComponent={
            <View>
              <TrackingStatusStrip
                chips={airStatusChips}
                activeKey={airStatusFilter}
                onToggle={toggleAirFilter}
              />
              {airStatusFilter && filteredUserAir.length === 0 ? (
                <View style={styles.filterEmpty}>
                  <Text style={styles.filterEmptyText}>
                    No hay envíos en este estado.
                  </Text>
                  <Pressable onPress={clearAirFilter}>
                    <Text style={styles.filterEmptyAction}>Ver todos</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredUserOcean}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOceanItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={oceanLoading}
              onRefresh={() => void refreshAll()}
              tintColor={brand.primary}
            />
          }
          ListHeaderComponent={
            <View>
              <TrackingStatusStrip
                chips={oceanStatusChips}
                activeKey={oceanStatusFilter}
                onToggle={toggleOceanFilter}
              />
              {oceanStatusFilter && filteredUserOcean.length === 0 ? (
                <View style={styles.filterEmpty}>
                  <Text style={styles.filterEmptyText}>
                    No hay envíos en este estado.
                  </Text>
                  <Pressable onPress={clearOceanFilter}>
                    <Text style={styles.filterEmptyAction}>Ver todos</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: brand.canvas,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: brand.ink,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: brand.primary,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
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
    paddingVertical: 10,
    borderRadius: radii.sm,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: brand.primarySoft,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
    color: brand.muted,
  },
  tabTextActive: {
    color: brand.primary,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: 10,
  },
  loadingText: {
    color: brand.muted,
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: brand.ink,
  },
  errorText: {
    color: brand.muted,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.sm,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
  },
  retryButtonText: {
    color: brand.primary,
    fontWeight: "600",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: brand.ink,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: brand.muted,
    textAlign: "center",
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  filterEmpty: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  filterEmptyText: {
    color: brand.muted,
  },
  filterEmptyAction: {
    color: brand.primary,
    fontWeight: "600",
  },
});
