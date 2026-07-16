import { useCallback, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  createNavigationContainerRef,
  type NavigatorScreenParams,
} from "@react-navigation/native";
import { NavigationContainer } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DashboardScreen from "../screens/DashboardScreen";
import CotizacionesStack from "./CotizacionesStack";
import type { CotizacionesStackParamList } from "./CotizacionesStack";
import MenuStack from "./MenuStack";
import type { MenuStackParamList } from "./MenuStack";
import OperacionesStack from "./OperacionesStack";
import type { OperacionesStackParamList } from "./OperacionesStack";
import TrackeosStack from "./TrackeosStack";
import type { TrackeosStackParamList } from "./TrackeosStack";
import { brand } from "../theme/brand";
import { fonts } from "../theme/typography";

export type ClientTabParamList = {
  Dashboard: undefined;
  Trackeos: NavigatorScreenParams<TrackeosStackParamList> | undefined;
  Operaciones: NavigatorScreenParams<OperacionesStackParamList> | undefined;
  Cotizaciones: NavigatorScreenParams<CotizacionesStackParamList> | undefined;
  Menu: NavigatorScreenParams<MenuStackParamList> | undefined;
};

const Tab = createBottomTabNavigator<ClientTabParamList>();
const navigationRef = createNavigationContainerRef<ClientTabParamList>();

const TAB_ICON: Record<
  keyof ClientTabParamList,
  { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap }
> = {
  Dashboard: { outline: "home-outline", filled: "home" },
  Trackeos: { outline: "navigate-outline", filled: "navigate" },
  Operaciones: { outline: "briefcase-outline", filled: "briefcase" },
  Cotizaciones: { outline: "document-text-outline", filled: "document-text" },
  Menu: { outline: "ellipsis-horizontal-outline", filled: "ellipsis-horizontal" },
};

const TAB_LABEL: Record<keyof ClientTabParamList, string> = {
  Dashboard: "Inicio",
  Trackeos: "Seguimiento",
  Operaciones: "Operaciones",
  Cotizaciones: "Cotizaciones",
  Menu: "Más",
};

type NavStateLike = {
  routes: { name: string; state?: NavStateLike }[];
  index: number;
};

function isTrackeosListVisible(state: NavStateLike | undefined): boolean {
  if (!state) return false;
  const tab = state.routes[state.index];
  if (!tab || tab.name !== "Trackeos") return false;

  const nested = tab.state;
  if (!nested) return true;
  return nested.routes[nested.index]?.name === "TrackeosList";
}

function NewTrackingFab() {
  const insets = useSafeAreaInsets();
  const bottom = Platform.OS === "ios" ? 90 : 72;

  const openNewTracking = () => {
    Alert.alert("Nuevo seguimiento", "¿Qué tipo de seguimiento querés crear?", [
      {
        text: "Aéreo",
        onPress: () => {
          if (navigationRef.isReady()) {
            navigationRef.navigate("Trackeos", { screen: "NewAirTracking" });
          }
        },
      },
      {
        text: "Marítimo",
        onPress: () => {
          if (navigationRef.isReady()) {
            navigationRef.navigate("Trackeos", { screen: "NewOceanTracking" });
          }
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  return (
    <Pressable
      onPress={openNewTracking}
      accessibilityRole="button"
      accessibilityLabel="Nuevo seguimiento"
      style={({ pressed }) => [
        styles.fab,
        { bottom: bottom + Math.max(insets.bottom - 22, 0) },
        pressed && styles.fabPressed,
      ]}
    >
      <Ionicons name="add" size={28} color="#fff" />
    </Pressable>
  );
}

export default function ClientTabs() {
  const [showFab, setShowFab] = useState(false);

  const syncFab = useCallback((state: NavStateLike | undefined) => {
    setShowFab(isTrackeosListVisible(state));
  }, []);

  return (
    <View style={styles.root}>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          syncFab(navigationRef.getRootState() as NavStateLike | undefined);
        }}
        onStateChange={(state) => {
          syncFab(state as NavStateLike | undefined);
        }}
      >
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: brand.navy,
            tabBarInactiveTintColor: brand.mutedLight,
            tabBarActiveBackgroundColor: "transparent",
            tabBarInactiveBackgroundColor: "transparent",
            tabBarShowLabel: true,
            tabBarLabel: ({ focused, color }) => (
              <Text
                style={[
                  styles.tabBarLabel,
                  { color },
                  focused && styles.tabBarLabelActive,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {TAB_LABEL[route.name]}
              </Text>
            ),
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={
                  focused
                    ? TAB_ICON[route.name].filled
                    : TAB_ICON[route.name].outline
                }
                size={22}
                color={color}
              />
            ),
            tabBarStyle: styles.tabBar,
            tabBarItemStyle: styles.tabBarItem,
          })}
        >
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen
            name="Trackeos"
            component={TrackeosStack}
            listeners={({ navigation }) => ({
              tabPress: (e) => {
                const state = navigation.getState();
                const route = state.routes.find((r) => r.name === "Trackeos");
                if (route?.state && route.state.index && route.state.index > 0) {
                  e.preventDefault();
                  navigation.navigate("Trackeos", { screen: "TrackeosList" });
                }
              },
            })}
          />
          <Tab.Screen
            name="Operaciones"
            component={OperacionesStack}
            listeners={({ navigation }) => ({
              tabPress: (e) => {
                const state = navigation.getState();
                const route = state.routes.find((r) => r.name === "Operaciones");
                if (route?.state && route.state.index && route.state.index > 0) {
                  e.preventDefault();
                  navigation.navigate("Operaciones", {
                    screen: "OperacionesList",
                  });
                }
              },
            })}
          />
          <Tab.Screen
            name="Cotizaciones"
            component={CotizacionesStack}
            listeners={({ navigation }) => ({
              tabPress: (e) => {
                const state = navigation.getState();
                const route = state.routes.find((r) => r.name === "Cotizaciones");
                if (route?.state && route.state.index && route.state.index > 0) {
                  e.preventDefault();
                  navigation.navigate("Cotizaciones", {
                    screen: "CotizacionesList",
                  });
                }
              },
            })}
          />
          <Tab.Screen
            name="Menu"
            component={MenuStack}
            listeners={({ navigation }) => ({
              tabPress: (e) => {
                const state = navigation.getState();
                const route = state.routes.find((r) => r.name === "Menu");
                if (route?.state && route.state.index && route.state.index > 0) {
                  e.preventDefault();
                  navigation.navigate("Menu", { screen: "MenuHome" });
                }
              },
            })}
          />
        </Tab.Navigator>
      </NavigationContainer>

      {showFab ? <NewTrackingFab /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: brand.primary,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  fabPressed: {
    backgroundColor: brand.primaryDark,
  },
  tabBar: {
    backgroundColor: "#ffffff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#d5dde8",
    height: Platform.OS === "ios" ? 82 : 64,
    paddingTop: 6,
    paddingBottom: Platform.OS === "ios" ? 22 : 8,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  tabBarItem: {
    paddingTop: 2,
  },
  tabBarLabel: {
    fontSize: 10,
    fontFamily: fonts.medium,
    marginTop: 2,
    letterSpacing: -0.2,
  },
  tabBarLabelActive: {
    fontFamily: fonts.semiBold,
  },
});
