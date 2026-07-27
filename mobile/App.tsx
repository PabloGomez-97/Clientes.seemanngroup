import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import "./i18n";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { resolveMobilePortal } from "./auth/portalRouting";
import Login from "./auth/Login";
import { LinbisTokenProvider } from "./hooks/useLinbisToken";
import { usePushNotifications } from "./hooks/usePushNotifications";
import ClientTabs from "./navigation/ClientTabs";
import ExecutiveTabs from "./navigation/ExecutiveTabs";
import OperacionesTabs from "./navigation/OperacionesTabs";
import PricingTabs from "./navigation/PricingTabs";
import ProveedorTabs from "./navigation/ProveedorTabs";
import AdminTabs from "./navigation/AdminTabs";
import StaffEmptyHomeScreen from "./screens/executive/StaffEmptyHomeScreen";
import { brand } from "./theme/brand";
import { applyGlobalFonts } from "./theme/typography";

let globalFontsApplied = false;

function ClientAuthenticatedApp() {
  usePushNotifications();
  return (
    <LinbisTokenProvider>
      <ClientTabs />
    </LinbisTokenProvider>
  );
}

function ExecutiveAuthenticatedApp() {
  usePushNotifications();
  return (
    <LinbisTokenProvider>
      <ExecutiveTabs />
    </LinbisTokenProvider>
  );
}

function OperacionesAuthenticatedApp() {
  usePushNotifications();
  return (
    <LinbisTokenProvider>
      <OperacionesTabs />
    </LinbisTokenProvider>
  );
}

function PricingAuthenticatedApp() {
  usePushNotifications();
  return (
    <LinbisTokenProvider>
      <PricingTabs />
    </LinbisTokenProvider>
  );
}

function ProveedorAuthenticatedApp() {
  usePushNotifications();
  return (
    <LinbisTokenProvider>
      <ProveedorTabs />
    </LinbisTokenProvider>
  );
}

function AdminAuthenticatedApp() {
  usePushNotifications();
  return (
    <LinbisTokenProvider>
      <AdminTabs />
    </LinbisTokenProvider>
  );
}

function RootApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={brand.primary} />
      </View>
    );
  }

  const portal = resolveMobilePortal(user);

  if (portal === "client") {
    return <ClientAuthenticatedApp />;
  }

  if (portal === "admin") {
    return <AdminAuthenticatedApp />;
  }

  if (portal === "operaciones") {
    return <OperacionesAuthenticatedApp />;
  }

  if (portal === "pricing") {
    return <PricingAuthenticatedApp />;
  }

  if (portal === "executive") {
    return <ExecutiveAuthenticatedApp />;
  }

  if (portal === "proveedor") {
    return <ProveedorAuthenticatedApp />;
  }

  if (portal === "staff-empty") {
    return <StaffEmptyHomeScreen />;
  }

  return <Login />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={brand.primary} />
      </View>
    );
  }

  if (!globalFontsApplied) {
    applyGlobalFonts();
    globalFontsApplied = true;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootApp />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brand.canvas,
  },
});
