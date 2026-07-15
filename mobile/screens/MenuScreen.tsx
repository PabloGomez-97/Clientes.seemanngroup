import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import type { MenuStackParamList } from "../navigation/MenuStack";
import { brand, radii, spacing } from "../theme/brand";
import { fonts } from "../theme/typography";

type Nav = NativeStackNavigationProp<MenuStackParamList, "MenuHome">;

type MenuLink = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
};

export default function MenuScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
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

  const links: MenuLink[] = [
    {
      key: "privacy",
      label: "Política de Privacidad",
      icon: "shield-checkmark-outline",
      onPress: () => navigation.navigate("LegalDocument", { doc: "privacy" }),
    },
    {
      key: "terms",
      label: "Términos de Servicio",
      icon: "document-text-outline",
      onPress: () => navigation.navigate("LegalDocument", { doc: "terms" }),
    },
    {
      key: "delete",
      label: "Eliminar cuenta",
      icon: "trash-outline",
      onPress: () => navigation.navigate("DeleteAccount"),
      destructive: true,
    },
  ];

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

        <View style={styles.linksCard}>
          {links.map((link, index) => (
            <Pressable
              key={link.key}
              style={({ pressed }) => [
                styles.linkRow,
                index < links.length - 1 && styles.linkRowBorder,
                pressed && styles.linkRowPressed,
              ]}
              onPress={link.onPress}
              accessibilityRole="button"
              accessibilityLabel={link.label}
            >
              <View style={styles.linkLeft}>
                <Ionicons
                  name={link.icon}
                  size={20}
                  color={link.destructive ? "#b91c1c" : brand.primary}
                />
                <Text
                  style={[
                    styles.linkLabel,
                    link.destructive && styles.linkLabelDestructive,
                  ]}
                >
                  {link.label}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={brand.mutedLight}
              />
            </Pressable>
          ))}
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
  linksCard: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  linkRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
  },
  linkRowPressed: {
    backgroundColor: brand.canvasAlt,
  },
  linkLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  linkLabel: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  linkLabelDestructive: {
    color: "#b91c1c",
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
