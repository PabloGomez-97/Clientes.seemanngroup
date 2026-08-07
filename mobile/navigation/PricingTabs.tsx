import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PricingHomeScreen from "../screens/pricing/PricingHomeScreen";
import PricingAlertsScreen from "../screens/pricing/PricingAlertsScreen";
import TarifarioScreen from "../screens/consultas/TarifarioScreen";
import PricingMoreStack from "./PricingMoreStack";
import type { PricingMoreStackParamList } from "./PricingMoreStack";
import { StaffPortalProvider } from "./StaffPortalContext";
import { StaffClientsSourceProvider } from "./StaffClientsSourceContext";
import { createPopToHubTabListener } from "./popToHubTabListener";
import { brand } from "../theme/brand";
import { fonts } from "../theme/typography";

export type PricingTabParamList = {
  Home: undefined;
  Tarifario: undefined;
  Alertas: undefined;
  More: NavigatorScreenParams<PricingMoreStackParamList> | undefined;
};

const Tab = createBottomTabNavigator<PricingTabParamList>();

const TAB_ICON: Record<
  keyof PricingTabParamList,
  { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap }
> = {
  Home: { outline: "home-outline", filled: "home" },
  Tarifario: { outline: "pricetag-outline", filled: "pricetag" },
  Alertas: { outline: "warning-outline", filled: "warning" },
  More: {
    outline: "ellipsis-horizontal-outline",
    filled: "ellipsis-horizontal",
  },
};

const TAB_LABEL: Record<keyof PricingTabParamList, string> = {
  Home: "Inicio",
  Tarifario: "Tarifario",
  Alertas: "Alertas",
  More: "Más",
};

export default function PricingTabs() {
  const insets = useSafeAreaInsets();
  // Android 3-button nav reports insets.bottom (~48); gesture nav is ~0–24.
  const bottomPad =
    Platform.OS === "ios"
      ? Math.max(insets.bottom - 4, 8)
      : Math.max(insets.bottom, 8);

  return (
    <StaffPortalProvider value="pricing">
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
          <Tab.Screen name="Home" component={PricingHomeScreen} />
          <Tab.Screen name="Tarifario" component={TarifarioScreen} />
          <Tab.Screen name="Alertas" component={PricingAlertsScreen} />
          <Tab.Screen
            name="More"
            component={PricingMoreStack}
            listeners={createPopToHubTabListener("More", "MoreHome")}
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
