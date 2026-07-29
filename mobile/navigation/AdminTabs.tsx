import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AdminHomeScreen from "../screens/admin/AdminHomeScreen";
import AdminEjecutivosTabScreen from "../screens/admin/AdminEjecutivosTabScreen";
import ExecutiveClientsStack from "./ExecutiveClientsStack";
import type { ExecutiveClientsStackParamList } from "./ExecutiveClientsStack";
import ExecutiveTrackeosStack from "./ExecutiveTrackeosStack";
import type { ExecutiveTrackeosStackParamList } from "./ExecutiveTrackeosStack";
import AdminMoreStack from "./AdminMoreStack";
import type { AdminMoreStackParamList } from "./AdminMoreStack";
import { StaffClientsSourceProvider } from "./StaffClientsSourceContext";
import { StaffPortalProvider } from "./StaffPortalContext";
import { createPopToHubTabListener } from "./popToHubTabListener";
import { brand } from "../theme/brand";
import { fonts } from "../theme/typography";

export type AdminTabParamList = {
  Home: undefined;
  Clients: NavigatorScreenParams<ExecutiveClientsStackParamList> | undefined;
  Trackeos: NavigatorScreenParams<ExecutiveTrackeosStackParamList> | undefined;
  Ejecutivos: undefined;
  More: NavigatorScreenParams<AdminMoreStackParamList> | undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

const TAB_ICON: Record<
  keyof AdminTabParamList,
  { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap }
> = {
  Home: { outline: "home-outline", filled: "home" },
  Clients: { outline: "people-outline", filled: "people" },
  Trackeos: { outline: "navigate-outline", filled: "navigate" },
  Ejecutivos: { outline: "briefcase-outline", filled: "briefcase" },
  More: {
    outline: "ellipsis-horizontal-outline",
    filled: "ellipsis-horizontal",
  },
};

const TAB_LABEL: Record<keyof AdminTabParamList, string> = {
  Home: "Inicio",
  Clients: "Clientes",
  Trackeos: "Seguimientos",
  Ejecutivos: "Ejecutivos",
  More: "Más",
};

export default function AdminTabs() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "ios" ? Math.max(insets.bottom - 4, 8) : 8;

  return (
    <StaffPortalProvider value="admin">
      <StaffClientsSourceProvider value="global">
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor: brand.navy,
              tabBarInactiveTintColor: brand.mutedLight,
              tabBarStyle: {
                backgroundColor: brand.surface,
                borderTopColor: brand.border,
                height: 56 + bottomPad,
                paddingBottom: bottomPad,
                paddingTop: 6,
              },
              tabBarLabel: ({ color, focused }) => (
                <Text
                  style={[
                    styles.label,
                    { color },
                    focused && styles.labelFocused,
                  ]}
                >
                  {TAB_LABEL[route.name]}
                </Text>
              ),
              tabBarIcon: ({ color, focused, size }) => {
                const icons = TAB_ICON[route.name];
                return (
                  <Ionicons
                    name={focused ? icons.filled : icons.outline}
                    size={size ?? 22}
                    color={color}
                  />
                );
              },
            })}
          >
            <Tab.Screen name="Home" component={AdminHomeScreen} />
            <Tab.Screen name="Clients" component={ExecutiveClientsStack} />
            <Tab.Screen name="Trackeos" component={ExecutiveTrackeosStack} />
            <Tab.Screen
              name="Ejecutivos"
              component={AdminEjecutivosTabScreen}
            />
            <Tab.Screen
              name="More"
              component={AdminMoreStack}
              listeners={createPopToHubTabListener("More")}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </StaffClientsSourceProvider>
    </StaffPortalProvider>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontFamily: fonts.medium,
  },
  labelFocused: {
    fontFamily: fonts.semiBold,
  },
});
