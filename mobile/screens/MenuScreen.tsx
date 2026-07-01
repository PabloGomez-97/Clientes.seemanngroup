import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { brand, radii, spacing } from "../theme/brand";
import { fonts } from "../theme/typography";

export default function MenuScreen() {
  const { t } = useTranslation();
  const { user, activeUsername, logout } = useAuth();

  const displayName =
    user?.nombreuser?.trim() || user?.username || activeUsername || "";
  const email = user?.email?.trim() || "";

  const confirmLogout = () => {
    Alert.alert(
      t("home.navbar.profile.logout"),
      "¿Deseas cerrar tu sesión en el portal?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: t("home.navbar.profile.logout"),
          style: "destructive",
          onPress: logout,
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Menú</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={brand.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={2}>
              {displayName}
            </Text>
            {email ? (
              <Text style={styles.profileEmail} numberOfLines={1}>
                {email}
              </Text>
            ) : null}
            {activeUsername ? (
              <View style={styles.accountRow}>
                <Ionicons
                  name="business-outline"
                  size={14}
                  color={brand.muted}
                />
                <Text style={styles.accountText} numberOfLines={1}>
                  {activeUsername}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
          onPress={confirmLogout}
          accessibilityRole="button"
          accessibilityLabel={t("home.navbar.profile.logout")}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>
            {t("home.navbar.profile.logout")}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: brand.canvas,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 26,
    fontFamily: fonts.bold,
    color: brand.ink,
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    fontSize: 17,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  profileEmail: {
    fontSize: 13,
    color: brand.muted,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  accountText: {
    fontSize: 13,
    fontWeight: "600",
    color: brand.inkSecondary,
    flexShrink: 1,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: brand.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  logoutButtonPressed: {
    backgroundColor: brand.primaryDark,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
});
