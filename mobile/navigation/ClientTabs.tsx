import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { NavigationContainer } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, Text } from "react-native";
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

export default function ClientTabs() {
  return (
    <NavigationContainer>
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
  );
}

const styles = StyleSheet.create({
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
