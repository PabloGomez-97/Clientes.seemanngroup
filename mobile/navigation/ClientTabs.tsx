import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { NavigationContainer } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet } from "react-native";
import DashboardScreen from "../screens/DashboardScreen";
import MenuScreen from "../screens/MenuScreen";
import CotizacionesStack from "./CotizacionesStack";
import type { CotizacionesStackParamList } from "./CotizacionesStack";
import OperacionesStack from "./OperacionesStack";
import type { OperacionesStackParamList } from "./OperacionesStack";
import TrackeosStack from "./TrackeosStack";
import type { TrackeosStackParamList } from "./TrackeosStack";
import { brand } from "../theme/brand";

export type ClientTabParamList = {
  Dashboard: undefined;
  Trackeos: NavigatorScreenParams<TrackeosStackParamList> | undefined;
  Operaciones: NavigatorScreenParams<OperacionesStackParamList> | undefined;
  Cotizaciones: NavigatorScreenParams<CotizacionesStackParamList> | undefined;
  Menu: undefined;
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
  Menu: { outline: "menu-outline", filled: "menu" },
};

const TAB_LABEL: Record<keyof ClientTabParamList, string> = {
  Dashboard: "Dashboard",
  Trackeos: "Trackeos",
  Operaciones: "Operaciones",
  Cotizaciones: "Cotizaciones",
  Menu: "Menú",
};

export default function ClientTabs() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: brand.primary,
          tabBarInactiveTintColor: brand.mutedLight,
          tabBarActiveBackgroundColor: "transparent",
          tabBarInactiveBackgroundColor: "transparent",
          tabBarLabel: TAB_LABEL[route.name],
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={
                focused
                  ? TAB_ICON[route.name].filled
                  : TAB_ICON[route.name].outline
              }
              size={size}
              color={color}
            />
          ),
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarItemStyle: styles.tabBarItem,
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Trackeos" component={TrackeosStack} />
        <Tab.Screen name="Operaciones" component={OperacionesStack} />
        <Tab.Screen name="Cotizaciones" component={CotizacionesStack} />
        <Tab.Screen name="Menu" component={MenuScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: brand.surface,
    borderTopWidth: 0,
    height: Platform.OS === "ios" ? 84 : 68,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 10,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  tabBarItem: {
    paddingTop: 2,
  },
});
