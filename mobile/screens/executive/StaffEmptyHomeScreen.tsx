import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

export default function StaffEmptyHomeScreen() {
  const { user, logout } = useAuth();

  const roleLabel = user?.roles?.proveedor
    ? "Proveedor"
    : user?.roles?.pricing
      ? "Pricing"
      : user?.roles?.administrador
        ? "Administrador"
        : "Staff";

  const confirmLogout = () => {
    Alert.alert("Cerrar sesión", "¿Deseas cerrar tu sesión?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="construct-outline" size={32} color={brand.navy} />
        </View>
        <Text style={styles.title}>Portal en preparación</Text>
        <Text style={styles.body}>
          Tu cuenta ({roleLabel}) aún no tiene un módulo mobile disponible.
          Mientras tanto puedes cerrar sesión o usar el portal web.
        </Text>
        <Text style={styles.email}>{user?.email}</Text>

        <Pressable style={styles.logout} onPress={confirmLogout}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: brand.navy,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.regular,
    color: brand.muted,
    textAlign: "center",
    maxWidth: 320,
  },
  email: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: fonts.medium,
    color: brand.inkSecondary,
  },
  logout: {
    marginTop: spacing.lg,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: brand.primary,
  },
  logoutText: {
    color: "#fff",
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
});
