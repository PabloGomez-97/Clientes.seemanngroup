import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ClientsListScreen from "../screens/executive/ClientsListScreen";
import type { Cliente } from "../services/ejecutivoClientesApi";
import { useExecutivePortfolioTracking } from "../hooks/useExecutivePortfolioTracking";
import TrackeosStack from "./TrackeosStack";
import { EmbeddedChromeProvider } from "./EmbeddedChromeContext";
import { useAuth } from "../auth/AuthContext";
import { useStaffClientsSource } from "./StaffClientsSourceContext";
import { brand } from "../theme/brand";
import { fonts } from "../theme/typography";
import { noBackStackOptions } from "./noBackStackOptions";

export type ExecutiveTrackeosStackParamList = {
  TrackeosClientPicker: { filter?: "active" } | undefined;
  TrackeosWorkspace: { username: string };
};

const Stack = createNativeStackNavigator<ExecutiveTrackeosStackParamList>();

function TrackeosClientPickerScreen() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<
        ExecutiveTrackeosStackParamList,
        "TrackeosClientPicker"
      >
    >();
  const route =
    useRoute<
      RouteProp<ExecutiveTrackeosStackParamList, "TrackeosClientPicker">
    >();
  const { setActiveUsername } = useAuth();
  const source = useStaffClientsSource();
  const activeOnly = route.params?.filter === "active";
  const {
    clients,
    counts,
    activeCounts,
    totalAir,
    totalOcean,
    inMotionAir,
    inMotionOcean,
    loading,
    error,
    refresh,
  } = useExecutivePortfolioTracking();

  const visibleClients = useMemo(() => {
    if (!activeOnly) return clients;
    return clients.filter((client) => {
      const c = activeCounts.get(client.username);
      return (c?.air ?? 0) > 0 || (c?.ocean ?? 0) > 0;
    });
  }, [activeOnly, clients, activeCounts]);

  const visibleCounts = activeOnly ? activeCounts : counts;
  const visibleAir = activeOnly ? inMotionAir : totalAir;
  const visibleOcean = activeOnly ? inMotionOcean : totalOcean;

  const onSelect = (client: Cliente) => {
    void setActiveUsername(client.username);
    navigation.navigate("TrackeosWorkspace", { username: client.username });
  };

  return (
    <ClientsListScreen
      title={activeOnly ? "En tránsito / Navegando" : "Seguimientos"}
      subtitle={
        activeOnly
          ? "Clientes con envíos activos en movimiento"
          : source === "global"
            ? "Elige un cliente del portal"
            : "Elige un cliente de tu cartera"
      }
      onSelectClient={onSelect}
      clientsOverride={visibleClients}
      loadingOverride={loading}
      errorOverride={error}
      onRefreshOverride={refresh}
      trackingCounts={visibleCounts}
      totalAir={visibleAir}
      totalOcean={visibleOcean}
      airPillLabel={activeOnly ? "en tránsito" : "aéreos"}
      oceanPillLabel={activeOnly ? "navegando" : "marítimos"}
    />
  );
}

function TrackeosWorkspaceScreen() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<
        ExecutiveTrackeosStackParamList,
        "TrackeosWorkspace"
      >
    >();
  const route =
    useRoute<RouteProp<ExecutiveTrackeosStackParamList, "TrackeosWorkspace">>();
  const insets = useSafeAreaInsets();
  const { setActiveUsername } = useAuth();

  useEffect(() => {
    void setActiveUsername(route.params.username);
  }, [route.params.username, setActiveUsername]);

  return (
    <EmbeddedChromeProvider>
      <View style={styles.fill}>
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <Pressable
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
                return;
              }
              navigation.navigate("TrackeosClientPicker");
            }}
            hitSlop={16}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Volver a clientes"
          >
            <Ionicons name="chevron-back" size={26} color={brand.navy} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Seguimientos</Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {route.params.username}
            </Text>
          </View>
          <View style={styles.back} />
        </View>
        <View style={styles.fill}>
          <TrackeosStack />
        </View>
      </View>
    </EmbeddedChromeProvider>
  );
}

export default function ExecutiveTrackeosStack() {
  return (
    <Stack.Navigator screenOptions={noBackStackOptions}>
      <Stack.Screen
        name="TrackeosClientPicker"
        component={TrackeosClientPickerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TrackeosWorkspace"
        component={TrackeosWorkspaceScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: brand.canvas },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: brand.canvas,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
});
