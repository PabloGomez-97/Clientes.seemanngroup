import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import ScreenHeader from "../../components/ui/ScreenHeader";
import { ACCOUNT_DELETION_EMAIL } from "../../config/portal";
import type { MenuStackParamList } from "../../navigation/MenuStack";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Nav = NativeStackNavigationProp<MenuStackParamList, "DeleteAccount">;

export default function DeleteAccountScreen() {
  const navigation = useNavigation<Nav>();
  const { user, activeUsername } = useAuth();

  const openMailRequest = async () => {
    const subject = encodeURIComponent(
      "Solicitud de eliminación de cuenta — Portal Clientes",
    );
    const body = encodeURIComponent(
      [
        "Solicito la eliminación de mi cuenta del Portal Clientes Seemann Group.",
        "",
        `Nombre: ${user?.nombreuser || user?.username || ""}`,
        `Email: ${user?.email || ""}`,
        `Usuario activo: ${activeUsername || ""}`,
        "",
        "Confirmo que no tengo operaciones activas ni saldos pendientes (o autorizo su revisión previa).",
      ].join("\n"),
    );
    const url = `mailto:${ACCOUNT_DELETION_EMAIL}?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert(
          "No se pudo abrir el correo",
          `Envía tu solicitud manualmente a ${ACCOUNT_DELETION_EMAIL}.`,
        );
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "No se pudo abrir el correo",
        `Envía tu solicitud manualmente a ${ACCOUNT_DELETION_EMAIL}.`,
      );
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader
        title="Eliminar cuenta"
        onBack={() => navigation.goBack()}
      />
      <View style={styles.bodyWrap}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="warning-outline" size={28} color={brand.primary} />
          </View>
          <Text style={styles.title}>Eliminar cuenta</Text>
          <Text style={styles.body}>
            De acuerdo con nuestra Política de Privacidad, puedes solicitar la
            supresión de tus datos personales. Procesamos las solicitudes en un
            plazo de hasta 30 días hábiles.
          </Text>
          <Text style={styles.body}>
            Al continuar se abrirá tu aplicación de correo con un mensaje
            prellenado dirigido a {ACCOUNT_DELETION_EMAIL}. Si tienes
            operaciones activas o saldos pendientes, soporte podrá contactarte
            antes de completar la baja.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
            onPress={openMailRequest}
            accessibilityRole="button"
            accessibilityLabel="Solicitar eliminación de cuenta"
          >
            <Ionicons name="mail-outline" size={20} color="#fff" />
            <Text style={styles.primaryText}>Solicitar eliminación</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.secondaryBtnPressed,
            ]}
            onPress={() => navigation.navigate("MenuHome")}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brand.canvas,
  },
  bodyWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: brand.ink,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: brand.muted,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: brand.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    marginTop: spacing.sm,
  },
  primaryBtnPressed: {
    backgroundColor: brand.primaryDark,
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  secondaryBtnPressed: {
    opacity: 0.7,
  },
  secondaryText: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: brand.inkSecondary,
  },
});
