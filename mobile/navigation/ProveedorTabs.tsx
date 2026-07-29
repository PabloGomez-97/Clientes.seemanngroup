import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ProveedorHomeScreen from "../screens/proveedor/ProveedorHomeScreen";
import ProveedorTarifarioScreen from "../screens/proveedor/ProveedorTarifarioScreen";
import ProveedorArchivosScreen from "../screens/proveedor/ProveedorArchivosScreen";
import ProveedorMoreStack from "./ProveedorMoreStack";
import type { ProveedorMoreStackParamList } from "./ProveedorMoreStack";
import { StaffPortalProvider } from "./StaffPortalContext";
import { createPopToHubTabListener } from "./popToHubTabListener";
import { brand } from "../theme/brand";
import { fonts } from "../theme/typography";

export type ProveedorTabParamList = {
  Home: undefined;
  Tarifario: undefined;
  Archivos: undefined;
  More: NavigatorScreenParams<ProveedorMoreStackParamList> | undefined;
};

const Tab = createBottomTabNavigator<ProveedorTabParamList>();

const TAB_ICON: Record<
  keyof ProveedorTabParamList,
  { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap }
> = {
  Home: { outline: "home-outline", filled: "home" },
  Tarifario: { outline: "pricetag-outline", filled: "pricetag" },
  Archivos: { outline: "folder-open-outline", filled: "folder-open" },
  More: {
    outline: "ellipsis-horizontal-outline",
    filled: "ellipsis-horizontal",
  },
};

const TAB_LABEL: Record<keyof ProveedorTabParamList, string> = {
  Home: "Inicio",
  Tarifario: "Tarifario",
  Archivos: "Archivos",
  More: "Más",
};

export default function ProveedorTabs() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "ios" ? Math.max(insets.bottom - 4, 8) : 8;

  return (
    <StaffPortalProvider value="proveedor">
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
          <Tab.Screen name="Home" component={ProveedorHomeScreen} />
          <Tab.Screen name="Tarifario" component={ProveedorTarifarioScreen} />
          <Tab.Screen name="Archivos" component={ProveedorArchivosScreen} />
          <Tab.Screen
            name="More"
            component={ProveedorMoreStack}
            listeners={createPopToHubTabListener("More")}
          />
        </Tab.Navigator>
      </NavigationContainer>
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
