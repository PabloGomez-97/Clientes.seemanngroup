import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import DashboardScreen from "../screens/DashboardScreen";
import PlaceholderScreen from "../screens/PlaceholderScreen";
import { LOGIN_PRIMARY } from "../../src/auth/loginTheme";

export type ClientTabParamList = {
  Dashboard: undefined;
  Trackeos: undefined;
  Operaciones: undefined;
  Cotizaciones: undefined;
  Menu: undefined;
};

const Tab = createBottomTabNavigator<ClientTabParamList>();

const TAB_ICON: Record<
  keyof ClientTabParamList,
  keyof typeof Ionicons.glyphMap
> = {
  Dashboard: "home-outline",
  Trackeos: "navigate-outline",
  Operaciones: "briefcase-outline",
  Cotizaciones: "document-text-outline",
  Menu: "menu-outline",
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
          tabBarActiveTintColor: LOGIN_PRIMARY,
          tabBarInactiveTintColor: "#999",
          tabBarLabel: TAB_LABEL[route.name],
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={TAB_ICON[route.name]} size={size} color={color} />
          ),
          tabBarStyle: {
            backgroundColor: "#fff",
            borderTopColor: "#ececec",
            paddingTop: 4,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "500",
            marginBottom: 6,
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen
          name="Trackeos"
          children={() => <PlaceholderScreen title="Trackeos" />}
        />
        <Tab.Screen
          name="Operaciones"
          children={() => <PlaceholderScreen title="Operaciones" />}
        />
        <Tab.Screen
          name="Cotizaciones"
          children={() => <PlaceholderScreen title="Cotizaciones" />}
        />
        <Tab.Screen
          name="Menu"
          children={() => <PlaceholderScreen title="Menú" />}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
