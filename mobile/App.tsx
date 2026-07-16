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
import Login from "./auth/Login";
import { usePushNotifications } from "./hooks/usePushNotifications";
import ClientTabs from "./navigation/ClientTabs";
import { brand } from "./theme/brand";
import { applyGlobalFonts } from "./theme/typography";

let globalFontsApplied = false;

function AuthenticatedApp() {
  usePushNotifications();
  return <ClientTabs />;
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

  if (user && user.username !== "Ejecutivo") {
    return <AuthenticatedApp />;
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
