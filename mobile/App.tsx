import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./i18n";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import Login from "./auth/Login";
import ClientTabs from "./navigation/ClientTabs";

function RootApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#ff6200" />
      </View>
    );
  }

  if (user && user.username !== "Ejecutivo") {
    return <ClientTabs />;
  }

  return <Login />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
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
    backgroundColor: "#fafafa",
  },
});
