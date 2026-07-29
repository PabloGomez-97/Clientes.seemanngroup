import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ExecutiveHomeScreen from "../screens/executive/ExecutiveHomeScreen";
import ExecutiveClientsStack from "./ExecutiveClientsStack";
import type { ExecutiveClientsStackParamList } from "./ExecutiveClientsStack";
import ExecutiveTrackeosStack from "./ExecutiveTrackeosStack";
import type { ExecutiveTrackeosStackParamList } from "./ExecutiveTrackeosStack";
import ExecutiveReporteriaStack from "./ExecutiveReporteriaStack";
import type { ExecutiveReporteriaStackParamList } from "./ExecutiveReporteriaStack";
import ExecutiveMoreStack from "./ExecutiveMoreStack";
import type { ExecutiveMoreStackParamList } from "./ExecutiveMoreStack";
import { StaffClientsSourceProvider } from "./StaffClientsSourceContext";
import { StaffPortalProvider } from "./StaffPortalContext";
import { createPopToHubTabListener } from "./popToHubTabListener";
import { brand } from "../theme/brand";
import { fonts } from "../theme/typography";

export type ExecutiveTabParamList = {
  Home: undefined;
  Clients: NavigatorScreenParams<ExecutiveClientsStackParamList> | undefined;
  Trackeos: NavigatorScreenParams<ExecutiveTrackeosStackParamList> | undefined;
  Reporteria:
    | NavigatorScreenParams<ExecutiveReporteriaStackParamList>
    | undefined;
  More: NavigatorScreenParams<ExecutiveMoreStackParamList> | undefined;
};

const Tab = createBottomTabNavigator<ExecutiveTabParamList>();

const TAB_ICON: Record<
  keyof ExecutiveTabParamList,
  { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap }
> = {
  Home: { outline: "home-outline", filled: "home" },
  Clients: { outline: "people-outline", filled: "people" },
  Trackeos: { outline: "navigate-outline", filled: "navigate" },
  Reporteria: { outline: "stats-chart-outline", filled: "stats-chart" },
  More: { outline: "ellipsis-horizontal-outline", filled: "ellipsis-horizontal" },
};

const TAB_LABEL: Record<keyof ExecutiveTabParamList, string> = {
  Home: "Inicio",
  Clients: "Clientes",
  Trackeos: "Seguimientos",
  Reporteria: "Reportería",
  More: "Más",
};

export default function ExecutiveTabs() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "ios" ? Math.max(insets.bottom - 4, 8) : 8;

  return (
    <StaffPortalProvider value="executive">
      <StaffClientsSourceProvider value="portfolio">
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
            <Tab.Screen name="Home" component={ExecutiveHomeScreen} />
            <Tab.Screen name="Clients" component={ExecutiveClientsStack} />
            <Tab.Screen name="Trackeos" component={ExecutiveTrackeosStack} />
            <Tab.Screen name="Reporteria" component={ExecutiveReporteriaStack} />
            <Tab.Screen
              name="More"
              component={ExecutiveMoreStack}
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
